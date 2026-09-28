-- GDPR Toolkit module.

-- Record of processing activities (the "data map"), including special
-- category data and its Article 9 condition.
create table hub_ropa (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  data_category text not null check (length(trim(data_category)) > 0),
  purpose text not null check (length(trim(purpose)) > 0),
  data_subjects text,
  lawful_basis text not null default 'contract'
    check (lawful_basis in ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  special_category boolean not null default false,
  special_condition text,
  source text,
  retention text,
  storage_location text,
  shared_with text,
  security_measures text,
  review_on date,
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_ropa', 'gdpr');

create table hub_processors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  service text,
  data_shared text,
  location text not null default 'uk' check (location in ('uk', 'eea', 'adequate_country', 'other')),
  transfer_mechanism text,
  dpa_signed boolean not null default false,
  dpa_signed_on date,
  review_on date,
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_processors', 'gdpr');

-- Subject access requests: one calendar month to respond, extendable by
-- two more for complex requests. due_on is worked out, not typed.
create table hub_sars (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  requester_name text not null check (length(trim(requester_name)) > 0),
  requester_email text,
  received_on date not null,
  identity_verified boolean not null default false,
  extended boolean not null default false,
  due_on date generated always as (
    (received_on + case when extended then interval '3 months' else interval '1 month' end)::date
  ) stored,
  status text not null default 'received' check (status in ('received', 'in_progress', 'completed', 'refused')),
  completed_on date,
  notes text,
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_sars', 'gdpr');

-- Data breaches: 72 hours from discovery to report a reportable breach to
-- the ICO. The deadline is shown by the app from discovered_at.
create table hub_breaches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  discovered_at timestamptz not null,
  description text not null check (length(trim(description)) > 0),
  data_affected text,
  individuals_affected integer check (individuals_affected >= 0),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  ico_reportable boolean not null default false,
  reported_to_ico_at timestamptz,
  ico_reference text,
  individuals_notified boolean not null default false,
  actions text,
  status text not null default 'open' check (status in ('open', 'contained', 'closed')),
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_breaches', 'gdpr');

create table hub_dpias (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  project text not null check (length(trim(project)) > 0),
  description text,
  necessity text,
  risks text,
  mitigations text,
  residual_risk text not null default 'low' check (residual_risk in ('low', 'medium', 'high')),
  outcome text not null default 'in_progress' check (outcome in ('in_progress', 'approved', 'approved_with_changes', 'rejected')),
  approved_by text,
  completed_on date,
  review_on date,
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_dpias', 'gdpr');

create table hub_privacy_notices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  audience text not null default 'customers' check (audience in ('customers', 'staff', 'job_applicants', 'website')),
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  published boolean not null default false,
  review_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger hub_privacy_notices_touch before update on hub_privacy_notices
  for each row execute function hub_touch_updated_at();
select hub_apply_rls('hub_privacy_notices', 'gdpr');

-- Published notices are public: they're linked from the business's own
-- pages and job adverts.
create or replace function hub_public_privacy_notice(business_slug text, notice_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('business', b.name, 'title', n.title, 'body', n.body, 'updated_at', n.updated_at)
  from hub_privacy_notices n join hub_businesses b on b.id = n.business_id
  where b.slug = business_slug and n.id = notice_id and n.published and hub_module_enabled(b.id, 'gdpr');
$$;
grant execute on function hub_public_privacy_notice(text, uuid) to anon, authenticated;
