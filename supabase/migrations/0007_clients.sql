-- Clients module: client list, assessments, invoicing, disputes, and a
-- networking contacts log.

create table hub_clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  contact_name text,
  email text,
  phone text,
  address text,
  status text not null default 'lead' check (status in ('lead', 'active', 'former')),
  source text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);
select hub_apply_rls('hub_clients', 'clients');

-- Assessments (site visits, quotes, care assessments…). Staff can see the
-- ones they're booked to carry out.
create table hub_assessments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  client_id uuid not null,
  member_id uuid,
  scheduled_at timestamptz not null,
  kind text,
  status text not null default 'scheduled' check (status in ('scheduled', 'done', 'cancelled')),
  outcome text,
  created_at timestamptz not null default now(),
  foreign key (client_id, business_id) references hub_clients(id, business_id) on delete cascade,
  foreign key (member_id, business_id) references hub_members(id, business_id) on delete set null (member_id)
);
select hub_apply_rls('hub_assessments', 'clients', 'manager', true, false);

create table hub_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  client_id uuid not null,
  number text not null,
  issued_on date not null default current_date,
  due_on date not null default (current_date + 30),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  paid_on date,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, number),
  unique (id, business_id),
  foreign key (client_id, business_id) references hub_clients(id, business_id) on delete restrict
);
select hub_apply_rls('hub_invoices', 'clients');

-- INV-0001, INV-0002… per business. The advisory lock serialises two
-- invoices created at the same moment so they can't take the same number.
create or replace function hub_invoices_number()
returns trigger
language plpgsql as $$
declare
  n integer;
begin
  if new.number is not null and length(trim(new.number)) > 0 then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('hub_invoices:' || new.business_id::text));
  select coalesce(max((regexp_match(number, '^INV-(\d+)$'))[1]::integer), 0) + 1 into n
  from hub_invoices where business_id = new.business_id;
  new.number := 'INV-' || lpad(n::text, 4, '0');
  return new;
end;
$$;
create trigger hub_invoices_number before insert on hub_invoices
  for each row execute function hub_invoices_number();

create table hub_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  invoice_id uuid not null,
  description text not null check (length(trim(description)) > 0),
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(14, 2) generated always as (round(quantity * unit_price, 2)) stored,
  position integer not null default 0,
  foreign key (invoice_id, business_id) references hub_invoices(id, business_id) on delete cascade
);
select hub_apply_rls('hub_invoice_lines', 'clients');

create table hub_disputes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  client_id uuid not null,
  raised_on date not null default current_date,
  summary text not null check (length(trim(summary)) > 0),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text,
  resolved_on date,
  created_at timestamptz not null default now(),
  foreign key (client_id, business_id) references hub_clients(id, business_id) on delete cascade
);
select hub_apply_rls('hub_disputes', 'clients');

create table hub_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  organisation text,
  email text,
  phone text,
  met_at text,
  met_on date,
  follow_up_on date,
  notes text,
  created_at timestamptz not null default now()
);
select hub_apply_rls('hub_contacts', 'clients');
