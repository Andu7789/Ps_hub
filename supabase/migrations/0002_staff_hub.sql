-- Staff Hub module, first slice: employment details per member, and a
-- policy library staff read and sign. Every policy here is gated on the
-- business having the module switched on (hub_module_enabled), so turning
-- it off hides the data without deleting it.

-- Employment details live beside hub_members rather than on it: the core
-- staff directory works without the Staff Hub module, and these columns
-- only mean something once it's on.
create table hub_staff_profiles (
  member_id uuid primary key references hub_members(id) on delete cascade,
  business_id uuid not null references hub_businesses(id) on delete cascade,
  job_title text,
  employment_type text check (employment_type in ('full_time', 'part_time', 'zero_hours', 'casual', 'contractor')),
  start_date date,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  updated_at timestamptz not null default now()
);

-- A profile's business_id must be its member's business, or a manager of
-- business A could attach a profile to business B's member.
create or replace function hub_staff_profile_business_matches()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from hub_members where id = new.member_id and business_id = new.business_id) then
    raise exception 'Profile and member belong to different businesses' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger hub_staff_profiles_business_matches
  before insert or update on hub_staff_profiles
  for each row execute function hub_staff_profile_business_matches();

create table hub_policies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  version integer not null default 1,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hub_policies_business_idx on hub_policies(business_id);

-- Any change to a policy's wording is a new version, so everyone has to
-- sign again. Done in the database rather than the app so it can't be
-- skipped by a stray update. Publishing or unpublishing alone doesn't bump
-- it — nobody's signature is invalidated by a policy being hidden.
create or replace function hub_policies_bump_version()
returns trigger
language plpgsql as $$
begin
  new.business_id := old.business_id;
  new.created_at := old.created_at;
  if new.title is distinct from old.title or new.body is distinct from old.body then
    new.version := old.version + 1;
    new.updated_at := now();
  else
    new.version := old.version;
  end if;
  return new;
end;
$$;

create trigger hub_policies_bump_version
  before update on hub_policies
  for each row execute function hub_policies_bump_version();

-- A signature is a permanent record of who agreed to which wording, when.
-- Nobody can edit or delete one through the API (no update/delete
-- policies), and they're only created through hub_sign_policy() so the
-- version signed is always the one actually in force.
create table hub_policy_signatures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  policy_id uuid not null references hub_policies(id) on delete cascade,
  policy_version integer not null,
  member_id uuid not null references hub_members(id) on delete cascade,
  signed_name text not null check (length(trim(signed_name)) > 0),
  signed_at timestamptz not null default now(),
  unique (policy_id, policy_version, member_id)
);
create index hub_policy_signatures_member_idx on hub_policy_signatures(member_id);

create or replace function hub_sign_policy(target_policy uuid, typed_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p hub_policies;
  me uuid;
  new_id uuid;
begin
  select * into p from hub_policies where id = target_policy;
  if p.id is null or not p.is_published then
    raise exception 'Policy not found' using errcode = 'P0002';
  end if;
  if not hub_module_enabled(p.business_id, 'staff_hub') then
    raise exception 'Staff Hub is switched off for this business' using errcode = '42501';
  end if;

  select id into me from hub_members
  where business_id = p.business_id and user_id = auth.uid() and status = 'active';
  if me is null then
    raise exception 'Not a member of this business' using errcode = '42501';
  end if;
  if typed_name is null or length(trim(typed_name)) = 0 then
    raise exception 'Type your name to sign' using errcode = '23514';
  end if;

  insert into hub_policy_signatures (business_id, policy_id, policy_version, member_id, signed_name)
  values (p.business_id, p.id, p.version, me, trim(typed_name))
  on conflict (policy_id, policy_version, member_id) do nothing
  returning id into new_id;

  if new_id is null then
    select id into new_id from hub_policy_signatures
    where policy_id = p.id and policy_version = p.version and member_id = me;
  end if;
  return new_id;
end;
$$;

revoke execute on function hub_sign_policy(uuid, text) from public, anon;
grant execute on function hub_sign_policy(uuid, text) to authenticated;

alter table hub_staff_profiles enable row level security;
alter table hub_policies enable row level security;
alter table hub_policy_signatures enable row level security;

create policy "staff_profiles read own or managed" on hub_staff_profiles
  for select using (
    hub_module_enabled(business_id, 'staff_hub')
    and (
      hub_is_manager_of(business_id)
      or member_id in (select id from hub_members where user_id = auth.uid() and status = 'active')
    )
  );
create policy "staff_profiles manager write" on hub_staff_profiles
  for all using (hub_module_enabled(business_id, 'staff_hub') and hub_is_manager_of(business_id))
  with check (hub_module_enabled(business_id, 'staff_hub') and hub_is_manager_of(business_id));

-- Staff see published policies; managers also see drafts.
create policy "policies member read" on hub_policies
  for select using (
    hub_module_enabled(business_id, 'staff_hub')
    and (hub_is_manager_of(business_id) or (is_published and hub_is_member_of(business_id)))
  );
create policy "policies manager write" on hub_policies
  for all using (hub_module_enabled(business_id, 'staff_hub') and hub_is_manager_of(business_id))
  with check (hub_module_enabled(business_id, 'staff_hub') and hub_is_manager_of(business_id));

create policy "policy_signatures read own or managed" on hub_policy_signatures
  for select using (
    hub_module_enabled(business_id, 'staff_hub')
    and (
      hub_is_manager_of(business_id)
      or member_id in (select id from hub_members where user_id = auth.uid())
    )
  );
