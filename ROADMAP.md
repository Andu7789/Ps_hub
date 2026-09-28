# Roadmap

The plan behind this is the "PS Business Hub — Portal & Add-on Modules" document: one portal, a free core, paid modules switched on and off.

## Built

**Core (every business)**
- [x] Sign in by email link, no passwords
- [x] Create a business, invite staff, managers and owners, mark people as left
- [x] Switch between businesses; modules page to switch each module on and off
- [x] Settings: name, contact email, brand colour, leave year
- [x] Files: upload contracts, ID, DBS, certificates, insurance documents, safety data sheets (private, with expiry dates)
- [x] Overview of everything due or overdue in the next 30 days, across all modules
- [x] Daily reminder email to owners and managers (`/api/cron/reminders`, Vercel Cron)

**Staff Hub**
- [x] Employment details and holiday allowance per person
- [x] Recruitment: vacancies, public jobs page and application form, applicants and stages, "add to team"
- [x] Onboarding checklist (standard list in one click), staff tick their own tasks
- [x] Contract, job description and offer letter templates with placeholders; issue to a person; they read and sign
- [x] Policy library with versioned read-and-sign
- [x] Training records, training matrix with expiry colours, competency sign-offs
- [x] Supervisions and staff spot checks, acknowledged by the staff member
- [x] Absence and holiday: staff request holiday and report sickness; approvals; return-to-work; Bradford Factor; holiday balance
- [x] Performance reviews and improvement plans
- [x] Employee relations cases (concerns, grievances, disciplinaries), confidential
- [x] Benefits

**Compliance & Safety**
- [x] Risk register with 5×5 risk matrix, and written risk assessments
- [x] COSHH register
- [x] Accident and incident log with investigation; any staff member can report
- [x] Safeguarding concerns log; staff can raise, not read
- [x] Audit and review calendar with "mark done" rolling the next date
- [x] Quality spot checks, insurance, vehicles (MOT, tax, insurance, service), driver licence checks, registrations with regulators

**GDPR Toolkit**
- [x] Data map (record of processing) including special category data
- [x] Processor register
- [x] Subject access requests with the one-month (or extended) deadline worked out
- [x] Breach log with the 72-hour ICO deadline
- [x] DPIAs
- [x] Privacy notices, drafted from the data map, published with a public link

**Clients**
- [x] Clients and leads, assessments, disputes, networking contacts with follow-up dates
- [x] Invoices: numbered, lines, email to client, sent / paid / void, overdue tracking, print or save as PDF

**Website & Bookings**
- [x] Public page with services and approved reviews
- [x] Booking request form
- [x] Review requests by email; customers leave a star rating; approve before it shows
- [x] Printable A4 flyer
- [x] Own domain support (needs adding to Vercel and DNS by hand)

**Payroll Connect**
- [x] Pay details (owner only), pension status and re-enrolment dates
- [x] Timesheets submitted by staff, approved by managers
- [x] Pay problems raised by staff
- [x] Pay run checklist
- [x] CSV export per pay period for the payroll provider

**Suppliers**
- [x] Suppliers, products with stock and reorder levels (linked to COSHH), orders

## Next

- [ ] Stripe billing per module (move module switching to the billing webhook, see DECISIONS.md #4)
- [ ] Logo upload (the `logo_url` column exists; no upload UI yet)
- [ ] Deploy: new Supabase project, Vercel project, Resend sending domain, `CRON_SECRET`
- [ ] Have the starter contract templates and any policy wording checked by an employment solicitor
- [ ] Rate limiting on public forms if spam appears
- [ ] Payment links on invoices and bookings (Stripe)
- [ ] Emailing staff when something is issued to them or their holiday is approved
- [ ] Executive strategy reviews and marketing (social media) stay as PS Clean services, not software
