-- Website & Bookings module: a public page per business listing its
-- services and approved reviews, a booking request form, and review
-- collection by emailed link.

create table hub_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  price text,
  duration text,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);
select hub_apply_rls('hub_services', 'website');

create table hub_booking_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  service_id uuid,
  customer_name text not null check (length(trim(customer_name)) > 0),
  email text,
  phone text,
  preferred_date date,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'booked', 'declined')),
  created_at timestamptz not null default now(),
  foreign key (service_id, business_id) references hub_services(id, business_id) on delete set null (service_id)
);
select hub_apply_rls('hub_booking_requests', 'website');

-- A review starts as a request (a random token emailed to the customer)
-- and becomes a review when they submit it. It's shown publicly only once
-- a manager approves it.
create table hub_reviews_public (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references hub_businesses(id) on delete cascade,
  client_id uuid,
  reviewer_name text not null check (length(trim(reviewer_name)) > 0),
  email text,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  requested_at timestamptz not null default now(),
  rating integer check (rating between 1 and 5),
  comment text,
  submitted_at timestamptz,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (client_id, business_id) references hub_clients(id, business_id) on delete set null (client_id)
);
select hub_apply_rls('hub_reviews_public', 'website');

-- Everything the public site shows, in one call, and only for a business
-- that has the module on and its site published.
create or replace function hub_public_site(business_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'business', jsonb_build_object(
      'name', b.name, 'slug', b.slug, 'tagline', b.tagline, 'about', b.about, 'phone', b.phone,
      'email', b.contact_email, 'address', b.address, 'brand_color', b.brand_color, 'logo_url', b.logo_url
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'description', s.description,
                                          'price', s.price, 'duration', s.duration) order by s.position, s.name)
      from hub_services s where s.business_id = b.id and s.active
    ), '[]'::jsonb),
    'reviews', coalesce((
      -- First name only: that's what the review form tells customers.
      select jsonb_agg(jsonb_build_object('name', split_part(trim(r.reviewer_name), ' ', 1), 'rating', r.rating, 'comment', r.comment,
                                          'submitted_at', r.submitted_at) order by r.submitted_at desc)
      from hub_reviews_public r where r.business_id = b.id and r.approved and r.submitted_at is not null
    ), '[]'::jsonb),
    'jobs', hub_module_enabled(b.id, 'staff_hub') and exists (
      select 1 from hub_vacancies v where v.business_id = b.id and v.status = 'open'
        and (v.closing_on is null or v.closing_on >= current_date)
    ),
    'privacy_notice_id', (
      select n.id from hub_privacy_notices n
      where n.business_id = b.id and n.published and n.audience in ('customers', 'website')
        and hub_module_enabled(b.id, 'gdpr')
      order by n.updated_at desc limit 1
    )
  )
  from hub_businesses b
  where b.slug = business_slug and b.website_published and hub_module_enabled(b.id, 'website');
$$;

create or replace function hub_request_booking(
  business_slug text, target_service uuid, name text, customer_email text, customer_phone text,
  preferred date, note text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  biz uuid;
begin
  select id into biz from hub_businesses
  where slug = business_slug and website_published and hub_module_enabled(id, 'website');
  if biz is null then
    raise exception 'Not found' using errcode = 'P0002';
  end if;
  if name is null or length(trim(name)) = 0 then
    raise exception 'Name is required' using errcode = '23514';
  end if;
  if coalesce(nullif(trim(customer_email), ''), nullif(trim(customer_phone), '')) is null then
    raise exception 'An email or phone number is required' using errcode = '23514';
  end if;
  if target_service is not null and not exists (
    select 1 from hub_services where id = target_service and business_id = biz and active
  ) then
    target_service := null;
  end if;
  insert into hub_booking_requests (business_id, service_id, customer_name, email, phone, preferred_date, message)
  values (biz, target_service, left(trim(name), 200), lower(left(nullif(trim(customer_email), ''), 320)),
          left(nullif(trim(customer_phone), ''), 50), preferred, left(nullif(trim(note), ''), 5000));
end;
$$;

-- What the review page needs to show before submission: whose review it
-- is and for which business. Nothing else about the request leaks.
create or replace function hub_review_request(review_token text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('business', b.name, 'brand_color', b.brand_color, 'reviewer_name', r.reviewer_name,
                            'submitted', r.submitted_at is not null)
  from hub_reviews_public r join hub_businesses b on b.id = r.business_id
  where r.token = review_token and hub_module_enabled(b.id, 'website');
$$;

create or replace function hub_submit_review(review_token text, stars integer, review_comment text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if stars is null or stars not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5' using errcode = '23514';
  end if;
  update hub_reviews_public
  set rating = stars, comment = left(nullif(trim(review_comment), ''), 3000), submitted_at = now()
  where token = review_token and submitted_at is null and hub_module_enabled(business_id, 'website');
  if not found then
    raise exception 'This review link has already been used or is not valid' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function hub_public_site(text) to anon, authenticated;
grant execute on function hub_request_booking(text, uuid, text, text, text, date, text) to anon, authenticated;
grant execute on function hub_review_request(text) to anon, authenticated;
grant execute on function hub_submit_review(text, integer, text) to anon, authenticated;
