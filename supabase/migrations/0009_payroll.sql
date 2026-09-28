-- Payroll Connect module. The Hub prepares payroll; the business's
-- HMRC-recognised payroll provider runs it and files RTI submissions.
-- Nothing here calculates tax or talks to HMRC.

-- Pay details are owner-only. Staff can read their own (to check their
-- tax code and pension status). Bank details are deliberately not kept
-- here — they belong in the payroll software.
create table hub_pay_details (
  member_id uuid primary key,
  business_id uuid not null references hub_businesses(id) on delete cascade,
  payroll_id text,
  pay_type text not null default 'hourly' check (pay_type in ('hourly', 'salary')),
  rate numeric(12, 2) check (rate >= 0),
  ni_number text check (ni_number is null or ni_number ~ '^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z][0-9]{6}[A-D]$'),
  tax_code text,
  pension_status text not null default 'eligible'
    check (pension_status in ('eligible', 'enrolled', 'opted_out', 'postponed', 'not_eligible')),
  pension_enrolled_on date,
  pension_opt_out_on date,
  re_enrolment_on date,
  notes text,
  updated_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
create trigger hub_pay_details_touch before update on hub_pay_details
  for each row execute function hub_touch_updated_at();
select hub_apply_rls('hub_pay_details', 'payroll', 'owner', true, false);

-- Hours worked. Staff submit their own (always as "submitted"); a manager
-- approves them before they're exported.
create table hub_timesheets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  work_on date not null,
  hours numeric(5, 2) not null check (hours > 0 and hours <= 24),
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
create index hub_timesheets_member_idx on hub_timesheets(member_id, work_on);
select hub_apply_rls('hub_timesheets', 'payroll', 'manager', true, true);
create trigger hub_timesheets_self_service
  before insert on hub_timesheets
  for each row execute function hub_self_service_defaults('status', 'submitted');

-- Payroll problems staff raise: missing payslips, wrong tax or NI,
-- holiday or sick pay not recorded.
create table hub_payroll_queries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  raised_on date not null default current_date,
  kind text not null default 'other'
    check (kind in ('missing_payslip', 'wrong_pay', 'wrong_tax', 'ni_error', 'holiday_not_recorded', 'sick_pay', 'pension', 'other')),
  description text not null check (length(trim(description)) > 0),
  status text not null default 'open' check (status in ('open', 'with_provider', 'resolved')),
  resolution text,
  resolved_on date,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_payroll_queries', 'payroll', 'manager', true, true);
create trigger hub_payroll_queries_self_service
  before insert on hub_payroll_queries
  for each row execute function hub_self_service_defaults('status', 'open', 'resolution', '', 'resolved_on', '');

-- A checklist per pay run: exported to the provider, submitted to HMRC
-- (FPS), payslips issued.
create table hub_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  pay_on date,
  exported_on date,
  fps_submitted boolean not null default false,
  payslips_issued boolean not null default false,
  pension_submitted boolean not null default false,
  status text not null default 'open' check (status in ('open', 'complete')),
  notes text,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);
select hub_apply_rls('hub_payroll_runs', 'payroll');
