-- Fills one business with realistic demo records for every module, so a
-- demo shows real-looking registers instead of empty tiles. Themed as a
-- small digital agency. Run it once per business, in the Supabase SQL
-- editor or with psql, after replacing the business id below.
--
-- Demo people use @example.com addresses and are never invited, so nobody
-- is emailed. Every date is relative to the day it runs, so the "due in the
-- next 30 days" list has a mix of upcoming and overdue items. It refuses to
-- run twice on the same business.
--
-- To remove it again: delete the @example.com members (their records
-- cascade), then the rows below that aren't tied to a person (clients,
-- suppliers, policies and so on).

do $$
declare
  b uuid := '00000000-0000-0000-0000-000000000000';  -- the business to fill
  d date := current_date;
  owner_id uuid;
  owner_name text;
  sophie uuid; james uuid; emily uuid; liam uuid; aisha uuid; tom uuid; rachel uuid;
  existing_staff uuid[];
  p_handbook uuid; p_hs uuid; p_data uuid; p_it uuid; p_remote uuid; p_equality uuid; p_social uuid; p_whistle uuid;
  t_contract uuid; t_jd uuid; t_offer uuid;
  v_dev uuid; v_social uuid;
  c_harbour uuid; c_bloom uuid; c_northgate uuid; c_kettle uuid; c_ridge uuid; c_oak uuid; c_lumen uuid; c_fern uuid;
  inv uuid;
  s_web uuid; s_seo uuid; s_social uuid; s_brand uuid; s_care uuid;
  sup_office uuid; sup_clean uuid; sup_it uuid; sup_print uuid; sup_coffee uuid;
  coshh_spray uuid; coshh_wipes uuid;
  m uuid;
begin
  if not exists (select 1 from hub_businesses where id = b) then
    raise exception 'Set the business id at the top of this script first';
  end if;
  if exists (select 1 from hub_members where business_id = b and email like '%@example.com') then
    raise exception 'This business already has the demo data';
  end if;

  select id, full_name into owner_id, owner_name from hub_members
  where business_id = b and role = 'owner' and status = 'active' order by created_at limit 1;
  select coalesce(array_agg(id order by created_at), '{}') into existing_staff from hub_members
  where business_id = b and role <> 'owner' and status = 'active';

  -- Business details for the public site, only where still blank.
  update hub_businesses set
    tagline = coalesce(tagline, 'Websites, search and social for independent businesses'),
    about = coalesce(about, 'We are a small digital studio helping independent shops, trades and hospitality businesses win customers online. We design and build fast websites, get them found on Google and keep their social channels busy, with one friendly team looking after everything.'),
    phone = coalesce(phone, '01632 960 482'),
    address = coalesce(address, 'Unit 4, The Old Print Works, 12 Mill Lane, Leeds LS1 4AB')
  where id = b;

  -- Every module on.
  insert into hub_business_modules (business_id, module_key, enabled)
  select b, k, true from unnest(array['staff_hub', 'compliance', 'gdpr', 'clients', 'website', 'payroll', 'suppliers']) k
  on conflict (business_id, module_key) do update set enabled = true, updated_at = now();

  ---------------------------------------------------------------------------
  -- Team
  ---------------------------------------------------------------------------
  insert into hub_members (business_id, email, full_name, role) values (b, 'sophie.turner@example.com', 'Sophie Turner', 'manager') returning id into sophie;
  insert into hub_members (business_id, email, full_name, role) values (b, 'james.patel@example.com', 'James Patel', 'staff') returning id into james;
  insert into hub_members (business_id, email, full_name, role) values (b, 'emily.clarke@example.com', 'Emily Clarke', 'staff') returning id into emily;
  insert into hub_members (business_id, email, full_name, role) values (b, 'liam.oconnor@example.com', 'Liam O''Connor', 'staff') returning id into liam;
  insert into hub_members (business_id, email, full_name, role) values (b, 'aisha.rahman@example.com', 'Aisha Rahman', 'staff') returning id into aisha;
  insert into hub_members (business_id, email, full_name, role) values (b, 'tom.hughes@example.com', 'Tom Hughes', 'staff') returning id into tom;
  insert into hub_members (business_id, email, full_name, role, status) values (b, 'rachel.green@example.com', 'Rachel Green', 'staff', 'left') returning id into rachel;

  insert into hub_staff_profiles (member_id, business_id, job_title, employment_type, start_date, phone, emergency_contact_name, emergency_contact_phone, holiday_allowance_days) values
    (owner_id, b, 'Managing Director', 'full_time', d - 1650, '07700 900101', 'Claire Britain', '07700 900102', 28),
    (sophie, b, 'Operations Manager', 'full_time', d - 1100, '07700 900111', 'Mark Turner', '07700 900112', 28),
    (james, b, 'Senior Web Developer', 'full_time', d - 900, '07700 900121', 'Priya Patel', '07700 900122', 28),
    (emily, b, 'Designer', 'full_time', d - 640, '07700 900131', 'Helen Clarke', '07700 900132', 28),
    (liam, b, 'Social Media Executive', 'part_time', d - 420, '07700 900141', 'Sean O''Connor', '07700 900142', 16.8),
    (aisha, b, 'Junior Web Developer', 'full_time', d - 24, '07700 900151', 'Yusuf Rahman', '07700 900152', 28),
    (tom, b, 'Account Manager', 'full_time', d - 300, '07700 900161', 'Lucy Hughes', '07700 900162', 28),
    (rachel, b, 'SEO Specialist', 'full_time', d - 1200, '07700 900171', 'Ben Green', '07700 900172', 28)
  on conflict (member_id) do nothing;
  foreach m in array existing_staff loop
    insert into hub_staff_profiles (member_id, business_id, job_title, employment_type, start_date, holiday_allowance_days)
    values (m, b, 'Content Writer', 'part_time', d - 150, 20)
    on conflict (member_id) do nothing;
  end loop;

  ---------------------------------------------------------------------------
  -- Policies and signatures
  ---------------------------------------------------------------------------
  insert into hub_policies (business_id, title, category, is_published, body) values (b, 'Staff Handbook', 'hr', true,
'Welcome to the team. This handbook explains how we work and what you can expect from us.

Working hours
Our core hours are 9.30am to 3.30pm, Monday to Friday. Full-time hours are 37.5 a week; you can flex your start and finish times around the core hours as long as your manager knows.

Holiday
Full-time staff get 28 days a year including bank holidays, pro rata for part-time staff. Book holiday through the Hub at least two weeks ahead for anything over two days. Our leave year runs January to December and up to five days can be carried over.

Sickness
If you are ill, phone or message your manager before 9.30am on the first day. For absences over seven calendar days we need a fit note. We hold a short return-to-work chat after every absence.

Conduct
Treat colleagues and clients with respect. Keep client information confidential, both during and after your employment.

Questions
Speak to Sophie Turner (Operations) about anything in this handbook.') returning id into p_handbook;

  insert into hub_policies (business_id, title, category, is_published, body) values (b, 'Health and Safety Policy', 'health_safety', true,
'Statement of intent
We will provide a safe and healthy workplace for everyone who works with us or visits us, so far as is reasonably practicable.

Responsibilities
The Managing Director has overall responsibility for health and safety. Sophie Turner is responsible for day-to-day arrangements, including risk assessments, first aid and fire safety.

Everyone must:
- take reasonable care of themselves and others
- report accidents, near misses and hazards straight away using the Hub
- complete their display screen equipment (DSE) self-assessment within their first week
- follow the fire evacuation procedure and know where the assembly point is (the car park by the main gate)

First aid
Our trained first aiders are listed on the kitchen noticeboard. The first aid kit is in the kitchen.

Review
This policy is reviewed every year, or sooner after a significant change.') returning id into p_hs;

  insert into hub_policies (business_id, title, category, is_published, body) values (b, 'Data Protection Policy', 'data_protection', true,
'We handle personal data about our staff, our clients and our clients'' customers. We follow UK GDPR and the Data Protection Act 2018.

Principles
We only collect the data we need, use it for the reason we collected it, keep it accurate and secure, and delete it when we no longer need it.

Client data
Client website logins, analytics and mailing lists are held in our password manager and client accounts only. Never download client customer lists to personal devices.

Subject access requests
Anyone can ask for a copy of the data we hold about them. Pass any request straight to Sophie Turner: we have one month to respond.

Breaches
If you think personal data has been lost, sent to the wrong person or accessed without permission, tell Sophie or the Managing Director immediately. We have 72 hours to report serious breaches to the ICO.') returning id into p_data;

  insert into hub_policies (business_id, title, category, is_published, body) values (b, 'IT and Acceptable Use Policy', 'general', true,
'Company laptops, accounts and software are provided for work.

Passwords and access
Use the company password manager for every work login, with a unique password for each. Two-factor authentication must be switched on for email, hosting, domain and social media accounts.

Devices
Lock your screen when you step away. Keep your laptop''s operating system and browser up to date. Report a lost or stolen device immediately so we can revoke access.

Client systems
Only access client systems you have been asked to work on. Never share client credentials over email or chat; use the password manager''s sharing feature.

Monitoring
We may review use of company systems where there is a legitimate business reason, in line with our staff privacy notice.') returning id into p_it;

  insert into hub_policies (business_id, title, category, is_published, body) values (b, 'Hybrid Working Policy', 'hr', true,
'Most roles can work from home up to three days a week. Tuesdays and Thursdays are studio days for everyone.

Your home set-up
Complete a DSE self-assessment for your home workstation. We will lend you a monitor, keyboard and chair if you need them.

Security
Work only on your company laptop, on a password-protected network. Don''t take calls about clients where you can be overheard.

Availability
Be reachable on Slack during core hours and keep your calendar up to date.') returning id into p_remote;

  insert into hub_policies (business_id, title, category, is_published, body) values (b, 'Equality, Diversity and Inclusion Policy', 'hr', true,
'We are committed to a workplace where everyone is treated fairly and with respect, regardless of age, disability, gender reassignment, marriage or civil partnership, pregnancy or maternity, race, religion or belief, sex or sexual orientation.

This applies to recruitment, pay, training, promotion and every other part of working here. Harassment, bullying and victimisation are not tolerated and will be dealt with under the disciplinary procedure.

If you experience or see behaviour that goes against this policy, raise it with your manager or through the Hub as a concern or grievance.') returning id into p_equality;

  insert into hub_policies (business_id, title, category, is_published, body) values (b, 'Social Media Policy', 'general', true,
'We run social media for our clients, so we hold ourselves to a high standard on our own channels too.

- Only post on a client''s channels content that has been approved through the content calendar.
- Never post from a client account on a personal device that isn''t signed in to the password manager.
- On your own accounts, don''t share client work before it is public, and don''t comment on clients or competitors in a way that could embarrass the business.
- If a client account receives abusive or worrying messages, screenshot them and tell your manager before responding.') returning id into p_social;

  insert into hub_policies (business_id, title, category, is_published, body) values (b, 'Whistleblowing Policy', 'general', false,
'DRAFT: to be reviewed by our HR adviser before publishing.

If you believe something illegal, dangerous or seriously wrong is happening at work, you can raise it without fear of being treated unfairly. Raise concerns with the Managing Director, or if that isn''t appropriate, with our external HR adviser. You can also contact the relevant regulator directly.') returning id into p_whistle;

  -- Most of the team has signed most policies; a few are still outstanding.
  insert into hub_policy_signatures (business_id, policy_id, policy_version, member_id, signed_name, signed_at)
  select b, p.id, 1, mm.id, mm.full_name, now() - (random() * interval '60 days') - interval '1 day'
  from hub_policies p
  cross join hub_members mm
  where p.business_id = b and p.is_published and mm.business_id = b and mm.status = 'active'
    and not (mm.id = aisha and p.id in (p_data, p_it, p_social, p_equality))
    and not (mm.id = liam and p.id in (p_remote))
    and not (mm.id = tom and p.id in (p_social))
    and not (mm.id = any(existing_staff) and p.id in (p_hs, p_it));

  ---------------------------------------------------------------------------
  -- Templates and issued documents
  ---------------------------------------------------------------------------
  insert into hub_templates (business_id, kind, title, body) values (b, 'contract', 'Contract of employment',
'Employer: {{business_name}}
Employee: {{full_name}}
Job title: {{job_title}}
Employment type: {{employment_type}}
Start date: {{start_date}}

1. Place of work: our studio in Leeds, with hybrid working under the Hybrid Working Policy.
2. Hours: 37.5 hours a week, Monday to Friday, with core hours of 9.30am to 3.30pm.
3. Holiday: 28 days a year including bank holidays, pro rata for part-time hours.
4. Probation: three months, during which either side may give one week''s notice.
5. Notice: after probation, one month from either side.
6. Pension: you will be auto-enrolled into our workplace pension scheme.

Signed for {{business_name}} on {{today}}.') returning id into t_contract;
  insert into hub_templates (business_id, kind, title, body) values (b, 'job_description', 'Job description: Web Developer',
'Role: {{job_title}}
Reports to: Senior Web Developer

Purpose
Build and look after fast, accessible websites for our clients.

Main responsibilities
- Build sites from agreed designs using our component library
- Keep client sites updated, backed up and secure
- Fix issues raised through the client support inbox within agreed times
- Write clear notes for handover to clients

About you
Comfortable with HTML, CSS and JavaScript; keen to learn; good at explaining technical things simply.') returning id into t_jd;
  insert into hub_templates (business_id, kind, title, body) values (b, 'offer_letter', 'Offer letter',
'Dear {{first_name}},

We are delighted to offer you the role of {{job_title}} at {{business_name}}, starting on {{start_date}}.

This offer is subject to satisfactory references and proof of your right to work in the UK. Your contract of employment will follow on the Hub for you to read and sign.

We are really looking forward to working with you.

Best wishes,
{{business_name}}') returning id into t_offer;

  insert into hub_issued_documents (business_id, member_id, kind, title, body, requires_signature, issued_at, signed_name, signed_at) values
    (b, james, 'contract', 'Contract of employment', 'Employer: Message Home Digital. Employee: James Patel. Job title: Senior Web Developer. Hours: 37.5 a week. Holiday: 28 days. Notice: one month.', true, now() - interval '400 days', 'James Patel', now() - interval '398 days'),
    (b, emily, 'contract', 'Contract of employment', 'Employer: Message Home Digital. Employee: Emily Clarke. Job title: Designer. Hours: 37.5 a week. Holiday: 28 days. Notice: one month.', true, now() - interval '640 days', 'Emily Clarke', now() - interval '639 days'),
    (b, liam, 'contract', 'Contract of employment (part-time)', 'Employer: Message Home Digital. Employee: Liam O''Connor. Job title: Social Media Executive. Hours: 22.5 a week, Monday to Wednesday. Holiday: 16.8 days. Notice: one month.', true, now() - interval '420 days', 'Liam O''Connor', now() - interval '418 days'),
    (b, tom, 'contract', 'Contract of employment', 'Employer: Message Home Digital. Employee: Tom Hughes. Job title: Account Manager. Hours: 37.5 a week. Holiday: 28 days. Notice: one month.', true, now() - interval '300 days', 'Tom Hughes', now() - interval '299 days'),
    (b, aisha, 'offer_letter', 'Offer letter', 'Dear Aisha, we are delighted to offer you the role of Junior Web Developer at Message Home Digital.', false, now() - interval '45 days', null, null),
    (b, aisha, 'contract', 'Contract of employment', 'Employer: Message Home Digital. Employee: Aisha Rahman. Job title: Junior Web Developer. Hours: 37.5 a week. Holiday: 28 days. Probation: three months. Notice: one month after probation.', true, now() - interval '25 days', null, null),
    (b, aisha, 'job_description', 'Job description: Junior Web Developer', 'Build and look after fast, accessible websites for our clients, reporting to the Senior Web Developer.', true, now() - interval '25 days', 'Aisha Rahman', now() - interval '23 days');

  ---------------------------------------------------------------------------
  -- Onboarding, training, competency, supervision, reviews
  ---------------------------------------------------------------------------
  insert into hub_onboarding_tasks (business_id, member_id, task, due_on, done, done_on) values
    (b, aisha, 'Right to work check (passport copied and verified)', d - 28, true, d - 27),
    (b, aisha, 'Laptop set up with password manager and 2FA', d - 24, true, d - 24),
    (b, aisha, 'Read and sign the Staff Handbook', d - 20, true, d - 22),
    (b, aisha, 'DSE self-assessment for studio and home desk', d - 17, true, d - 18),
    (b, aisha, 'Data protection training (online)', d - 3, false, null),
    (b, aisha, 'Shadow James on two client site launches', d + 10, false, null),
    (b, aisha, 'Sign contract of employment', d - 10, false, null),
    (b, aisha, 'Three-month probation review booked', d + 20, false, null);
  foreach m in array existing_staff loop
    insert into hub_onboarding_tasks (business_id, member_id, task, due_on, done, done_on) values
      (b, m, 'Right to work check', d - 150, true, d - 150),
      (b, m, 'Read and sign the Health and Safety Policy', d + 5, false, null);
  end loop;

  insert into hub_training (business_id, member_id, course, category, provider, completed_on, expires_on) values
    (b, owner_id, 'Emergency First Aid at Work', 'first_aid', 'St John Ambulance', d - 1080, d + 15),
    (b, sophie, 'Emergency First Aid at Work', 'first_aid', 'St John Ambulance', d - 700, d + 395),
    (b, sophie, 'Fire Marshal Training', 'health_safety', 'Leeds Fire Safety Ltd', d - 380, d - 15),
    (b, sophie, 'IOSH Managing Safely', 'health_safety', 'IOSH', d - 500, null),
    (b, james, 'GDPR for Web Professionals', 'data_protection', 'Data Protection Academy', d - 330, d + 35),
    (b, james, 'Web Accessibility (WCAG 2.2)', 'role_specific', 'Deque University', d - 200, null),
    (b, emily, 'GDPR Essentials', 'data_protection', 'Data Protection Academy', d - 250, d + 115),
    (b, emily, 'Display Screen Equipment Awareness', 'health_safety', 'iHasco', d - 600, d + 130),
    (b, liam, 'GDPR Essentials', 'data_protection', 'Data Protection Academy', d - 390, d - 25),
    (b, liam, 'Meta Certified Digital Marketing Associate', 'role_specific', 'Meta', d - 180, d + 550),
    (b, tom, 'GDPR Essentials', 'data_protection', 'Data Protection Academy', d - 280, d + 85),
    (b, tom, 'Manual Handling', 'manual_handling', 'iHasco', d - 280, d + 815),
    (b, aisha, 'Company Induction', 'induction', 'In-house', d - 24, null),
    (b, aisha, 'Display Screen Equipment Awareness', 'health_safety', 'iHasco', d - 18, d + 1077),
    (b, james, 'Fire Safety Awareness', 'health_safety', 'iHasco', d - 350, d + 15),
    (b, emily, 'Fire Safety Awareness', 'health_safety', 'iHasco', d - 350, d + 15);

  insert into hub_competencies (business_id, member_id, competency, assessed_on, assessed_by, outcome, review_on, notes) values
    (b, james, 'WordPress build and deployment', d - 200, 'Andrew Britain', 'competent', d + 165, null),
    (b, james, 'Client site security hardening', d - 200, 'Andrew Britain', 'competent', d + 165, null),
    (b, aisha, 'WordPress build and deployment', d - 10, 'James Patel', 'not_yet', d + 20, 'Good progress on the staging build; needs to lead a launch.'),
    (b, aisha, 'Git workflow and code review', d - 10, 'James Patel', 'competent', d + 355, null),
    (b, liam, 'Paid social campaign set-up', d - 150, 'Sophie Turner', 'competent', d + 215, null),
    (b, liam, 'Social media crisis response', d - 380, 'Sophie Turner', 'refresher_needed', d - 15, 'Refresher due after the updated escalation process.'),
    (b, emily, 'Brand identity projects', d - 300, 'Andrew Britain', 'competent', d + 65, null),
    (b, tom, 'Client onboarding and discovery', d - 120, 'Sophie Turner', 'competent', d + 245, null);

  insert into hub_supervisions (business_id, member_id, held_on, kind, carried_out_by, discussion, actions, next_due_on, acknowledged_at) values
    (b, james, d - 35, 'one_to_one', 'Andrew Britain', 'Workload across three launches; interest in leading the new hosting set-up.', 'James to scope managed hosting offer.', d - 5, now() - interval '34 days'),
    (b, emily, d - 20, 'one_to_one', 'Sophie Turner', 'Happy with project mix. Would like more illustration work.', 'Pair Emily with Liam on social graphics.', d + 10, now() - interval '19 days'),
    (b, liam, d - 25, 'one_to_one', 'Sophie Turner', 'Review of client content calendars; one late approval from a client.', 'Add approval deadline to calendar template.', d + 5, null),
    (b, tom, d - 40, 'one_to_one', 'Sophie Turner', 'New client pipeline and upcoming renewals.', 'Tom to prepare renewal proposals for Harbour and Bloom.', d + 20, now() - interval '38 days'),
    (b, aisha, d - 7, 'probation_review', 'James Patel', 'First fortnight check-in. Settling in well; building confidence with deployments.', 'Complete data protection training.', d + 7, null),
    (b, sophie, d - 30, 'one_to_one', 'Andrew Britain', 'Operations priorities for Q4 and fire marshal refresher.', 'Book fire marshal refresher.', d + 25, now() - interval '29 days');

  insert into hub_reviews (business_id, member_id, review_on, kind, reviewer, rating, strengths, improvements, objectives, next_review_on, status) values
    (b, james, d - 180, 'appraisal', 'Andrew Britain', 'exceeds', 'Technical leadership, calm under pressure on launches.', 'Delegate more to junior developers.', 'Mentor Aisha through probation; launch hosting offer.', d + 185, 'completed'),
    (b, emily, d - 150, 'appraisal', 'Sophie Turner', 'meets', 'Strong visual design and client presentations.', 'Estimating design time more accurately.', 'Build a reusable brand guidelines template.', d + 215, 'completed'),
    (b, liam, d - 90, 'appraisal', 'Sophie Turner', 'meets', 'Great engagement results for hospitality clients.', 'Reporting consistency.', 'Monthly client reports sent by the 5th.', d + 25, 'completed'),
    (b, tom, d - 210, 'probation', 'Sophie Turner', 'meets', 'Quickly built trust with clients.', 'Proposal turnaround time.', 'Pass probation.', null, 'completed'),
    (b, tom, d + 12, 'appraisal', 'Sophie Turner', null, null, null, null, null, 'planned'),
    (b, aisha, d + 66, 'probation', 'James Patel', null, null, null, null, null, 'planned');

  ---------------------------------------------------------------------------
  -- Absence, employee relations, benefits
  ---------------------------------------------------------------------------
  insert into hub_absences (business_id, member_id, kind, start_on, end_on, days, reason, status, return_to_work_done, return_to_work_notes) values
    (b, james, 'holiday', d - 60, d - 51, 8, 'Family holiday', 'approved', false, null),
    (b, james, 'holiday', d + 45, d + 47, 3, 'Long weekend', 'requested', false, null),
    (b, emily, 'holiday', d - 20, d - 16, 5, null, 'approved', false, null),
    (b, emily, 'sickness', d - 95, d - 94, 2, 'Migraine', 'recorded', true, 'Fine to return; no adjustments needed.'),
    (b, liam, 'sickness', d - 150, d - 150, 1, 'Stomach bug', 'recorded', true, 'Recovered.'),
    (b, liam, 'sickness', d - 80, d - 79, 2, 'Cold', 'recorded', true, 'Recovered.'),
    (b, liam, 'sickness', d - 12, d - 12, 1, 'Dental treatment', 'recorded', false, null),
    (b, liam, 'holiday', d + 20, d + 22, 3, 'Wedding', 'approved', false, null),
    (b, tom, 'holiday', d - 5, d - 3, 3, null, 'approved', false, null),
    (b, tom, 'compassionate', d - 110, d - 108, 3, 'Family bereavement', 'recorded', true, 'Check-in offered; EAP details shared.'),
    (b, sophie, 'holiday', d + 30, d + 39, 8, 'Autumn break', 'approved', false, null),
    (b, aisha, 'holiday', d + 60, d + 60, 1, 'Graduation ceremony', 'requested', false, null);

  insert into hub_er_cases (business_id, member_id, kind, opened_on, status, summary, investigation, outcome, closed_on) values
    (b, liam, 'concern', d - 14, 'investigating', 'Short-term absence pattern: three spells of sickness in five months.', 'Informal meeting held; no underlying health issue disclosed. Monitoring for three months.', null, null),
    (b, emily, 'grievance', d - 210, 'closed', 'Raised concern about workload being allocated unevenly across the design team.', 'Reviewed project allocation for the previous quarter.', 'Upheld in part. Introduced a weekly resourcing meeting.', d - 180);

  insert into hub_benefits (business_id, member_id, benefit, value, start_on, notes) values
    (b, owner_id, 'Private medical insurance', '£85 a month', d - 1500, null),
    (b, sophie, 'Private medical insurance', '£70 a month', d - 900, null),
    (b, james, 'Cycle to Work scheme', '£1,200 bike', d - 400, 'Salary sacrifice over 12 months.'),
    (b, james, 'Training budget', '£750 a year', d - 700, null),
    (b, emily, 'Training budget', '£750 a year', d - 500, null),
    (b, tom, 'Mobile phone', 'iPhone 15 on business contract', d - 300, null),
    (b, liam, 'Home working allowance', '£26 a month', d - 400, null);

  ---------------------------------------------------------------------------
  -- Recruitment
  ---------------------------------------------------------------------------
  insert into hub_vacancies (business_id, title, location, hours, pay, description, closing_on, status) values
    (b, 'Web Developer', 'Leeds (hybrid)', 'Full time, 37.5 hours', '£32,000 to £38,000', 'Join our small development team building fast, accessible websites for independent businesses. You''ll work with WordPress and modern front-end tooling, and look after client sites once they go live.', d + 18, 'open')
    returning id into v_dev;
  insert into hub_vacancies (business_id, title, location, hours, pay, description, closing_on, status) values
    (b, 'Social Media Assistant (part time)', 'Leeds (hybrid)', '3 days a week', '£24,000 pro rata', 'Help plan, create and schedule social content for our hospitality and retail clients.', d + 40, 'draft')
    returning id into v_social;
  insert into hub_vacancies (business_id, title, location, hours, pay, description, closing_on, status) values
    (b, 'Junior Web Developer', 'Leeds (hybrid)', 'Full time', '£25,000', 'Our entry-level developer role, now filled.', d - 70, 'closed');

  insert into hub_applicants (business_id, vacancy_id, full_name, email, phone, cover_note, stage, interview_at, right_to_work_checked, references_checked, notes) values
    (b, v_dev, 'Daniel Moore', 'daniel.moore@example.com', '07700 900201', 'Four years building WordPress sites at an agency in Manchester.', 'interview', now() + interval '3 days', false, false, 'Strong portfolio; interview with James and Andrew.'),
    (b, v_dev, 'Grace Okafor', 'grace.okafor@example.com', '07700 900202', 'Front-end developer looking to move into agency work.', 'shortlisted', null, false, false, null),
    (b, v_dev, 'Harry Wilson', 'harry.wilson@example.com', null, 'Recent bootcamp graduate.', 'applied', null, false, false, null),
    (b, v_dev, 'Mei Chen', 'mei.chen@example.com', '07700 900204', 'Full-stack developer, strong on accessibility.', 'offered', now() - interval '5 days', true, false, 'Offer sent; waiting on second reference.'),
    (b, v_dev, 'Oliver Price', 'oliver.price@example.com', null, null, 'rejected', null, false, false, 'Not enough WordPress experience for this role.');

  ---------------------------------------------------------------------------
  -- Driving, vehicles, timesheets
  ---------------------------------------------------------------------------
  insert into hub_driver_checks (business_id, member_id, licence_number, checked_on, points, categories, business_insurance_on_own_car, next_check_on, notes) values
    (b, tom, 'HUGHE901234T99AB', d - 170, 0, 'B', true, d + 10, 'Visits clients in own car.'),
    (b, owner_id, 'BRITA801234A99CD', d - 200, 3, 'B, BE', true, d - 20, null),
    (b, sophie, 'TURNE851234S99EF', d - 60, 0, 'B', false, d + 305, 'Occasional driving only.');
  insert into hub_vehicles (business_id, member_id, registration, make_model, mot_due_on, tax_due_on, insurance_due_on, service_due_on, notes) values
    (b, tom, 'YK21 MHD', 'Volkswagen Polo', d + 25, d + 95, d + 140, d + 60, 'Pool car, kept at the studio.');

  insert into hub_timesheets (business_id, member_id, work_on, hours, notes, status)
  select b, liam, day::date, 7.5, 'Client content and scheduling', case when day < d - 7 then 'approved' else 'submitted' end
  from generate_series(d - 21, d - 1, interval '1 day') day
  where extract(isodow from day) in (1, 2, 3);
  foreach m in array existing_staff loop
    insert into hub_timesheets (business_id, member_id, work_on, hours, notes, status)
    select b, m, day::date, 5, 'Blog posts and website copy', case when day < d - 7 then 'approved' else 'submitted' end
    from generate_series(d - 14, d - 1, interval '1 day') day
    where extract(isodow from day) in (2, 4);
  end loop;

  ---------------------------------------------------------------------------
  -- Compliance and safety
  ---------------------------------------------------------------------------
  insert into hub_incidents (business_id, member_id, occurred_at, location, kind, people_involved, description, injury, first_aid_given, riddor_reportable, status, investigation, root_cause, actions, closed_on) values
    (b, emily, now() - interval '65 days', 'Studio kitchen', 'accident', 'Emily Clarke', 'Minor burn to hand from the kettle while making drinks.', 'Small burn, back of right hand', 'Cooled under running water for 20 minutes; dressing applied.', false, 'closed', 'Kettle was overfilled and spat when boiling.', 'Overfilled kettle', 'Replaced with a hot water tap; added fill line reminder.', d - 60),
    (b, null, now() - interval '9 days', 'Stairwell to first floor', 'near_miss', 'Visiting client', 'Client nearly tripped on a loose stair nosing.', null, null, false, 'investigating', 'Landlord informed the same day.', null, 'Temporary hazard tape applied; chase landlord repair.', null),
    (b, james, now() - interval '30 days', 'Studio', 'incident', 'James Patel', 'Extension lead found overheating under a desk with several chargers plugged in.', null, null, false, 'closed', 'Daisy-chained extension leads.', 'Too many devices on one lead', 'Removed daisy-chained leads; booked PAT testing.', d - 28);

  insert into hub_risks (business_id, hazard, category, who_at_risk, likelihood, severity, existing_controls, further_actions, owner, review_on, status) values
    (b, 'Loss of a key client (over 20% of revenue)', 'financial', 'Business', 3, 4, 'Monthly account reviews; retainer contracts.', 'Grow three new retainer clients this year.', 'Andrew Britain', d + 60, 'open'),
    (b, 'Ransomware or account takeover of client hosting', 'data', 'Clients and their customers', 2, 5, 'Password manager, 2FA, daily off-site backups.', 'Annual penetration test of the hosting set-up.', 'James Patel', d + 12, 'controlled'),
    (b, 'Display screen equipment strain', 'health_safety', 'All staff', 3, 2, 'DSE assessments, adjustable chairs, monitor arms.', 'Offer eye tests to new starters in week one.', 'Sophie Turner', d - 10, 'controlled'),
    (b, 'Key person dependency on the Senior Developer', 'operational', 'Business', 3, 3, 'Documentation of client hosting in the wiki.', 'Train Aisha on deployments; second person on every launch.', 'Andrew Britain', d + 90, 'open'),
    (b, 'Posting unapproved content to a client social account', 'reputational', 'Clients', 2, 4, 'Content calendar approval step.', 'Two-person check for paid campaigns.', 'Sophie Turner', d + 150, 'controlled'),
    (b, 'Late payment by clients affecting cash flow', 'financial', 'Business', 4, 3, 'Deposits on projects; 30-day terms.', 'Automatic reminders from invoicing.', 'Andrew Britain', d + 25, 'open');

  insert into hub_risk_assessments (business_id, title, activity, location, assessed_by, assessed_on, hazards_and_controls, review_on, status) values
    (b, 'Studio general risk assessment', 'Office work', 'Unit 4, The Old Print Works', 'Sophie Turner', d - 340, 'Slips and trips: cables tidied, clear walkways. Electrical: PAT tested annually. Fire: alarms tested weekly, extinguishers serviced, evacuation drill every six months. Kitchen: hot water tap, first aid kit.', d + 25, 'current'),
    (b, 'Display screen equipment', 'Computer work at the studio and at home', 'Studio and homes', 'Sophie Turner', d - 200, 'Individual DSE self-assessments; adjustable chairs and monitor arms; regular breaks; eye tests offered.', d + 165, 'current'),
    (b, 'Client site visits and photo shoots', 'Visiting client premises to photograph and film', 'Client premises', 'Sophie Turner', d - 90, 'Lone working check-in by text; equipment carried in wheeled case; follow client site rules.', d + 275, 'current'),
    (b, 'Hybrid working', 'Working from home', 'Staff homes', 'Sophie Turner', d - 400, 'Home DSE assessment; equipment loaned; wellbeing check-ins.', d - 35, 'current'),
    (b, 'Office move (2023)', 'Moving studio', 'Old premises', 'Andrew Britain', d - 1000, 'Removal firm used for heavy items.', null, 'archived');

  insert into hub_coshh (business_id, product, supplier, hazards, used_for, location, sds_on_file, ppe, controls, first_aid, assessed_on, review_on) values
    (b, 'Multi-surface antibacterial spray', 'Brightside Cleaning Supplies', 'Eye irritant', 'Wiping desks and kitchen surfaces', 'Kitchen cupboard', true, 'Gloves if prolonged use', 'Use in ventilated area; keep away from food.', 'Rinse eyes with water for 15 minutes.', d - 120, d + 245),
    (b, 'Screen and keyboard wipes', 'Northern Office Supplies', 'Flammable (alcohol based)', 'Cleaning screens and keyboards', 'Stationery cupboard', true, 'None', 'Keep away from heat.', 'Rinse skin if irritated.', d - 120, d + 245),
    (b, 'Dishwasher tablets', 'Brightside Cleaning Supplies', 'Causes serious eye damage', 'Kitchen dishwasher', 'Under the sink', false, 'Gloves', 'Store in original packaging, out of reach.', 'Rinse eyes for several minutes; seek medical advice.', d - 380, d - 15),
    (b, 'Compressed air duster', 'TechKit Direct', 'Extremely flammable aerosol; pressurised', 'Cleaning laptops and keyboards', 'IT cupboard', true, 'Safety glasses', 'Use in short bursts, never near heat or flames.', 'Fresh air if inhaled.', d - 60, d + 305);
  select id into coshh_spray from hub_coshh where business_id = b and product = 'Multi-surface antibacterial spray';
  select id into coshh_wipes from hub_coshh where business_id = b and product = 'Screen and keyboard wipes';

  insert into hub_audits (business_id, title, area, frequency, owner, last_done_on, next_due_on, notes) values
    (b, 'Fire alarm test', 'Fire safety', 'monthly', 'Sophie Turner', d - 33, d - 3, null),
    (b, 'Fire extinguisher service', 'Fire safety', 'annual', 'Sophie Turner', d - 350, d + 15, 'Serviced by Leeds Fire Safety Ltd.'),
    (b, 'PAT testing', 'Electrical', 'annual', 'Sophie Turner', d - 330, d + 35, null),
    (b, 'First aid kit check', 'First aid', 'quarterly', 'Sophie Turner', d - 80, d + 10, null),
    (b, 'Access review: client hosting and social accounts', 'Information security', 'quarterly', 'James Patel', d - 95, d - 5, 'Remove leavers, check 2FA on every account.'),
    (b, 'Backup restore test', 'Information security', 'six_monthly', 'James Patel', d - 100, d + 80, null);

  insert into hub_insurance (business_id, kind, insurer, policy_number, cover, premium, start_on, renewal_on, broker) values
    (b, 'professional_indemnity', 'Hiscox', 'PI-4471902', '£1,000,000', 612.00, d - 340, d + 25, 'Direct'),
    (b, 'public_liability', 'Hiscox', 'PL-4471903', '£2,000,000', 198.00, d - 340, d + 25, 'Direct'),
    (b, 'employers_liability', 'Aviva', 'EL-88213401', '£10,000,000', 385.00, d - 200, d + 165, 'Yorkshire Business Insurance'),
    (b, 'cyber', 'CFC Underwriting', 'CY-2239011', '£250,000', 540.00, d - 100, d + 265, 'Yorkshire Business Insurance'),
    (b, 'contents', 'Aviva', 'CT-88213402', '£40,000 (equipment)', 260.00, d - 200, d + 165, 'Yorkshire Business Insurance');

  insert into hub_registrations (business_id, body, reference, registered_on, renewal_on, fee, notes) values
    (b, 'Information Commissioner''s Office (ICO)', 'ZB123456', d - 1400, d + 22, 52.00, 'Tier 1 data protection fee.'),
    (b, 'Companies House confirmation statement', '12345678', d - 1650, d + 70, 34.00, null),
    (b, 'Google Partners', 'GP-99812', d - 500, d + 230, null, null);

  insert into hub_spot_checks (business_id, member_id, checked_on, location, checked_by, outcome, findings, actions, follow_up_on) values
    (b, liam, d - 21, 'Client social accounts', 'Sophie Turner', 'advisory', 'Two client accounts still had an ex-freelancer as admin.', 'Removed access; added to the quarterly access review.', d + 9),
    (b, james, d - 45, 'Client hosting', 'Andrew Britain', 'pass', 'All sites backed up, updated and on 2FA.', null, null),
    (b, null, d - 10, 'Studio clear-desk check', 'Sophie Turner', 'fail', 'Client passwords on a sticky note; two unlocked laptops at lunch.', 'Reminder at team meeting; re-check next week.', d - 3);

  insert into hub_safeguarding (business_id, member_id, raised_on, person_initials, concern_type, description, action_taken, referred_to, referred_on, status) values
    (b, liam, d - 50, 'K.M.', 'self_neglect', 'While moderating a client''s community page, noticed repeated posts from a follower suggesting they were in crisis.', 'Did not reply from the brand account. Told the client, who contacted the person directly with helpline details.', 'Client (account owner)', d - 50, 'closed');

  ---------------------------------------------------------------------------
  -- GDPR toolkit
  ---------------------------------------------------------------------------
  insert into hub_ropa (business_id, data_category, purpose, data_subjects, lawful_basis, special_category, special_condition, source, retention, storage_location, shared_with, security_measures, review_on) values
    (b, 'Staff records', 'Employment, payroll and HR', 'Employees', 'contract', false, null, 'Employees', '6 years after leaving', 'PS Business Hub, Xero', 'Payroll provider, pension provider', 'Role-based access, 2FA', d + 120),
    (b, 'Staff health information', 'Sickness absence and adjustments', 'Employees', 'legal_obligation', true, 'Employment, social security and social protection', 'Employees, fit notes', '6 years after leaving', 'PS Business Hub', 'None', 'Restricted to managers', d + 120),
    (b, 'Client contacts', 'Delivering projects and invoicing', 'Client staff', 'contract', false, null, 'Clients', '6 years after last invoice', 'Google Workspace, Xero', 'Accountant', '2FA, password manager', d + 20),
    (b, 'Client customers'' mailing lists', 'Sending newsletters on the client''s behalf (as processor)', 'Clients'' customers', 'consent', false, null, 'Clients', 'Until the client contract ends', 'Mailchimp', 'None', 'Per-client Mailchimp accounts', d - 12),
    (b, 'Website enquiries', 'Responding to enquiries and bookings', 'Prospective clients', 'legitimate_interests', false, null, 'Website form', '2 years', 'PS Business Hub', 'None', 'Access limited to account managers', d + 200),
    (b, 'Job applicants', 'Recruitment', 'Applicants', 'legitimate_interests', false, null, 'Applicants', '6 months after the role is filled', 'PS Business Hub', 'None', 'Access limited to hiring managers', d + 200);

  insert into hub_processors (business_id, name, service, data_shared, location, transfer_mechanism, dpa_signed, dpa_signed_on, review_on) values
    (b, 'Google Workspace', 'Email, documents and calendars', 'Staff and client contact details, project files', 'adequate_country', 'UK Extension to the EU-US Data Privacy Framework', true, d - 900, d + 100),
    (b, 'Xero', 'Accounting and invoicing', 'Client billing contacts', 'adequate_country', 'UK Extension to the EU-US Data Privacy Framework', true, d - 900, d + 100),
    (b, 'Mailchimp', 'Client newsletters', 'Client customers'' email addresses', 'other', 'International Data Transfer Addendum (IDTA)', true, d - 500, d - 8),
    (b, 'Slack', 'Team messaging', 'Staff names and messages', 'adequate_country', 'UK Extension to the EU-US Data Privacy Framework', true, d - 700, d + 300),
    (b, 'Krystal Hosting', 'Client website hosting', 'Website form submissions', 'uk', null, true, d - 400, d + 330),
    (b, 'Hootsuite', 'Social media scheduling', 'Client social account access', 'eea', null, false, null, d + 14);

  insert into hub_dpias (business_id, project, description, necessity, risks, mitigations, residual_risk, outcome, approved_by, completed_on, review_on) values
    (b, 'Client booking system for a physiotherapy clinic', 'Online booking form that collects appointment reasons, which can include health details.', 'The clinic needs a reason to triage appointments.', 'Health data (special category) sent by email; access by agency staff.', 'Form posts to the clinic''s own encrypted system, not email; agency access removed after launch.', 'low', 'approved', 'Andrew Britain', d - 60, d + 305),
    (b, 'AI-assisted social media replies', 'Trialling an AI tool to draft replies to client community messages.', 'Faster responses for busy hospitality clients.', 'Customer messages sent to a third-party AI provider outside the UK.', 'Only draft, never auto-post; strip names; check provider terms.', 'medium', 'in_progress', null, null, d + 21);

  insert into hub_sars (business_id, requester_name, requester_email, received_on, identity_verified, extended, status, completed_on, notes) values
    (b, 'Former applicant', 'applicant@example.com', d - 18, true, false, 'in_progress', null, 'Wants copies of interview notes.'),
    (b, 'Rachel Green', 'rachel.green@example.com', d - 120, true, false, 'completed', d - 100, 'Former employee; HR file sent securely.');

  insert into hub_breaches (business_id, discovered_at, description, data_affected, individuals_affected, risk_level, ico_reportable, individuals_notified, actions, status) values
    (b, now() - interval '75 days', 'Monthly report for one client emailed to the wrong client contact.', 'Client staff names and campaign figures', 3, 'low', false, true, 'Recipient confirmed deletion; added a second check before sending reports.', 'closed');

  insert into hub_privacy_notices (business_id, audience, title, body, published, review_on) values
    (b, 'customers', 'Privacy notice for clients', 'We use your contact details to deliver the work you have asked us for, to invoice you and to keep you updated about your projects. We keep project records for six years after our last invoice. You can ask for a copy of your data, or for it to be corrected or deleted, by emailing us.', true, d + 180),
    (b, 'staff', 'Privacy notice for staff', 'We hold your personal details, contract, pay, absence and training records to employ you and meet our legal duties. Health information is only seen by managers who need it. We keep your records for six years after you leave.', true, d + 180),
    (b, 'job_applicants', 'Privacy notice for job applicants', 'We use your application to decide whether to invite you to interview and offer you a role. If you are unsuccessful we delete your details six months after the role is filled.', true, d + 180),
    (b, 'website', 'Website privacy and cookies', 'Our website uses essential cookies only, plus privacy-friendly analytics that do not identify you. Enquiries you send us are kept for two years.', false, d + 30);

  ---------------------------------------------------------------------------
  -- Clients
  ---------------------------------------------------------------------------
  insert into hub_clients (business_id, name, contact_name, email, phone, address, status, source, notes) values (b, 'Harbour & Co Coffee', 'Nina Shah', 'nina@example.com', '0113 496 0101', '3 Wharf Street, Leeds', 'active', 'Referral', 'Monthly social retainer plus website care.') returning id into c_harbour;
  insert into hub_clients (business_id, name, contact_name, email, phone, address, status, source, notes) values (b, 'Bloom Florists', 'Rosie Adams', 'rosie@example.com', '0113 496 0102', '41 Kirkgate, Otley', 'active', 'Google search', 'Shopify site rebuild; SEO retainer.') returning id into c_bloom;
  insert into hub_clients (business_id, name, contact_name, email, phone, address, status, source, notes) values (b, 'Northgate Physio', 'Dr Sam Ellis', 'sam@example.com', '0113 496 0103', '8 Northgate, Wakefield', 'active', 'Networking event', 'Booking system and website.') returning id into c_northgate;
  insert into hub_clients (business_id, name, contact_name, email, phone, address, status, source, notes) values (b, 'The Copper Kettle', 'Gareth Jones', 'gareth@example.com', '01904 496 0104', '17 Stonegate, York', 'active', 'Instagram', 'Social media and menu design.') returning id into c_kettle;
  insert into hub_clients (business_id, name, contact_name, email, phone, address, status, source, notes) values (b, 'Ridge Roofing Ltd', 'Paul Ridge', 'paul@example.com', '07700 900301', 'Harrogate', 'lead', 'Website enquiry', 'Wants a new site and Google Ads. Proposal due.') returning id into c_ridge;
  insert into hub_clients (business_id, name, contact_name, email, phone, address, status, source, notes) values (b, 'Oakwood Dental', 'Priya Nair', 'priya@example.com', '0113 496 0106', 'Oakwood, Leeds', 'lead', 'Referral', 'Interested in a brand refresh.') returning id into c_oak;
  insert into hub_clients (business_id, name, contact_name, email, phone, address, status, source, notes) values (b, 'Lumen Yoga Studio', 'Jess Park', 'jess@example.com', '0113 496 0107', 'Headingley, Leeds', 'active', 'Google search', 'Website and class booking integration.') returning id into c_lumen;
  insert into hub_clients (business_id, name, contact_name, email, phone, address, status, source, notes) values (b, 'Fernside Garden Centre', 'Mike Fern', 'mike@example.com', '01423 496 0108', 'Knaresborough', 'former', 'Referral', 'Website project finished; moved hosting in-house.') returning id into c_fern;

  insert into hub_contacts (business_id, name, organisation, email, phone, met_at, met_on, follow_up_on, notes) values
    (b, 'Hannah Blake', 'Leeds Business Network', 'hannah@example.com', '07700 900401', 'Leeds Business Network breakfast', d - 20, d + 4, 'Runs the monthly members'' newsletter; possible sponsorship.'),
    (b, 'Chris Doyle', 'Doyle Accountancy', 'chris@example.com', '07700 900402', 'Referral from Harbour & Co', d - 35, d - 5, 'Refers small business clients who need websites.'),
    (b, 'Amara Osei', 'Yorkshire Food Festival', 'amara@example.com', null, 'Yorkshire Food Festival', d - 60, d + 25, 'Social media for next year''s festival.'),
    (b, 'Ben Clarke', 'Freelance photographer', 'ben@example.com', '07700 900404', 'Photo shoot for Bloom Florists', d - 90, null, 'Reliable, good rates for product photography.'),
    (b, 'Lisa Morgan', 'Harrogate Chamber of Trade', 'lisa@example.com', null, 'Chamber mixer', d - 10, d + 12, 'Invited us to speak about Google Business Profiles.');

  insert into hub_assessments (business_id, client_id, member_id, scheduled_at, kind, status, outcome) values
    (b, c_ridge, tom, now() + interval '2 days' + interval '10 hours', 'Discovery meeting', 'scheduled', null),
    (b, c_oak, tom, now() + interval '9 days' + interval '14 hours', 'Brand workshop', 'scheduled', null),
    (b, c_bloom, emily, now() + interval '16 days' + interval '11 hours', 'Quarterly SEO review', 'scheduled', null),
    (b, c_northgate, james, now() - interval '14 days', 'Booking system go-live check', 'done', 'All test bookings passed; handed over to clinic.'),
    (b, c_harbour, liam, now() - interval '30 days', 'Content planning session', 'done', 'Autumn menu launch campaign agreed.');

  insert into hub_invoices (business_id, client_id, number, issued_on, due_on, status, paid_on, notes) values (b, c_fern, null, d - 200, d - 170, 'paid', d - 168, null) returning id into inv;
  insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price, position) values (b, inv, 'Website build: final payment', 1, 2100, 0);
  insert into hub_invoices (business_id, client_id, number, issued_on, due_on, status, paid_on, notes) values (b, c_harbour, null, d - 62, d - 32, 'paid', d - 35, null) returning id into inv;
  insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price, position) values (b, inv, 'Social media management (monthly retainer)', 1, 650, 0), (b, inv, 'Website care plan', 1, 45, 1);
  insert into hub_invoices (business_id, client_id, number, issued_on, due_on, status, paid_on, notes) values (b, c_bloom, null, d - 50, d - 20, 'paid', d - 22, null) returning id into inv;
  insert into hub_invoices (business_id, client_id, number, issued_on, due_on, status, paid_on, notes) values (b, c_bloom, null, d - 50, d - 20, 'void', null, 'Issued in error; replaced.') returning id into inv;
  insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price, position) values (b, inv, 'Shopify rebuild (duplicate)', 1, 1800, 0);
  select id into inv from hub_invoices where business_id = b and client_id = c_bloom and status = 'paid';
  insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price, position) values (b, inv, 'Shopify rebuild: 50% deposit', 1, 1800, 0);
  insert into hub_invoices (business_id, client_id, number, issued_on, due_on, status, paid_on, notes) values (b, c_northgate, null, d - 40, d - 10, 'sent', null, 'Chased by email.') returning id into inv;
  insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price, position) values (b, inv, 'Booking system build', 1, 2400, 0), (b, inv, 'Staff training session (hours)', 2, 75, 1);
  insert into hub_invoices (business_id, client_id, number, issued_on, due_on, status, paid_on, notes) values (b, c_kettle, null, d - 12, d + 18, 'sent', null, null) returning id into inv;
  insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price, position) values (b, inv, 'Social media management (monthly retainer)', 1, 495, 0), (b, inv, 'Menu design and print artwork', 1, 350, 1);
  insert into hub_invoices (business_id, client_id, number, issued_on, due_on, status, paid_on, notes) values (b, c_harbour, null, d - 2, d + 28, 'sent', null, null) returning id into inv;
  insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price, position) values (b, inv, 'Social media management (monthly retainer)', 1, 650, 0), (b, inv, 'Website care plan', 1, 45, 1), (b, inv, 'Autumn campaign ad spend (passed through)', 1, 300, 2);
  insert into hub_invoices (business_id, client_id, number, issued_on, due_on, status, paid_on, notes) values (b, c_lumen, null, d, d + 30, 'draft', null, null) returning id into inv;
  insert into hub_invoice_lines (business_id, invoice_id, description, quantity, unit_price, position) values (b, inv, 'Class booking integration', 1, 950, 0), (b, inv, 'Hosting (12 months)', 12, 15, 1);

  insert into hub_disputes (business_id, client_id, raised_on, summary, status, resolution, resolved_on) values
    (b, c_northgate, d - 8, 'Client queried the two hours of training on the booking system invoice.', 'open', null, null),
    (b, c_fern, d - 190, 'Disagreement about whether content entry was included in the website quote.', 'resolved', 'Agreed to split the cost 50/50 as a goodwill gesture.', d - 182);

  insert into hub_reviews_public (business_id, client_id, reviewer_name, email, requested_at, rating, comment, submitted_at, approved) values
    (b, c_harbour, 'Nina Shah', 'nina@example.com', now() - interval '90 days', 5, 'Our Instagram has never looked better and we''re seeing new faces in the café every week. Brilliant team.', now() - interval '88 days', true),
    (b, c_bloom, 'Rosie Adams', 'rosie@example.com', now() - interval '60 days', 5, 'The new shop is so much easier to use and online orders have doubled.', now() - interval '57 days', true),
    (b, c_fern, 'Mike Fern', 'mike@example.com', now() - interval '170 days', 4, 'Great website and friendly service. Took a little longer than planned but worth it.', now() - interval '165 days', true),
    (b, c_kettle, 'Gareth Jones', 'gareth@example.com', now() - interval '20 days', 5, 'Beautiful menus and Liam is a star on social.', now() - interval '18 days', false),
    (b, c_northgate, 'Dr Sam Ellis', 'sam@example.com', now() - interval '6 days', null, null, null, false);

  ---------------------------------------------------------------------------
  -- Website and bookings
  ---------------------------------------------------------------------------
  insert into hub_services (business_id, name, description, price, duration, active, position) values (b, 'Website design and build', 'A fast, mobile-friendly website that is easy for you to update, built on WordPress or Shopify.', 'From £1,800', '4 to 6 weeks', true, 0) returning id into s_web;
  insert into hub_services (business_id, name, description, price, duration, active, position) values (b, 'Local SEO', 'Get found on Google Maps and local search: Google Business Profile, reviews and on-page SEO.', 'From £350 a month', 'Monthly', true, 1) returning id into s_seo;
  insert into hub_services (business_id, name, description, price, duration, active, position) values (b, 'Social media management', 'Planning, content and scheduling across Instagram, Facebook and TikTok, with a monthly report.', 'From £450 a month', 'Monthly', true, 2) returning id into s_social;
  insert into hub_services (business_id, name, description, price, duration, active, position) values (b, 'Brand identity', 'Logo, colours, typography and a simple brand guide.', 'From £950', '3 weeks', true, 3) returning id into s_brand;
  insert into hub_services (business_id, name, description, price, duration, active, position) values (b, 'Website care plan', 'Updates, backups, security monitoring and small changes each month.', '£45 a month', 'Monthly', true, 4) returning id into s_care;

  insert into hub_booking_requests (business_id, service_id, customer_name, email, phone, preferred_date, message, status, created_at) values
    (b, s_web, 'Paul Ridge', 'paul@example.com', '07700 900301', d + 2, 'Our roofing website is ten years old. Can you help with a new one and some Google Ads?', 'booked', now() - interval '6 days'),
    (b, s_seo, 'Sarah Kent', 'sarah.kent@example.com', '07700 900501', d + 7, 'We run a dog grooming salon and want to show up on Google Maps.', 'new', now() - interval '1 day'),
    (b, s_brand, 'Priya Nair', 'priya@example.com', '0113 496 0106', d + 9, 'Looking at a refresh of our dental practice brand.', 'contacted', now() - interval '4 days'),
    (b, s_social, 'Tony Russo', 'tony.russo@example.com', null, null, 'Pizzeria opening in November, need social set up from scratch.', 'new', now() - interval '3 hours'),
    (b, s_care, 'Kim Lee', 'kim.lee@example.com', null, null, 'Just need someone to look after our existing site.', 'declined', now() - interval '25 days');

  ---------------------------------------------------------------------------
  -- Payroll Connect
  ---------------------------------------------------------------------------
  insert into hub_pay_details (member_id, business_id, payroll_id, pay_type, rate, ni_number, tax_code, pension_status, pension_enrolled_on, pension_opt_out_on, re_enrolment_on, notes) values
    (owner_id, b, 'P001', 'salary', 52000, 'JT123451B', '1257L', 'enrolled', d - 1600, null, d + 400, null),
    (sophie, b, 'P002', 'salary', 38000, 'JT123452B', '1257L', 'enrolled', d - 1050, null, d + 400, null),
    (james, b, 'P003', 'salary', 42000, 'JT123453B', '1257L', 'enrolled', d - 850, null, d + 400, null),
    (emily, b, 'P004', 'salary', 31000, 'JT123454B', '1257L', 'enrolled', d - 600, null, d + 400, null),
    (liam, b, 'P005', 'hourly', 14.50, 'JT123455B', '1257L', 'opted_out', d - 400, d - 380, d + 400, 'Opted out; re-enrol at the next cycle.'),
    (aisha, b, 'P006', 'salary', 25000, 'JT123456B', 'BR', 'postponed', null, null, null, 'Postponement notice sent; assess after three months.'),
    (tom, b, 'P007', 'salary', 33000, 'JT123457B', '1257L', 'enrolled', d - 280, null, d + 400, null)
  on conflict (member_id) do nothing;
  foreach m in array existing_staff loop
    insert into hub_pay_details (member_id, business_id, payroll_id, pay_type, rate, tax_code, pension_status)
    values (m, b, 'P0' || (10 + array_position(existing_staff, m))::text, 'hourly', 13.00, '1257L', 'not_eligible')
    on conflict (member_id) do nothing;
  end loop;

  insert into hub_payroll_runs (business_id, period_start, period_end, pay_on, exported_on, fps_submitted, payslips_issued, pension_submitted, status, notes) values
    (b, (date_trunc('month', d) - interval '2 months')::date, (date_trunc('month', d) - interval '1 month' - interval '1 day')::date, (date_trunc('month', d) - interval '1 month' - interval '3 days')::date, (date_trunc('month', d) - interval '1 month' - interval '8 days')::date, true, true, true, 'complete', null),
    (b, (date_trunc('month', d) - interval '1 month')::date, (date_trunc('month', d) - interval '1 day')::date, (date_trunc('month', d) - interval '3 days')::date, (date_trunc('month', d) - interval '8 days')::date, true, true, false, 'open', 'Pension contributions still to upload.'),
    (b, date_trunc('month', d)::date, (date_trunc('month', d) + interval '1 month' - interval '1 day')::date, greatest(d + 2, (date_trunc('month', d) + interval '1 month' - interval '3 days')::date), null, false, false, false, 'open', null);

  insert into hub_payroll_queries (business_id, member_id, raised_on, kind, description, status, resolution, resolved_on) values
    (b, liam, d - 6, 'holiday_not_recorded', 'Holiday on the 3rd was paid as unpaid leave.', 'with_provider', null, null),
    (b, aisha, d - 2, 'wrong_tax', 'On emergency tax code BR; P45 from previous employer attached.', 'open', null, null),
    (b, emily, d - 70, 'missing_payslip', 'Could not find last month''s payslip in the portal.', 'resolved', 'Payslip re-issued by the provider.', d - 68);

  ---------------------------------------------------------------------------
  -- Suppliers
  ---------------------------------------------------------------------------
  insert into hub_suppliers (business_id, name, contact_name, email, phone, account_number, payment_terms, approved, notes) values (b, 'Northern Office Supplies', 'Dave Hill', 'orders@example.com', '0113 496 0201', 'MHD-0042', '30 days', true, 'Stationery and kitchen supplies; free delivery over £50.') returning id into sup_office;
  insert into hub_suppliers (business_id, name, contact_name, email, phone, account_number, payment_terms, approved, notes) values (b, 'Brightside Cleaning Supplies', 'Karen Webb', 'karen@example.com', '0113 496 0202', 'BCS-1187', '14 days', true, null) returning id into sup_clean;
  insert into hub_suppliers (business_id, name, contact_name, email, phone, account_number, payment_terms, approved, notes) values (b, 'TechKit Direct', 'Raj Singh', 'raj@example.com', '0161 496 0203', 'TKD-55301', '30 days', true, 'Laptops, monitors and accessories.') returning id into sup_it;
  insert into hub_suppliers (business_id, name, contact_name, email, phone, account_number, payment_terms, approved, notes) values (b, 'PrintHouse Leeds', 'Amy Lord', 'amy@example.com', '0113 496 0204', null, 'Payment on order', true, 'Client print work: menus, flyers, business cards.') returning id into sup_print;
  insert into hub_suppliers (business_id, name, contact_name, email, phone, account_number, payment_terms, approved, notes) values (b, 'Bean There Coffee Roasters', 'Tom Baker', 'hello@example.com', null, null, '30 days', false, 'Trial order pending approval.') returning id into sup_coffee;

  insert into hub_products (business_id, supplier_id, coshh_id, name, sku, unit, unit_price, stock_level, reorder_level) values
    (b, sup_clean, coshh_spray, 'Multi-surface antibacterial spray', 'BCS-MS750', 'bottle', 2.95, 2, 4),
    (b, sup_office, coshh_wipes, 'Screen and keyboard wipes', 'NOS-SW100', 'tub', 4.50, 6, 3),
    (b, sup_office, null, 'A4 printer paper', 'NOS-A4-500', 'ream', 4.20, 3, 5),
    (b, sup_office, null, 'Coffee filter papers', 'NOS-CF100', 'pack', 3.10, 8, 2),
    (b, sup_it, null, 'USB-C charger 65W', 'TKD-65W', 'each', 34.99, 2, 2),
    (b, sup_it, null, '27" monitor', 'TKD-M27', 'each', 189.00, 1, 1),
    (b, sup_coffee, null, 'House blend coffee beans', 'BTC-HB1K', 'kg', 18.50, 1, 2);

  insert into hub_orders (business_id, supplier_id, ordered_on, items, total, status, expected_on, received_on, notes) values
    (b, sup_office, d - 30, 'A4 paper x 10, coffee filters x 5, sticky notes', 68.40, 'received', d - 27, d - 27, null),
    (b, sup_it, d - 4, '27" monitor x 2, USB-C charger x 1 (for new starter)', 412.99, 'ordered', d + 3, null, 'For the new Web Developer.'),
    (b, sup_clean, d - 1, 'Antibacterial spray x 6, dishwasher tablets x 2', 31.60, 'ordered', d + 5, null, null),
    (b, sup_print, d, 'Copper Kettle winter menus x 200', 145.00, 'draft', null, null, 'Waiting for client sign-off on proofs.'),
    (b, sup_coffee, d - 15, 'House blend 2kg trial', 37.00, 'cancelled', null, null, 'Supplier not yet approved.');
end $$;
