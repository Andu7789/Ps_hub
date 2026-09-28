-- Platform admin (the Hub's operator, not a business owner): module prices
-- and per-business notes, used by /admin to show every business and what
-- it would be paying. See DECISIONS.md #14.
--
-- Nobody reaches these tables through the API: RLS is on with no policies
-- and the grants are revoked, so only the server's service-role client
-- reads or writes them, and only after checking SUPERADMIN_EMAILS.

create table hub_module_prices (
  -- 'base' is the flat fee every business pays; the rest match
  -- hub_business_modules.module_key.
  price_key text primary key check (price_key in ('base', 'staff_hub', 'compliance', 'gdpr', 'clients', 'website', 'payroll', 'suppliers')),
  monthly_price numeric(10, 2) not null default 0 check (monthly_price >= 0),
  updated_at timestamptz not null default now()
);

-- Starting prices only; changed at /admin/prices.
insert into hub_module_prices (price_key, monthly_price) values
  ('base', 10),
  ('staff_hub', 29),
  ('compliance', 19),
  ('gdpr', 15),
  ('clients', 19),
  ('website', 15),
  ('payroll', 12),
  ('suppliers', 9);

create table hub_admin_business_flags (
  business_id uuid primary key references hub_businesses(id) on delete cascade,
  -- Test, demo and free accounts still show in the list but don't count
  -- towards revenue.
  exclude_from_revenue boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);

create trigger hub_module_prices_touch
  before update on hub_module_prices
  for each row execute function hub_touch_updated_at();
create trigger hub_admin_business_flags_touch
  before update on hub_admin_business_flags
  for each row execute function hub_touch_updated_at();

alter table hub_module_prices enable row level security;
alter table hub_admin_business_flags enable row level security;
revoke all on hub_module_prices from public, anon, authenticated;
revoke all on hub_admin_business_flags from public, anon, authenticated;
