-- Shared building blocks for every module's tables: standard access
-- rules applied in one call, self-service defaults for staff-submitted
-- rows, same-business references, documents, and the public-facing
-- business details the Website module and job adverts use.

-- Lets other tables reference (member, business) as a pair, so a row can
-- never point at a member from a different business. Same pattern on
-- every table other rows refer to.
alter table hub_members add constraint hub_members_id_business_key unique (id, business_id);

-- The signed-in user's own active member id in a business, or null.
create or replace function hub_my_member_id(target_business uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select id from hub_members
  where business_id = target_business and user_id = auth.uid() and status = 'active';
$$;

create or replace function hub_touch_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- The standard access rules for a module's table, applied in one call so
-- every table gets exactly the same shape:
--   * managers (or owners only, for pay data) do everything, while the
--     module is on;
--   * optionally, staff read rows about themselves (member_id);
--   * optionally, staff add rows about themselves (holiday requests,
--     incident reports) — see hub_self_service_defaults for what they
--     can't set.
-- `module` null means a core table with no module switch.
create or replace function hub_apply_rls(
  tbl text,
  module text,
  min_role text default 'manager',
  staff_read_own boolean default false,
  staff_insert_own boolean default false
)
returns void
language plpgsql as $$
declare
  on_check text := case when module is null then 'true' else format('hub_module_enabled(business_id, %L)', module) end;
  role_check text := case min_role
    when 'owner' then 'hub_is_owner_of(business_id)'
    when 'manager' then 'hub_is_manager_of(business_id)'
    else null end;
begin
  if role_check is null then
    raise exception 'unknown min_role %', min_role;
  end if;
  execute format('alter table %I enable row level security', tbl);
  execute format(
    'create policy %I on %I for all using (%s and %s) with check (%s and %s)',
    tbl || ' manage', tbl, on_check, role_check, on_check, role_check
  );
  if staff_read_own then
    execute format(
      'create policy %I on %I for select using (%s and member_id = hub_my_member_id(business_id))',
      tbl || ' staff read own', tbl, on_check
    );
  end if;
  if staff_insert_own then
    execute format(
      'create policy %I on %I for insert with check (%s and member_id = hub_my_member_id(business_id))',
      tbl || ' staff insert own', tbl, on_check
    );
  end if;
end;
$$;

-- Only migrations call this.
revoke execute on function hub_apply_rls(text, text, text, boolean, boolean) from public;

-- For rows staff submit themselves: fixes the columns only a manager may
-- set (status, outcome, investigation notes…) to the values given as
-- trigger arguments, in pairs: column, value ('' means null). Managers
-- and server-side jobs (no signed-in user) are left alone.
create or replace function hub_self_service_defaults()
returns trigger
language plpgsql as $$
declare
  overrides jsonb := '{}'::jsonb;
  i integer := 0;
begin
  if auth.uid() is null or hub_is_manager_of(new.business_id) then
    return new;
  end if;
  while i < tg_nargs loop
    overrides := overrides || jsonb_build_object(tg_argv[i], nullif(tg_argv[i + 1], ''));
    i := i + 2;
  end loop;
  return jsonb_populate_record(new, overrides);
end;
$$;

-- Policies used to belong to Staff Hub alone. Compliance and GDPR each
-- need their own policy suite too, so the library is open while any of
-- the three is on.
create or replace function hub_policies_enabled(target_business uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select hub_module_enabled(target_business, 'staff_hub')
      or hub_module_enabled(target_business, 'compliance')
      or hub_module_enabled(target_business, 'gdpr');
$$;

alter table hub_policies add column category text not null default 'hr'
  check (category in ('hr', 'health_safety', 'data_protection', 'safeguarding', 'general'));

drop policy "policies member read" on hub_policies;
drop policy "policies manager write" on hub_policies;
drop policy "policy_signatures read own or managed" on hub_policy_signatures;

create policy "policies member read" on hub_policies
  for select using (
    hub_policies_enabled(business_id)
    and (hub_is_manager_of(business_id) or (is_published and hub_is_member_of(business_id)))
  );
create policy "policies manager write" on hub_policies
  for all using (hub_policies_enabled(business_id) and hub_is_manager_of(business_id))
  with check (hub_policies_enabled(business_id) and hub_is_manager_of(business_id));
create policy "policy_signatures read own or managed" on hub_policy_signatures
  for select using (
    hub_policies_enabled(business_id)
    and (hub_is_manager_of(business_id) or member_id in (select id from hub_members where user_id = auth.uid()))
  );

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
  if not hub_policies_enabled(p.business_id) then
    raise exception 'Policies are switched off for this business' using errcode = '42501';
  end if;
  me := hub_my_member_id(p.business_id);
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

-- Documents: files stored in a private Storage bucket that only the
-- server (service role) touches. Who may see a file is decided entirely
-- by whether they can read its row here, so there are no storage.objects
-- policies to keep in step. Core feature, not tied to a module.
create table hub_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid,
  title text not null check (length(trim(title)) > 0),
  category text not null default 'other'
    check (category in ('contract', 'id_right_to_work', 'dbs', 'certificate', 'insurance', 'safety_data_sheet', 'policy', 'other')),
  expires_on date,
  storage_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes integer,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
create index hub_documents_business_idx on hub_documents(business_id);
select hub_apply_rls('hub_documents', null, 'manager', true, false);

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('hub-documents', 'hub-documents', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- Public-facing details: the address of the business's public pages
-- (/s/<slug>, used by the Website module and job adverts) and what those
-- pages say.
alter table hub_businesses
  add column slug text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$'),
  add column tagline text,
  add column about text,
  add column phone text,
  add column address text,
  add column website_published boolean not null default false,
  add column custom_domain text unique check (custom_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  add column leave_year_start_month integer not null default 1 check (leave_year_start_month between 1 and 12);

-- Every business gets a slug from its name at creation (with a number on
-- the end if taken). Owners can change it in settings.
create or replace function hub_slugify(value text)
returns text
language sql immutable as $$
  select coalesce(nullif(trim(both '-' from left(regexp_replace(lower(value), '[^a-z0-9]+', '-', 'g'), 40)), ''), 'business');
$$;

create or replace function hub_businesses_default_slug()
returns trigger
language plpgsql as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  if new.slug is not null then
    return new;
  end if;
  base := hub_slugify(new.name);
  candidate := base;
  while exists (select 1 from hub_businesses where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create trigger hub_businesses_default_slug
  before insert on hub_businesses
  for each row execute function hub_businesses_default_slug();

-- Businesses that existed before this migration.
do $$
declare
  b record;
  base text;
  candidate text;
  n integer;
begin
  for b in select id, name from hub_businesses where slug is null order by created_at loop
    base := hub_slugify(b.name);
    candidate := base;
    n := 1;
    while exists (select 1 from hub_businesses where slug = candidate) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    update hub_businesses set slug = candidate where id = b.id;
  end loop;
end $$;
alter table hub_businesses alter column slug set not null;

-- Which business a custom domain belongs to, for the request proxy. Only
-- ever reveals a slug, and only for a published site.
create or replace function hub_slug_for_domain(domain text)
returns text
language sql stable security definer set search_path = public as $$
  select slug from hub_businesses
  where custom_domain = lower(domain) and website_published and hub_module_enabled(id, 'website');
$$;
grant execute on function hub_slug_for_domain(text) to anon, authenticated;
