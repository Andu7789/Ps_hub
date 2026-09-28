-- Row-level security tests: acts as each kind of user in turn and checks
-- what they can and can't see or change. Run with `pnpm test:db`.

-- Only failures are printed.
\o /dev/null

\set owner   '11111111-1111-1111-1111-111111111111'
\set manager '22222222-2222-2222-2222-222222222222'
\set staff   '33333333-3333-3333-3333-333333333333'
\set outsider '44444444-4444-4444-4444-444444444444'

create schema test;
grant usage on schema test to authenticated, anon;

create function test.act_as(uid uuid, email text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'email', email)::text, false);
$$;

-- Runs a statement and fails the test unless it errors.
create function test.expect_error(stmt text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    return;
  end;
  raise exception 'FAIL: expected an error: %', label;
end;
$$;

create function test.expect(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then
    raise exception 'FAIL: %', label;
  end if;
end;
$$;

grant execute on all functions in schema test to authenticated, anon;

insert into auth.users (id, email) values
  (:'owner', 'owner@a.test'), (:'manager', 'manager@a.test'),
  (:'staff', 'staff@a.test'), (:'outsider', 'owner@b.test');

set role authenticated;

-- Two separate businesses, each created by its own owner.
select test.act_as(:'owner', 'owner@a.test');
select hub_create_business('Business A', 'Olive Owner') as biz_a \gset
select test.act_as(:'outsider', 'owner@b.test');
select hub_create_business('Business B', 'Oscar Outsider') as biz_b \gset

-- Owner invites a manager and a staff member, switches Staff Hub on.
select test.act_as(:'owner', 'owner@a.test');
insert into hub_members (business_id, email, full_name, role) values
  (:'biz_a', 'manager@a.test', 'Mo Manager', 'manager'),
  (:'biz_a', 'staff@a.test', 'Sam Staff', 'staff');
insert into hub_business_modules (business_id, module_key) values (:'biz_a', 'staff_hub');

-- Invites link on first sign-in.
select test.act_as(:'manager', 'manager@a.test');
select test.expect(hub_claim_invites() = 1, 'manager claims their invite');
select test.act_as(:'staff', 'staff@a.test');
select test.expect(hub_claim_invites() = 1, 'staff claims their invite');
select test.expect(hub_claim_invites() = 0, 'claiming twice links nothing new');

-- Who can see whom.
select test.expect((select count(*) from hub_members) = 1, 'staff see only their own member row');
select test.act_as(:'manager', 'manager@a.test');
select test.expect((select count(*) from hub_members) = 3, 'manager sees everyone in their business');
select test.act_as(:'outsider', 'owner@b.test');
select test.expect((select count(*) from hub_members where business_id = :'biz_a') = 0, 'other business sees none of A''s staff');
select test.expect((select count(*) from hub_businesses) = 1, 'other business sees only its own business');
select test.expect_error(format('insert into hub_members (business_id, email, full_name) values (%L, %L, %L)', :'biz_a', 'sneak@b.test', 'Sneak'), 'outsider cannot add staff to A');

-- What a manager may change.
select test.act_as(:'manager', 'manager@a.test');
select test.expect_error(format('insert into hub_members (business_id, email, full_name, role) values (%L, %L, %L, %L)', :'biz_a', 'm2@a.test', 'Second Manager', 'manager'), 'manager cannot create managers');
insert into hub_members (business_id, email, full_name) values (:'biz_a', 'new@a.test', 'New Starter');
select test.expect_error(format('update hub_members set role = %L where email = %L', 'manager', 'staff@a.test'), 'manager cannot promote staff');
update hub_members set role = 'staff' where email = 'owner@a.test'; -- silently matches nothing
select test.expect((select role from hub_members where email = 'owner@a.test') = 'owner', 'manager cannot demote the owner');

-- The last owner can't be removed or demoted.
select test.act_as(:'owner', 'owner@a.test');
select test.expect_error(format('update hub_members set role = %L where email = %L', 'manager', 'owner@a.test'), 'last owner cannot demote themselves');
select test.expect_error(format('update hub_members set status = %L where email = %L', 'left', 'owner@a.test'), 'last owner cannot leave');

-- Staff can't change modules; owner can.
select test.act_as(:'manager', 'manager@a.test');
update hub_business_modules set enabled = false where business_id = :'biz_a';
select test.expect(hub_module_enabled(:'biz_a', 'staff_hub'), 'manager cannot switch modules off');

-- Policies: drafts are hidden from staff until published.
insert into hub_policies (business_id, title, body) values (:'biz_a', 'Health and safety', 'Wear gloves.')
  returning id as policy \gset
select test.act_as(:'staff', 'staff@a.test');
select test.expect((select count(*) from hub_policies) = 0, 'staff cannot see a draft');
select test.expect_error(format('select hub_sign_policy(%L, %L)', :'policy', 'Sam Staff'), 'staff cannot sign a draft');

select test.act_as(:'manager', 'manager@a.test');
update hub_policies set is_published = true where id = :'policy';
select test.expect((select version from hub_policies where id = :'policy') = 1, 'publishing does not bump the version');

select test.act_as(:'staff', 'staff@a.test');
select test.expect((select count(*) from hub_policies) = 1, 'staff see a published policy');
update hub_policies set body = 'No gloves needed.' where id = :'policy';
select test.expect((select body from hub_policies where id = :'policy') = 'Wear gloves.', 'staff cannot edit a policy');
select hub_sign_policy(:'policy', 'Sam Staff');
select hub_sign_policy(:'policy', 'Sam Staff');
select test.expect((select count(*) from hub_policy_signatures) = 1, 'signing twice keeps one signature');
select test.expect_error(format(
  'insert into hub_policy_signatures (business_id, policy_id, policy_version, member_id, signed_name) select %L, %L, 99, id, %L from hub_members',
  :'biz_a', :'policy', 'Forged'), 'staff cannot write a signature directly');
-- No update/delete policies: these silently match nothing.
update hub_policy_signatures set signed_name = 'Changed';
delete from hub_policy_signatures;
select test.expect((select signed_name from hub_policy_signatures) = 'Sam Staff', 'signatures cannot be edited or deleted');

-- Changing the wording is a new version that needs signing again.
select test.act_as(:'manager', 'manager@a.test');
update hub_policies set body = 'Wear gloves and goggles.' where id = :'policy';
select test.expect((select version from hub_policies where id = :'policy') = 2, 'editing the wording bumps the version');
select test.act_as(:'staff', 'staff@a.test');
select hub_sign_policy(:'policy', 'Sam Staff');
select test.expect((select count(*) from hub_policy_signatures where policy_version = 2) = 1, 'staff sign the new version');
select test.expect((select count(*) from hub_policy_signatures) = 2, 'old signature kept as history');

-- Other businesses can't see or sign it.
select test.act_as(:'outsider', 'owner@b.test');
select test.expect((select count(*) from hub_policies) = 0, 'other business cannot see A''s policies');
select test.expect_error(format('select hub_sign_policy(%L, %L)', :'policy', 'Oscar'), 'other business cannot sign A''s policy');

-- Staff profiles.
select test.act_as(:'manager', 'manager@a.test');
insert into hub_staff_profiles (member_id, business_id, job_title)
  select id, business_id, 'Cleaner' from hub_members where email = 'staff@a.test';
select test.act_as(:'staff', 'staff@a.test');
select test.expect((select job_title from hub_staff_profiles) = 'Cleaner', 'staff see their own profile');
select test.expect((select count(*) from hub_staff_profiles) = 1, 'staff see only their own profile');
select test.act_as(:'outsider', 'owner@b.test');
insert into hub_business_modules (business_id, module_key) values (:'biz_b', 'staff_hub');
reset role;
select id as a_manager_member from hub_members where email = 'manager@a.test' \gset
set role authenticated;
select test.act_as(:'outsider', 'owner@b.test');
select test.expect_error(format('insert into hub_staff_profiles (member_id, business_id) values (%L, %L)', :'a_manager_member', :'biz_b'),
  'cannot attach a profile to another business''s member');

-- Switching the module off hides its data; switching it on brings it back.
select test.act_as(:'owner', 'owner@a.test');
update hub_business_modules set enabled = false where business_id = :'biz_a' and module_key = 'staff_hub';
select test.expect((select count(*) from hub_policies) = 0, 'module off hides policies');
select test.expect((select count(*) from hub_staff_profiles) = 0, 'module off hides profiles');
select test.act_as(:'staff', 'staff@a.test');
select test.expect_error(format('select hub_sign_policy(%L, %L)', :'policy', 'Sam Staff'), 'cannot sign with module off');
select test.act_as(:'owner', 'owner@a.test');
update hub_business_modules set enabled = true where business_id = :'biz_a' and module_key = 'staff_hub';
select test.expect((select count(*) from hub_policies) = 1, 'module on shows policies again');
select test.expect((select count(*) from hub_policy_signatures) = 2, 'signatures survived the module being off');

-- Someone who has left loses access straight away.
update hub_members set status = 'left' where email = 'staff@a.test';
select test.act_as(:'staff', 'staff@a.test');
select test.expect((select count(*) from hub_policies) = 0, 'leavers see no policies');
select test.expect_error(format('select hub_sign_policy(%L, %L)', :'policy', 'Sam Staff'), 'leavers cannot sign');

-- Anonymous visitors see nothing and can't create businesses.
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select test.expect((select count(*) from hub_businesses) = 0, 'anon sees no businesses');
reset role;
set role anon;
do $$ begin
  perform hub_create_business('Spam', 'Spammer');
  raise exception 'FAIL: anon created a business';
exception when insufficient_privilege then null;
end $$;

-- Deleting a business takes everything with it (the last-owner guard
-- must not block this).
reset role;
delete from hub_businesses where id = :'biz_a';
select test.expect((select count(*) from hub_members where business_id = :'biz_a') = 0, 'business delete cascades');
