-- Compliance & Safety module.

-- Risk register: each risk scored likelihood x severity (1-5 each) for
-- the 5x5 risk matrix.
create table hub_risks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  hazard text not null check (length(trim(hazard)) > 0),
  category text not null default 'health_safety'
    check (category in ('health_safety', 'operational', 'financial', 'legal', 'data', 'reputational', 'other')),
  who_at_risk text,
  likelihood integer not null check (likelihood between 1 and 5),
  severity integer not null check (severity between 1 and 5),
  score integer generated always as (likelihood * severity) stored,
  existing_controls text,
  further_actions text,
  owner text,
  review_on date,
  status text not null default 'open' check (status in ('open', 'controlled', 'closed')),
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_risks', 'compliance');

create table hub_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  activity text,
  location text,
  assessed_by text,
  assessed_on date,
  hazards_and_controls text,
  review_on date,
  status text not null default 'current' check (status in ('draft', 'current', 'archived')),
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_risk_assessments', 'compliance');

-- COSHH: substances hazardous to health. Suppliers' products can point
-- at their COSHH entry (see 0010), so this needs the pair key.
create table hub_coshh (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  product text not null check (length(trim(product)) > 0),
  supplier text,
  hazards text,
  used_for text,
  location text,
  sds_on_file boolean not null default false,
  ppe text,
  controls text,
  first_aid text,
  assessed_on date,
  review_on date,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);
select hub_apply_rls('hub_coshh', 'compliance');

-- Accidents and incidents. Any member can report one (it becomes
-- theirs as reporter, and they can read their own reports back); the
-- investigation and outcome are for managers.
create table hub_incidents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid,
  occurred_at timestamptz not null,
  location text,
  kind text not null default 'incident' check (kind in ('accident', 'incident', 'near_miss', 'dangerous_occurrence')),
  people_involved text,
  description text not null check (length(trim(description)) > 0),
  injury text,
  first_aid_given text,
  riddor_reportable boolean not null default false,
  reported_to_hse_on date,
  status text not null default 'open' check (status in ('open', 'investigating', 'closed')),
  investigation text,
  root_cause text,
  actions text,
  closed_on date,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete set null (member_id)
);
select hub_apply_rls('hub_incidents', 'compliance', 'manager', true, true);
create trigger hub_incidents_self_service
  before insert on hub_incidents
  for each row execute function hub_self_service_defaults(
    'status', 'open', 'riddor_reportable', 'false', 'reported_to_hse_on', '', 'investigation', '',
    'root_cause', '', 'actions', '', 'closed_on', ''
  );

-- Safeguarding concerns: staff can raise one, but never read the log.
create table hub_safeguarding (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid,
  raised_on date not null default current_date,
  person_initials text,
  concern_type text not null default 'other'
    check (concern_type in ('physical', 'emotional', 'sexual', 'neglect', 'financial', 'discriminatory', 'organisational', 'self_neglect', 'domestic', 'modern_slavery', 'other')),
  description text not null check (length(trim(description)) > 0),
  action_taken text,
  referred_to text,
  referred_on date,
  status text not null default 'open' check (status in ('open', 'referred', 'closed')),
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete set null (member_id)
);
select hub_apply_rls('hub_safeguarding', 'compliance', 'manager', false, true);
create trigger hub_safeguarding_self_service
  before insert on hub_safeguarding
  for each row execute function hub_self_service_defaults(
    'status', 'open', 'action_taken', '', 'referred_to', '', 'referred_on', ''
  );

-- Audits and reviews on a repeating schedule: the review calendar.
create table hub_audits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  area text,
  frequency text not null default 'annual' check (frequency in ('monthly', 'quarterly', 'six_monthly', 'annual')),
  owner text,
  last_done_on date,
  next_due_on date,
  notes text,
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_audits', 'compliance');

-- Quality / site spot checks (distinct from Staff Hub supervisions: these
-- are about the work, optionally naming who did it).
create table hub_spot_checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid,
  checked_on date not null,
  location text,
  checked_by text,
  outcome text not null default 'pass' check (outcome in ('pass', 'advisory', 'fail')),
  findings text,
  actions text,
  follow_up_on date,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete set null (member_id)
);
select hub_apply_rls('hub_spot_checks', 'compliance', 'manager', true, false);

create table hub_insurance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  kind text not null default 'public_liability'
    check (kind in ('public_liability', 'employers_liability', 'professional_indemnity', 'vehicle', 'property', 'contents', 'cyber', 'other')),
  insurer text,
  policy_number text,
  cover text,
  premium numeric(12, 2),
  start_on date,
  renewal_on date,
  broker text,
  notes text,
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_insurance', 'compliance');

create table hub_vehicles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid,
  registration text not null check (length(trim(registration)) > 0),
  make_model text,
  mot_due_on date,
  tax_due_on date,
  insurance_due_on date,
  service_due_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete set null (member_id)
);
select hub_apply_rls('hub_vehicles', 'compliance', 'manager', true, false);

create table hub_driver_checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  licence_number text,
  checked_on date not null,
  points integer check (points >= 0),
  categories text,
  business_insurance_on_own_car boolean not null default false,
  next_check_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_driver_checks', 'compliance', 'manager', true, false);

-- Registrations with regulators and other bodies (ICO, CQC, Ofsted,
-- waste carrier licence…).
create table hub_registrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  reference text,
  registered_on date,
  renewal_on date,
  fee numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_registrations', 'compliance');
