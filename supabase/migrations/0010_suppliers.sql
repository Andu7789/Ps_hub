-- Suppliers module: approved wholesalers, the products bought from them
-- (optionally linked to their COSHH entry), and orders.

create table hub_suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  contact_name text,
  email text,
  phone text,
  account_number text,
  payment_terms text,
  approved boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);
select hub_apply_rls('hub_suppliers', 'suppliers');

create table hub_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  supplier_id uuid,
  coshh_id uuid,
  name text not null check (length(trim(name)) > 0),
  sku text,
  unit text,
  unit_price numeric(12, 2) check (unit_price >= 0),
  stock_level numeric(10, 2),
  reorder_level numeric(10, 2),
  created_at timestamptz not null default now(),
  foreign key (supplier_id, business_id) references hub_suppliers(id, business_id) on delete set null (supplier_id),
  foreign key (coshh_id, business_id) references hub_coshh(id, business_id) on delete set null (coshh_id)
);
select hub_apply_rls('hub_products', 'suppliers');

create table hub_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  supplier_id uuid not null,
  ordered_on date not null default current_date,
  items text not null check (length(trim(items)) > 0),
  total numeric(12, 2) check (total >= 0),
  status text not null default 'draft' check (status in ('draft', 'ordered', 'received', 'cancelled')),
  expected_on date,
  received_on date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (supplier_id, business_id) references hub_suppliers(id, business_id) on delete cascade
);
select hub_apply_rls('hub_orders', 'suppliers');
