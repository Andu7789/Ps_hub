# Roadmap

The plan behind this is the "PS Business Hub — Portal & Add-on Modules" document: one portal, a free core, paid modules switched on and off.

## Built

**Core**
- [x] Sign in by email link, no passwords
- [x] Create a business (you become the owner)
- [x] Invite people by email as staff, manager or owner
- [x] Staff directory with roles, "invite pending", and "mark as left"
- [x] Switch between businesses if you belong to more than one
- [x] Modules page: switch modules on and off
- [x] Business settings: name, contact email, brand colour

**Staff Hub (first slice)**
- [x] Employment details per person: job title, type, start date, phone, emergency contact
- [x] Policy library: write, publish, unpublish
- [x] Staff read and sign policies (tick box + typed name, time-stamped)
- [x] Editing a policy's wording makes a new version that everyone signs again
- [x] Sign-off sheet per policy, and per-person policy status

## Next for Staff Hub

- [ ] Onboarding checklists per new starter (ID, right to work, DBS, bank details, induction)
- [ ] Documents: upload and store contracts and certificates per person
- [ ] Contract and job description templates filled in from a person's details (templates checked by an employment solicitor first)
- [ ] Training matrix with certificate expiry reminders
- [ ] Supervision and spot-check forms that work on a phone
- [ ] Sickness and absence log, return-to-work forms, Bradford Factor, holiday balances
- [ ] Performance reviews and improvement plans
- [ ] Employee relations case log (grievances, disciplinaries)
- [ ] Reminder emails for unsigned policies and expiring training

## Platform

- [ ] Stripe billing per module (move module switching to the billing webhook, see DECISIONS.md #4)
- [ ] Logo upload (the `logo_url` column exists; no upload UI yet)
- [ ] Deploy to Vercel with its own domain

## Later modules

Compliance & Safety, GDPR Toolkit, Clients, Website & Bookings, Payroll Connect, Suppliers. Each is listed as "coming soon" on the Modules page.
