# PS Business Hub

A back-office portal for small businesses: one login per business, a core every business gets, and add-on modules switched on or off as needed. Separate from the PS Clean booking app (`ps_cleaner`); nothing here touches its code or data.

The first module is **Staff Hub**: employment details per staff member, and policies staff read and sign. See `ROADMAP.md` for what's built and what's next, and `DECISIONS.md` for why things are the way they are.

## How it fits together

- **Business**: a company using the Hub. Anyone can sign in and create one; they become its owner.
- **Members**: everyone in a business. Owners manage everything, managers manage staff, staff see their own details and policies. Invited by email; the invite links to their login the first time they sign in.
- **Modules**: `src/lib/modules.ts` lists them. The owner switches them on at `/app/modules`. Switching one off hides its data (enforced by the database, not just the menu) without deleting it.
- **Sign-in**: email magic links only, no passwords.

| Path | Who | What |
| --- | --- | --- |
| `/app` | Owners, managers | Overview, staff, policies, modules, settings |
| `/me` | Everyone | Their own details, policies to read and sign |
| `/start` | Signed in, no business yet | Create a business |

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
4. Under Authentication > URL Configuration, set the Site URL to where the Hub is hosted.

## Scripts

- `pnpm dev`: dev server
- `pnpm test`: unit tests (Vitest)
- `pnpm test:db`: runs every migration and the row-level security tests in `supabase/tests/` against a throwaway local Postgres (needs Postgres installed, not Docker)
- `pnpm type-check`: `tsc --noEmit`
- `pnpm lint`: ESLint
- `pnpm build`: production build
