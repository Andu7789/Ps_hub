# Architecture Decisions

Each entry: the decision, why, and how reversible it is.

---

## 1. Its own repo, its own Supabase project, hub_-prefixed tables

**Decision:** The Hub is a separate app from PS Clean's booking platform (`ps_cleaner`), in its own repo, with its own deploy. It should get its own Supabase project. Every table and function is still `hub_`-prefixed.

**Why:** The Hub holds sensitive employee records (contracts, sickness, grievances as modules arrive). Keeping them in a project apart from PS Clean's customer data keeps GDPR access and breach scope simple, and means a Hub change can never break live bookings. The prefix is a fallback: if a second Supabase project isn't wanted (the free plan limits how many you can have), the Hub can live in the shared project PS Clean uses with no name clashes, the same way `PS_CLEAN_` tables do.

**Reversibility:** High. Moving between a shared and dedicated project is a dump and restore of the `hub_*` tables.

---

## 2. Business chosen by membership, not by web address

**Decision:** Unlike PS Clean (which resolves the business from the request's host name), the Hub works out the business from who is signed in: their `hub_members` rows. Someone in more than one business picks one from a switcher; the choice is kept in a cookie.

**Why:** The Hub is a portal people log into, not a public website customers visit, so there's no pre-login page that needs per-business branding. This avoids a subdomain and DNS setup for every client. The cookie is only a preference: every query is still checked by row-level security, so a tampered cookie can only pick a business the person already belongs to.

**Reversibility:** High. Host-based branding for the login page could be added later without changing the data model.

---

## 3. Access rules live in the database

**Decision:** Every rule (who sees which members, who can edit policies, what happens when a module is off) is enforced with Postgres row-level security and a few `SECURITY DEFINER` functions. The app checks the same rules too, but only to hide buttons and give clear messages.

**Why:** Server actions can be called directly with a crafted request, so a check that only lives in the page is not a check. The rules are covered by `supabase/tests/rls_test.sql` (`pnpm test:db`), which acts as an owner, a manager, a staff member, someone from another business and an anonymous visitor.

Notable rules:
- Staff see only their own member record. Managers see the whole business.
- Managers can add and edit staff but not managers or owners. Only owners change roles upward.
- A business always keeps at least one active owner (trigger `hub_keep_an_owner`).
- Marking someone as left removes their access immediately; their records stay.
- The service role key is used only to create sign-in links. Creating a business (`hub_create_business`) and linking invites (`hub_claim_invites`) are database functions that use the signed-in user's own identity.

**Reversibility:** Medium. Changing a rule is a new migration plus a test.

---

## 4. Modules switch off by hiding, never deleting

**Decision:** `hub_business_modules` holds one row per business per module. Switching off sets `enabled = false`. Each module's policies check `hub_module_enabled(business_id, key)`, so its data disappears from every query, but stays in the database.

**Why:** A business that pauses a module and comes back loses nothing, and "hidden" is enforced by the database rather than just the menu. Until paid billing exists, the owner switches modules freely. When Stripe billing is added, that write should move to the billing webhook (service role) and the owner write policy should be dropped.

**Reversibility:** High.

---

## 5. Policy signatures are permanent, versioned records

**Decision:** Editing a policy's title or text bumps its version (trigger `hub_policies_bump_version`), and only a signature on the current version counts. Signatures are created only through `hub_sign_policy()`, which records the version in force at that moment, and there are no update or delete permissions on them.

**Why:** The point of a sign-off is proof of who agreed to which wording and when. Doing the versioning in the database means it can't be skipped by any code path. Staff tick a confirmation box and type their name, which is recorded alongside the time.

Deleting a policy isn't offered (it would cascade away the signatures). Unpublishing hides it from staff instead.

**Reversibility:** Medium.

---

## 6. Sign-in is PS Clean's magic-link flow, copied

**Decision:** Same approach as `ps_cleaner` (its DECISIONS.md #9 and the fix described in its `confirmSignInAction`): links are generated with `auth.admin.generateLink()` and emailed by the Hub itself through Resend, and the link lands on a page that needs a button click before the token is used.

**Why:** Both were learned the hard way in PS Clean: Supabase's built-in email template is project-wide, and email scanners that open links would spend the single-use token before the person clicked. Unlike PS Clean, the Hub runs on Vercel only, so it keeps a `src/proxy.ts` to refresh sessions (PS Clean dropped its proxy for Cloudflare compatibility).

One difference from PS Clean: the link carries `type=email`, not `type=magiclink`. For an address that has never signed in, `generateLink({ type: "magiclink" })` creates the user and issues a sign-up confirmation token, and verifying that as `magiclink` fails with "One-time token not found". Found by the end-to-end browser test against a real Supabase auth server; `email` verifies both kinds. Every invitee is a first-time user, so this matters most here.

Without `RESEND_API_KEY`, development mode prints emails to the console instead of failing.

**Reversibility:** High.

---

## 7. Most modules are "registers" driven by one definition file

**Decision:** 38 of the module screens (training records, risks, insurance, subject access requests, clients, timesheets…) are described as data in `src/lib/registers/defs.ts`: table, fields, list columns, which dates are "due", what counts as closed, and what staff may see or submit. One set of pages (`/app/r/[register]`, `/me/r/[register]`) and one set of actions (`src/lib/actions/records.ts`) render and save all of them. Anything that isn't a plain list-and-form (invoices, the public website, payroll export, contract issuing, the training matrix, the risk matrix, file uploads) has its own page.

**Why:** Seven modules as hand-built pages would have been several times the code, each with its own bugs. A new register is a table in a migration plus an entry in `defs.ts`. `src/lib/registers/values.test.ts` checks every definition is consistent (field names, due fields, references), which caught two registers sharing a URL key.

**Safety:** table and column names only ever come from the definitions, never from the request. Form values are checked against each field's type; read-only fields (worked-out scores and deadlines) are never taken from a form. The database has the final say through row-level security.

**Reversibility:** High. Any register can be given its own page later without changing its table.

---

## 8. One helper applies the standard access rules to every module table

**Decision:** `hub_apply_rls(table, module, min_role, staff_read_own, staff_insert_own)` (migration 0003) creates the same policies on every module table: managers (or owners only, for pay data) manage records while the module is on; optionally staff read their own records; optionally staff add records about themselves. For staff-submitted rows, the trigger `hub_self_service_defaults` resets anything only a manager may set (a holiday request always lands as "requested", an incident report without investigation notes). Staff never get update or delete permission: acknowledging a supervision, ticking an onboarding task or signing a contract are narrow database functions.

References between tables are composite `(id, business_id)` foreign keys, so a record can never point at a person or client in another business, even if a request is tampered with.

Confidential logs (employee relations cases, safeguarding) let staff raise a concern but never read the log back. Pay details are owner-only; staff can read their own.

**Tested by** `supabase/tests/rls_modules_test.sql` (`pnpm test:db`).

**Reversibility:** Medium.

---

## 9. Policies are shared by three modules

**Decision:** The policy library (decision #5) is open while any of Staff Hub, Compliance or GDPR is on (`hub_policies_enabled`), with a category per policy, since each of those modules needs its own policy suite and they shouldn't be three separate libraries.

---

## 10. Files are private; access follows the database row

**Decision:** Uploaded files go to a private Storage bucket (`hub-documents`) that only the server's service role touches. Each file has a row in `hub_documents`, protected by the standard rules (managers see the business's files, staff see files about themselves). Opening a file (`/files/[id]`) first reads that row as the signed-in person; only if that works does the server hand out a one-minute signed link. There are no `storage.objects` policies to keep in step. Files are limited to 4MB because Vercel limits a request to 4.5MB.

**Reversibility:** High.

---

## 11. Public pages go through database functions, not table access

**Decision:** The Website module's public page, booking requests, job adverts and applications, review links and published privacy notices are served to anonymous visitors through `SECURITY DEFINER` functions (`hub_public_site`, `hub_request_booking`, `hub_apply_for_job`, `hub_submit_review`…) that return or accept exactly what that page needs, and only for a business with the module on and (for the site) published. The anonymous key has no table access at all.

Public forms have a hidden honeypot field to turn away simple bots. There is no rate limiting yet; if spam becomes a problem, add Vercel's firewall rate limiting or a CAPTCHA.

A business's own domain is served by `src/proxy.ts`: a request on a domain other than the Hub's own is looked up (`hub_slug_for_domain`) and rewritten to that business's `/s/<slug>` pages. The domain still has to be added to the Vercel project and its DNS pointed at Vercel by hand.

**Reversibility:** High.

---

## 12. Payroll prepares; the provider runs it

**Decision:** Payroll Connect keeps pay details, pension status, timesheets, pay queries and a checklist per pay run, and exports a CSV per pay period (approved hours; holiday, sick and other leave days in the period; pay rate, tax code, NI number). It does not calculate tax or NI or file anything with HMRC: that needs HMRC-recognised payroll software, which the business's provider runs from the export. Bank details are deliberately not stored. The CSV neutralises cells starting with `=`, `+`, `-` or `@` so a spreadsheet can't run them as formulas.

**Reversibility:** High.

---

## 13. Testing without the hosted services

Docker Hub rate-limited this environment, so the full `supabase start` stack couldn't be pulled. The browser tests ran instead against local Postgres 16, Supabase's real auth server (GoTrue) and PostgREST release binaries, a small Node proxy standing in for the API gateway, and an in-memory stand-in for Storage (upload, signed link, download, delete). That exercises the real sign-in, RLS and database functions. File storage on a real Supabase project is the one piece only tested against the stand-in.
