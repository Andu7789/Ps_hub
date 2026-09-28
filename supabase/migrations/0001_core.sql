-- Core of the hub: a business, the people in it, and which add-on modules
-- it has switched on. Every table is hub_-prefixed so this schema can live
-- in a shared Supabase project alongside other apps (the way PS Clean's
-- PS_CLEAN_ tables do) or be lifted into a dedicated one untouched — see
-- DECISIONS.md #1.

create table hub_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  brand_color text not null default '#0f766e' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_url text,
  contact_email text,
  created_at timestamptz not null default now()
);

-- One row per person per business. Staff, managers and owners are all
-- members — the role decides what they can see. Invited by email with
-- user_id null; linked to their auth user on first sign-in (same shape as
-- PS Clean's cleaners/admin_users, see DECISIONS.md #3).
create table hub_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (email = lower(trim(email)) and email like '%@%'),
  full_name text not null check (length(trim(full_name)) > 0),
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  status text not null default 'active' check (status in ('active', 'left')),
  created_at timestamptz not null default now(),
  unique (business_id, email),
  unique (business_id, user_id)
);
create index hub_members_user_idx on hub_members(user_id);

-- Which add-on modules a business has on. A missing row means off.
-- Switching a module off flips `enabled` rather than deleting the row, and
-- never touches the module's own tables, so turning it back on loses
-- nothing.
create table hub_business_modules (
  business_id uuid not null references hub_businesses(id) on delete cascade,
  module_key text not null check (module_key in ('staff_hub', 'compliance', 'gdpr', 'clients', 'website', 'payroll', 'suppliers')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (business_id, module_key)
);

-- Access helpers. SECURITY DEFINER so policies on hub_members can call
-- them without recursing into hub_members' own RLS (the trap PS Clean hit
-- in its migration 0008). Only active members count: someone marked as
-- having left loses access immediately, without deleting their record.
create or replace function hub_member_role(target_business uuid)
returns text
language sql stable security definer set search_path = public as $$
  select role from hub_members
  where business_id = target_business and user_id = auth.uid() and status = 'active';
$$;

create or replace function hub_is_member_of(target_business uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select hub_member_role(target_business) is not null;
$$;

create or replace function hub_is_manager_of(target_business uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(hub_member_role(target_business) in ('owner', 'manager'), false);
$$;

create or replace function hub_is_owner_of(target_business uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(hub_member_role(target_business) = 'owner', false);
$$;

create or replace function hub_module_enabled(target_business uuid, key text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select enabled from hub_business_modules where business_id = target_business and module_key = key),
    false
  );
$$;

-- Creating a business is the one write a signed-in user with no
-- membership yet can make: it creates the business and makes the caller
-- its owner in one step, so there's never an ownerless business and no
-- service-role key is needed for sign-up.
create or replace function hub_create_business(business_name text, owner_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  caller_email text := lower(trim(auth.jwt() ->> 'email'));
begin
  if auth.uid() is null or caller_email is null or caller_email = '' then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  insert into hub_businesses (name, contact_email)
  values (trim(business_name), caller_email)
  returning id into new_id;

  insert into hub_members (business_id, user_id, email, full_name, role)
  values (new_id, auth.uid(), caller_email, trim(owner_name), 'owner');

  return new_id;
end;
$$;

-- Invited members are rows with this email and no user_id yet. Called
-- after every sign-in: links them to the signed-in user so an invite works
-- without the inviter knowing anyone's auth id. Safe to trust the JWT
-- email here — the only way in is a magic link sent to that address.
create or replace function hub_claim_invites()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  caller_email text := lower(trim(auth.jwt() ->> 'email'));
  claimed integer;
begin
  if auth.uid() is null or caller_email is null or caller_email = '' then
    return 0;
  end if;
  update hub_members set user_id = auth.uid()
  where email = caller_email and user_id is null
    -- A user already linked in that business (e.g. invited twice under an
    -- old and new address) keeps their existing row.
    and business_id not in (select business_id from hub_members where user_id = auth.uid());
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

-- A business must always keep at least one active owner, or nobody could
-- manage its team or modules again. RLS can't express "not the last one",
-- so this is a trigger; it covers demoting, marking as left, and deleting.
create or replace function hub_keep_an_owner()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active')
     and not exists (
       select 1 from hub_members
       where business_id = old.business_id and role = 'owner' and status = 'active' and id <> old.id
     )
     -- Deleting the whole business cascades here too; let that through.
     and exists (select 1 from hub_businesses where id = old.business_id)
  then
    raise exception 'A business needs at least one owner' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger hub_members_keep_an_owner
  before update or delete on hub_members
  for each row execute function hub_keep_an_owner();

alter table hub_businesses enable row level security;
alter table hub_members enable row level security;
alter table hub_business_modules enable row level security;

create policy "businesses member read" on hub_businesses
  for select using (hub_is_member_of(id));
create policy "businesses owner update" on hub_businesses
  for update using (hub_is_owner_of(id)) with check (hub_is_owner_of(id));

-- Staff see only their own record; managers and owners see everyone in
-- the business. Managers may add and edit staff; only an owner can create
-- or change managers and owners.
create policy "members read own or managed" on hub_members
  for select using (user_id = auth.uid() or hub_is_manager_of(business_id));
create policy "members owner write" on hub_members
  for all using (hub_is_owner_of(business_id)) with check (hub_is_owner_of(business_id));
create policy "members manager write staff" on hub_members
  for all using (hub_is_manager_of(business_id) and role = 'staff')
  with check (hub_is_manager_of(business_id) and role = 'staff');

-- Every member can see which modules are on (it decides what their menu
-- shows). Only the owner switches them — until paid billing exists, when
-- this write moves to the billing webhook (see ROADMAP.md).
create policy "modules member read" on hub_business_modules
  for select using (hub_is_member_of(business_id));
create policy "modules owner write" on hub_business_modules
  for all using (hub_is_owner_of(business_id)) with check (hub_is_owner_of(business_id));

-- Signed-in users only; anon has no business being here.
revoke execute on function hub_create_business(text, text) from public, anon;
grant execute on function hub_create_business(text, text) to authenticated;
revoke execute on function hub_claim_invites() from public, anon;
grant execute on function hub_claim_invites() to authenticated;
