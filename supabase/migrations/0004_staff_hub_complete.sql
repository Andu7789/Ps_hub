-- Staff Hub, the rest: onboarding, training and competency, supervision,
-- absence, performance, employee relations, benefits, recruitment, and
-- contract / job description templates issued to staff for signature.

alter table hub_staff_profiles add column holiday_allowance_days numeric(5, 1) check (holiday_allowance_days >= 0);

create table hub_onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  task text not null check (length(trim(task)) > 0),
  due_on date,
  done boolean not null default false,
  done_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_onboarding_tasks', 'staff_hub', 'manager', true, false);

create table hub_training (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  course text not null check (length(trim(course)) > 0),
  category text not null default 'other'
    check (category in ('induction', 'health_safety', 'safeguarding', 'data_protection', 'first_aid', 'coshh', 'manual_handling', 'role_specific', 'other')),
  provider text,
  completed_on date,
  expires_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_training', 'staff_hub', 'manager', true, false);

create table hub_competencies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  competency text not null check (length(trim(competency)) > 0),
  assessed_on date,
  assessed_by text,
  outcome text not null default 'not_yet' check (outcome in ('competent', 'not_yet', 'refresher_needed')),
  review_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_competencies', 'staff_hub', 'manager', true, false);

create table hub_supervisions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  held_on date not null,
  kind text not null default 'supervision' check (kind in ('supervision', 'spot_check', 'one_to_one', 'probation_review')),
  carried_out_by text,
  discussion text,
  actions text,
  next_due_on date,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_supervisions', 'staff_hub', 'manager', true, false);

-- Absence: holiday, sickness and other leave. Staff can request holiday
-- (lands as "requested" for a manager to approve) and report sickness
-- (lands as "recorded"); they can't approve their own or fill in the
-- return-to-work interview.
create table hub_absences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  kind text not null check (kind in ('holiday', 'sickness', 'compassionate', 'unpaid', 'parental', 'other')),
  start_on date not null,
  end_on date not null,
  days numeric(5, 1) check (days >= 0),
  reason text,
  status text not null default 'recorded' check (status in ('requested', 'approved', 'declined', 'recorded')),
  return_to_work_done boolean not null default false,
  return_to_work_notes text,
  created_at timestamptz not null default now(),
  check (end_on >= start_on),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
create index hub_absences_member_idx on hub_absences(member_id, start_on);
select hub_apply_rls('hub_absences', 'staff_hub', 'manager', true, true);

create or replace function hub_absences_self_service()
returns trigger
language plpgsql as $$
begin
  if auth.uid() is null or hub_is_manager_of(new.business_id) then
    return new;
  end if;
  if new.kind not in ('holiday', 'sickness') then
    raise exception 'Staff can request holiday or report sickness' using errcode = '42501';
  end if;
  new.status := case when new.kind = 'holiday' then 'requested' else 'recorded' end;
  new.return_to_work_done := false;
  new.return_to_work_notes := null;
  return new;
end;
$$;
create trigger hub_absences_self_service
  before insert on hub_absences
  for each row execute function hub_absences_self_service();

create table hub_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  review_on date not null,
  kind text not null default 'appraisal' check (kind in ('probation', 'appraisal', 'one_to_one', 'improvement_plan')),
  reviewer text,
  rating text check (rating in ('exceeds', 'meets', 'partly_meets', 'below')),
  strengths text,
  improvements text,
  objectives text,
  next_review_on date,
  status text not null default 'planned' check (status in ('planned', 'completed')),
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_reviews', 'staff_hub', 'manager', true, false);

-- Employee relations cases are confidential: staff can raise a concern or
-- grievance, but never read the case file back.
create table hub_er_cases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  kind text not null default 'concern' check (kind in ('concern', 'grievance', 'disciplinary', 'conflict', 'capability')),
  opened_on date not null default current_date,
  status text not null default 'open' check (status in ('open', 'investigating', 'hearing', 'closed')),
  summary text not null check (length(trim(summary)) > 0),
  investigation text,
  outcome text,
  closed_on date,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_er_cases', 'staff_hub', 'manager', false, true);
create trigger hub_er_cases_self_service
  before insert on hub_er_cases
  for each row execute function hub_self_service_defaults(
    'status', 'open', 'investigation', '', 'outcome', '', 'closed_on', ''
  );
-- Staff may only raise a concern or grievance about themselves.
create or replace function hub_er_cases_staff_kinds()
returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not hub_is_manager_of(new.business_id) and new.kind not in ('concern', 'grievance') then
    raise exception 'Staff can raise a concern or grievance' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger hub_er_cases_staff_kinds
  before insert on hub_er_cases
  for each row execute function hub_er_cases_staff_kinds();

create table hub_benefits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  benefit text not null check (length(trim(benefit)) > 0),
  value text,
  start_on date,
  end_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_benefits', 'staff_hub', 'manager', true, false);

-- Recruitment. Open vacancies marked public appear on the business's
-- jobs page, where anyone can apply (hub_apply_for_job).
create table hub_vacancies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  location text,
  hours text,
  pay text,
  description text,
  closing_on date,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  unique (id, business_id)
);
select hub_apply_rls('hub_vacancies', 'staff_hub');

create table hub_applicants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  vacancy_id uuid,
  full_name text not null check (length(trim(full_name)) > 0),
  email text,
  phone text,
  cover_note text,
  stage text not null default 'applied'
    check (stage in ('applied', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn')),
  interview_at timestamptz,
  right_to_work_checked boolean not null default false,
  references_checked boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (vacancy_id, business_id) references hub_vacancies(id, business_id) on delete set null (vacancy_id)
);
select hub_apply_rls('hub_applicants', 'staff_hub');

-- Templates for contracts, job descriptions and letters, with
-- {{placeholders}} filled from a person's record when issued.
create table hub_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  kind text not null default 'contract' check (kind in ('contract', 'job_description', 'offer_letter', 'letter', 'other')),
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger hub_templates_touch before update on hub_templates
  for each row execute function hub_touch_updated_at();
select hub_apply_rls('hub_templates', 'staff_hub');

-- A document issued to one person: the template's wording with their
-- details filled in, frozen at the moment of issue. Once signed it can't
-- be changed.
create table hub_issued_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  member_id uuid not null,
  kind text not null default 'contract' check (kind in ('contract', 'job_description', 'offer_letter', 'letter', 'other')),
  title text not null,
  body text not null,
  requires_signature boolean not null default true,
  issued_at timestamptz not null default now(),
  signed_name text,
  signed_at timestamptz,
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete cascade
);
select hub_apply_rls('hub_issued_documents', 'staff_hub', 'manager', true, false);

create or replace function hub_issued_documents_freeze_signed()
returns trigger
language plpgsql as $$
begin
  -- Removing the person (or the whole business) takes their documents
  -- with it; otherwise a signed document stays exactly as signed.
  if tg_op = 'DELETE' and not exists (select 1 from hub_members where id = old.member_id) then
    return old;
  end if;
  if old.signed_at is not null then
    raise exception 'A signed document can''t be changed' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger hub_issued_documents_freeze_signed
  before update or delete on hub_issued_documents
  for each row execute function hub_issued_documents_freeze_signed();

-- Staff actions on their own records, each a narrow function rather than
-- an update permission, so they can change exactly one thing.
create or replace function hub_sign_issued_document(target uuid, typed_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  d hub_issued_documents;
begin
  select * into d from hub_issued_documents where id = target;
  if d.id is null or d.member_id is distinct from hub_my_member_id(d.business_id)
     or not hub_module_enabled(d.business_id, 'staff_hub') then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if d.signed_at is not null then
    return;
  end if;
  if typed_name is null or length(trim(typed_name)) = 0 then
    raise exception 'Type your name to sign' using errcode = '23514';
  end if;
  update hub_issued_documents set signed_name = trim(typed_name), signed_at = now() where id = target;
end;
$$;

create or replace function hub_acknowledge_supervision(target uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update hub_supervisions set acknowledged_at = coalesce(acknowledged_at, now())
  where id = target and member_id = hub_my_member_id(business_id) and hub_module_enabled(business_id, 'staff_hub');
  if not found then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function hub_complete_onboarding_task(target uuid, is_done boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update hub_onboarding_tasks
  set done = is_done, done_on = case when is_done then coalesce(done_on, current_date) end
  where id = target and member_id = hub_my_member_id(business_id) and hub_module_enabled(business_id, 'staff_hub');
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Public job adverts and applications. Anonymous visitors only ever see
-- open public vacancies, and can only add an application to one.
create or replace function hub_public_jobs(business_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'business', jsonb_build_object('name', b.name, 'slug', b.slug, 'brand_color', b.brand_color, 'logo_url', b.logo_url),
    'vacancies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'title', v.title, 'location', v.location, 'hours', v.hours,
        'pay', v.pay, 'description', v.description, 'closing_on', v.closing_on
      ) order by v.created_at desc)
      from hub_vacancies v
      where v.business_id = b.id and v.status = 'open' and (v.closing_on is null or v.closing_on >= current_date)
    ), '[]'::jsonb)
  )
  from hub_businesses b
  where b.slug = business_slug and hub_module_enabled(b.id, 'staff_hub');
$$;

create or replace function hub_apply_for_job(target_vacancy uuid, applicant_name text, applicant_email text, applicant_phone text, note text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v hub_vacancies;
begin
  select * into v from hub_vacancies where id = target_vacancy;
  if v.id is null or v.status <> 'open' or (v.closing_on is not null and v.closing_on < current_date)
     or not hub_module_enabled(v.business_id, 'staff_hub') then
    raise exception 'This job is no longer open' using errcode = 'P0002';
  end if;
  if applicant_name is null or length(trim(applicant_name)) = 0
     or applicant_email is null or applicant_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Name and a valid email are required' using errcode = '23514';
  end if;
  insert into hub_applicants (business_id, vacancy_id, full_name, email, phone, cover_note)
  values (v.business_id, v.id, left(trim(applicant_name), 200), lower(left(trim(applicant_email), 320)),
          left(nullif(trim(applicant_phone), ''), 50), left(nullif(trim(note), ''), 5000));
end;
$$;

revoke execute on function hub_sign_issued_document(uuid, text) from public, anon;
revoke execute on function hub_acknowledge_supervision(uuid) from public, anon;
revoke execute on function hub_complete_onboarding_task(uuid, boolean) from public, anon;
grant execute on function hub_sign_issued_document(uuid, text) to authenticated;
grant execute on function hub_acknowledge_supervision(uuid) to authenticated;
grant execute on function hub_complete_onboarding_task(uuid, boolean) to authenticated;
grant execute on function hub_public_jobs(text) to anon, authenticated;
grant execute on function hub_apply_for_job(uuid, text, text, text, text) to anon, authenticated;
