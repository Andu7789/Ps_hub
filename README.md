# PS Business Hub

A back-office portal for small businesses: one login per business, a core every business gets, and add-on modules switched on or off as needed. Separate from the PS Clean booking app (`ps_cleaner`); nothing here touches its code or data.

Seven modules: **Staff Hub**, **Compliance & Safety**, **GDPR Toolkit**, **Clients**, **Website & Bookings**, **Payroll Connect** and **Suppliers**. See `ROADMAP.md` for what each one does and what's next, and `DECISIONS.md` for why things are the way they are.

Most module screens are "registers" described in `src/lib/registers/defs.ts` and rendered by one set of pages (DECISIONS.md #7). To add one: a table in a new migration (use `hub_apply_rls`, #8), then an entry in `defs.ts`.

## How it fits together

- **Business**: a company using the Hub. Anyone can sign in and create one; they become its owner.
- **Members**: everyone in a business. Owners manage everything, managers manage staff, staff see their own details and policies. Invited by email; the invite links to their login the first time they sign in.
- **Modules**: `src/lib/modules.ts` lists them. The owner switches them on at `/app/modules`. Switching one off hides its data (enforced by the database, not just the menu) without deleting it.
- **Sign-in**: email magic links only, no passwords.

| Path | Who | What |
| --- | --- | --- |
| `/app` | Owners, managers | Overview of what's due, staff, a home page per module (`/app/m/<module>`), registers (`/app/r/<register>`), invoices, files, policies, settings |
| `/me` | Everyone | Their own details, things to sign, onboarding, their records, requests (holiday, incidents, timesheets…) |
| `/start` | Signed in, no business yet | Create a business |
| `/s/<slug>` | Public | A business's website, booking form, jobs and privacy notice |
| `/review/<token>` | Public | Leave a review from an emailed link |

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase keys
pnpm dev
```

Without `RESEND_API_KEY`, emails (including sign-in links) are printed in the terminal running `pnpm dev`, so you can sign in locally before email is set up.

To run a local Supabase instead of a hosted one (needs Docker):

```bash
npx supabase start           # applies supabase/migrations
npx supabase status          # prints the URL and keys for .env.local
```

## Setting up a hosted Supabase project

1. Create a project at supabase.com (a dedicated one is recommended, see `DECISIONS.md` #1).
2. Run each file in `supabase/migrations/` in order, in the SQL editor, or link the project and run `npx supabase db push`.
3. Copy the project URL, anon key and service role key into `.env.local` (and into Vercel's environment variables when deploying).
4. Dedicated project only: under Authentication > URL Configuration, set the Site URL to where the Hub is hosted. In a shared project leave it alone, since it belongs to the other apps; the Hub doesn't need it, because it builds its own sign-in links (DECISIONS.md #6).
5. Check Storage has a private bucket called `hub-documents` (migration 0003 creates it).

## Deploying on Vercel

Set the variables in `.env.example`, including `CRON_SECRET`: `vercel.json` schedules the daily reminder email at 07:00 UTC and Vercel sends that secret with it. For a business using its own domain, add the domain to the Vercel project and point its DNS at Vercel; the Hub then shows that business's public page on it.

## Scripts

- `pnpm dev`: dev server
- `pnpm test`: unit tests (Vitest)
- `pnpm test:db`: runs every migration and the row-level security tests in `supabase/tests/` against a throwaway local Postgres (needs Postgres installed, not Docker). About 90 checks acting as owners, managers, staff, other businesses and anonymous visitors
- `pnpm type-check`: `tsc --noEmit`
- `pnpm lint`: ESLint
- `pnpm build`: production build
