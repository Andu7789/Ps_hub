-- Access rules for the add-on modules (migrations 0003-0010). Runs after
-- rls_test.sql and reuses its test.* helpers. Only failures are printed.
\o /dev/null

\set owner    'a1111111-1111-1111-1111-111111111111'
\set manager  'a2222222-2222-2222-2222-222222222222'
\set staff    'a3333333-3333-3333-3333-333333333333'
\set staff2   'a4444444-4444-4444-4444-444444444444'
\set outsider 'a5555555-5555-5555-5555-555555555555'

insert into auth.users (id, email) values
  (:'owner', 'owner@m.test'), (:'manager', 'manager@m.test'), (:'staff', 'staff@m.test'),
  (:'staff2', 'staff2@m.test'), (:'outsider', 'owner@other.test');

set role authenticated;
select test.act_as(:'owner', 'owner@m.test');
select hub_create_business('Módule Test & Co', 'Olive Owner') as biz \gset
insert into hub_members (business_id, email, full_name, role) values
  (:'biz', 'manager@m.test', 'Mo Manager', 'manager'),
  (:'biz', 'staff@m.test', 'Sam Staff', 'staff'),
  (:'biz', 'staff2@m.test', 'Sue Second', 'staff');
insert into hub_business_modules (business_id, module_key)
  select :'biz', k from unnest(array['staff_hub', 'compliance', 'gdpr', 'clients', 'website', 'payroll', 'suppliers']) k;
select test.expect((select slug from hub_businesses where id = :'biz') = 'm-dule-test-co', 'slug made from the name');

select test.act_as(:'outsider', 'owner@other.test');
select hub_create_business('Other Ltd', 'Oscar') as other \gset
insert into hub_business_modules (business_id, module_key) values (:'other', 'staff_hub');

select test.act_as(:'manager', 'manager@m.test');
select hub_claim_invites();
select test.act_as(:'staff', 'staff@m.test');
select hub_claim_invites();
select test.act_as(:'staff2', 'staff2@m.test');
select hub_claim_invites();

reset role;
select id as sam from hub_members where email = 'staff@m.test' \gset
select id as sue from hub_members where email = 'staff2@m.test' \gset
select id as oscar from hub_members where email = 'owner@other.test' \gset
set role authenticated;

-- Staff Hub: staff see only their own records.
select test.act_as(:'manager', 'manager@m.test');
insert into hub_training (business_id, member_id, course) values (:'biz', :'sam', 'Manual handling'), (:'biz', :'sue', 'First aid');
select test.expect_error(format('insert into hub_training (business_id, member_id, course) values (%L, %L, %L)', :'biz', :'oscar', 'Sneaky'),
  'cannot attach a record to another business''s member');
select test.act_as(:'staff', 'staff@m.test');
select test.expect((select count(*) from hub_training) = 1, 'staff see only their own training');
select test.expect_error(format('insert into hub_training (business_id, member_id, course) values (%L, %L, %L)', :'biz', :'sam', 'Self-certified'),
  'staff cannot add their own training');

-- Absence self-service.
insert into hub_absences (business_id, member_id, kind, start_on, end_on, status) values (:'biz', :'sam', 'holiday', '2026-11-02', '2026-11-06', 'approved');
select test.expect((select status from hub_absences where kind = 'holiday') = 'requested', 'staff holiday lands as requested, not approved');
insert into hub_absences (business_id, member_id, kind, start_on, end_on, return_to_work_done) values (:'biz', :'sam', 'sickness', '2026-10-01', '2026-10-02', true);
select test.expect((select status || return_to_work_done::text from hub_absences where kind = 'sickness') = 'recordedfalse', 'staff sickness recorded without RTW');
select test.expect_error(format('insert into hub_absences (business_id, member_id, kind, start_on, end_on) values (%L, %L, %L, %L, %L)', :'biz', :'sam', 'unpaid', '2026-12-01', '2026-12-01'),
  'staff cannot record other leave types');
select test.expect_error(format('insert into hub_absences (business_id, member_id, kind, start_on, end_on) values (%L, %L, %L, %L, %L)', :'biz', :'sue', 'holiday', '2026-12-01', '2026-12-01'),
  'staff cannot request holiday for someone else');
update hub_absences set status = 'approved';
select test.expect((select count(*) from hub_absences where status = 'approved') = 0, 'staff cannot approve their own holiday');

-- Employee relations: raise but never read.
insert into hub_er_cases (business_id, member_id, kind, summary, status, outcome) values (:'biz', :'sam', 'grievance', 'Rota unfair', 'closed', 'Dismissed');
select test.expect((select count(*) from hub_er_cases) = 0, 'staff cannot read ER cases, even their own');
select test.expect_error(format('insert into hub_er_cases (business_id, member_id, kind, summary) values (%L, %L, %L, %L)', :'biz', :'sam', 'disciplinary', 'x'),
  'staff cannot open a disciplinary');
select test.act_as(:'manager', 'manager@m.test');
select test.expect((select status || coalesce(outcome, '-') from hub_er_cases) = 'open-', 'raised case lands open with no outcome');

-- Supervision acknowledgement and onboarding ticks, own records only.
insert into hub_supervisions (business_id, member_id, held_on) values (:'biz', :'sam', '2026-09-01') returning id as sup \gset
insert into hub_onboarding_tasks (business_id, member_id, task) values (:'biz', :'sam', 'Bring ID') returning id as task \gset
select test.act_as(:'staff2', 'staff2@m.test');
select test.expect_error(format('select hub_acknowledge_supervision(%L)', :'sup'), 'cannot acknowledge someone else''s supervision');
select test.expect_error(format('select hub_complete_onboarding_task(%L, true)', :'task'), 'cannot tick someone else''s task');
select test.act_as(:'staff', 'staff@m.test');
select hub_acknowledge_supervision(:'sup');
select hub_complete_onboarding_task(:'task', true);
select test.expect((select acknowledged_at is not null from hub_supervisions), 'supervision acknowledged');
select test.expect((select done from hub_onboarding_tasks), 'task ticked');

-- Issued documents: sign once, then frozen.
select test.act_as(:'manager', 'manager@m.test');
insert into hub_issued_documents (business_id, member_id, title, body) values (:'biz', :'sam', 'Contract', 'Terms') returning id as doc \gset
select test.act_as(:'staff2', 'staff2@m.test');
select test.expect_error(format('select hub_sign_issued_document(%L, %L)', :'doc', 'Sue'), 'cannot sign someone else''s contract');
select test.act_as(:'staff', 'staff@m.test');
select hub_sign_issued_document(:'doc', 'Sam Staff');
select test.act_as(:'manager', 'manager@m.test');
select test.expect_error(format('update hub_issued_documents set body = %L where id = %L', 'Changed', :'doc'), 'signed document cannot be edited');
select test.expect_error(format('delete from hub_issued_documents where id = %L', :'doc'), 'signed document cannot be deleted');

-- Recruitment: public adverts and applications.
insert into hub_vacancies (business_id, title, status) values (:'biz', 'Cleaner', 'open') returning id as job \gset
insert into hub_vacancies (business_id, title, status) values (:'biz', 'Secret role', 'draft') returning id as draft_job \gset
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select test.expect(jsonb_array_length(hub_public_jobs('m-dule-test-co') -> 'vacancies') = 1, 'public jobs lists open vacancies only');
select hub_apply_for_job(:'job', 'Ann Applicant', 'ann@x.test', '07700 900000', 'Keen');
select test.expect_error(format('select hub_apply_for_job(%L, %L, %L, %L, %L)', :'draft_job', 'Ann', 'ann@x.test', '', ''), 'cannot apply to a draft');
select test.expect_error(format('select hub_apply_for_job(%L, %L, %L, %L, %L)', :'job', 'Ann', 'not-an-email', '', ''), 'application needs a valid email');
select test.expect((select count(*) from hub_applicants) = 0, 'anon cannot read applicants');
reset role;
set role authenticated;
select test.act_as(:'manager', 'manager@m.test');
select test.expect((select count(*) from hub_applicants) = 1, 'manager sees the application');

-- Compliance: staff incident reports are stripped of manager fields.
select test.act_as(:'staff', 'staff@m.test');
insert into hub_incidents (business_id, member_id, occurred_at, description, status, root_cause)
  values (:'biz', :'sam', now(), 'Slipped on wet floor', 'closed', 'Made up');
select test.expect((select status || coalesce(root_cause, '-') from hub_incidents) = 'open-', 'staff report lands open without investigation');
insert into hub_safeguarding (business_id, member_id, description) values (:'biz', :'sam', 'Worried about a client');
select test.expect((select count(*) from hub_safeguarding) = 0, 'staff cannot read the safeguarding log');
select test.expect((select count(*) from hub_risks) = 0, 'staff cannot read the risk register');
select test.act_as(:'manager', 'manager@m.test');
insert into hub_risks (business_id, hazard, likelihood, severity) values (:'biz', 'Wet floors', 3, 4);
select test.expect((select score from hub_risks) = 12, 'risk score is likelihood x severity');
select test.expect((select count(*) from hub_safeguarding) = 1, 'manager sees the safeguarding concern');

-- Policies open while any of Staff Hub, Compliance or GDPR is on.
insert into hub_policies (business_id, title, body, is_published, category) values (:'biz', 'H&S', 'Be safe', true, 'health_safety');
select test.act_as(:'owner', 'owner@m.test');
update hub_business_modules set enabled = false where business_id = :'biz' and module_key in ('staff_hub', 'gdpr');
select test.act_as(:'staff', 'staff@m.test');
select test.expect((select count(*) from hub_policies) = 1, 'policies visible with only Compliance on');
select test.expect((select count(*) from hub_training) = 0, 'Staff Hub records hidden when it is off');
select test.act_as(:'owner', 'owner@m.test');
update hub_business_modules set enabled = true where business_id = :'biz';

-- GDPR: SAR deadline worked out.
insert into hub_sars (business_id, requester_name, received_on) values (:'biz', 'Jo Bloggs', '2026-01-31') returning id as sar \gset
select test.expect((select due_on from hub_sars) = '2026-02-28', 'SAR due one calendar month later');
update hub_sars set extended = true where id = :'sar';
select test.expect((select due_on from hub_sars) = '2026-04-30', 'extended SAR due three months later');

-- Clients: invoice numbering and totals.
insert into hub_clients (business_id, name) values (:'biz', 'Acme') returning id as client \gset
insert into hub_invoices (business_id, client_id) values (:'biz', :'client') returning id as inv1 \gset
insert into hub_invoices (business_id, client_id) values (:'biz', :'client') returning number as inv2_number \gset
select test.expect((select number from hub_invoices where id = :'inv1') = 'INV-0001', 'first invoice is INV-0001');
select test.expect(:'inv2_number' = 'INV-0002', 'second invoice is INV-0002');
insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price) values (:'biz', :'inv1', 'Deep clean', 2.5, 20);
select test.expect((select line_total from hub_invoice_lines) = 50, 'line total is quantity x price');
select test.expect_error(format('delete from hub_clients where id = %L', :'client'), 'cannot delete a client with invoices');

-- Payroll: pay details are owner-only; staff read their own.
insert into hub_pay_details (member_id, business_id, rate, ni_number) values (:'sam', :'biz', 12.60, 'AB123456C');
select test.act_as(:'manager', 'manager@m.test');
select test.expect((select count(*) from hub_pay_details) = 0, 'managers cannot see pay details');
select test.act_as(:'staff', 'staff@m.test');
select test.expect((select rate from hub_pay_details) = 12.60, 'staff see their own pay details');
select test.act_as(:'staff2', 'staff2@m.test');
select test.expect((select count(*) from hub_pay_details) = 0, 'staff cannot see others'' pay');
insert into hub_timesheets (business_id, member_id, work_on, hours, status) values (:'biz', :'sue', '2026-09-01', 7.5, 'approved');
select test.expect((select status from hub_timesheets) = 'submitted', 'staff timesheets land as submitted');
insert into hub_payroll_queries (business_id, member_id, kind, description, status) values (:'biz', :'sue', 'missing_payslip', 'No payslip for August', 'resolved');
select test.expect((select status from hub_payroll_queries) = 'open', 'payroll query lands open');

-- Website: public site only once published; reviews only once approved.
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select test.expect(hub_public_site('m-dule-test-co') is null, 'unpublished site is not public');
reset role;
set role authenticated;
select test.act_as(:'owner', 'owner@m.test');
update hub_businesses set website_published = true where id = :'biz';
insert into hub_services (business_id, name) values (:'biz', 'Regular clean');
insert into hub_reviews_public (business_id, reviewer_name) values (:'biz', 'Pat') returning token as tok \gset
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select test.expect(jsonb_array_length(hub_public_site('m-dule-test-co') -> 'services') = 1, 'published site shows services');
select test.expect((hub_review_request(:'tok') ->> 'reviewer_name') = 'Pat', 'review link shows who it is for');
select hub_submit_review(:'tok', 5, 'Brilliant');
select test.expect_error(format('select hub_submit_review(%L, 1, %L)', :'tok', 'Changed my mind'), 'a review link works once');
select test.expect(jsonb_array_length(hub_public_site('m-dule-test-co') -> 'reviews') = 0, 'unapproved review not shown');
select hub_request_booking('m-dule-test-co', null, 'Chris Customer', 'chris@x.test', '', '2026-10-10', 'Weekly please');
select test.expect((select count(*) from hub_booking_requests) = 0, 'anon cannot read booking requests');
select test.expect_error(format('select hub_request_booking(%L, null, %L, %L, %L, null, null)', 'm-dule-test-co', 'No Contact', '', ''),
  'booking needs an email or phone');
reset role;
set role authenticated;
select test.act_as(:'manager', 'manager@m.test');
update hub_reviews_public set approved = true;
select test.expect((select count(*) from hub_booking_requests) = 1, 'manager sees the booking request');
reset role;
set role anon;
select test.expect(jsonb_array_length(hub_public_site('m-dule-test-co') -> 'reviews') = 1, 'approved review shown');

-- Other businesses see none of it.
reset role;
set role authenticated;
select test.act_as(:'outsider', 'owner@other.test');
select test.expect(
  (select count(*) from hub_training) + (select count(*) from hub_incidents) + (select count(*) from hub_clients)
  + (select count(*) from hub_booking_requests) + (select count(*) from hub_applicants) = 0,
  'another business sees none of these records'
);
reset role;
