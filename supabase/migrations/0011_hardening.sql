-- Tightening from Supabase's security advisor after the first deploy.

-- Pin the search path of the helper and trigger functions that didn't set
-- one, so an object someone creates in another schema can never be
-- picked up in their place.
alter function hub_policies_bump_version() set search_path = public;
alter function hub_touch_updated_at() set search_path = public;
alter function hub_apply_rls(text, text, text, boolean, boolean) set search_path = public;
alter function hub_self_service_defaults() set search_path = public;
alter function hub_slugify(text) set search_path = public;
alter function hub_businesses_default_slug() set search_path = public;
alter function hub_absences_self_service() set search_path = public;
alter function hub_er_cases_staff_kinds() set search_path = public;
alter function hub_issued_documents_freeze_signed() set search_path = public;
alter function hub_invoices_number() set search_path = public;

-- The permission checks used inside access rules are for signed-in users.
-- Anonymous visitors only ever reach the Hub through the public functions
-- (public site, jobs, booking, reviews, privacy notices), which run as
-- their owner and don't need these grants.
revoke execute on function hub_member_role(uuid) from public, anon;
revoke execute on function hub_is_member_of(uuid) from public, anon;
revoke execute on function hub_is_manager_of(uuid) from public, anon;
revoke execute on function hub_is_owner_of(uuid) from public, anon;
revoke execute on function hub_module_enabled(uuid, text) from public, anon;
revoke execute on function hub_my_member_id(uuid) from public, anon;
revoke execute on function hub_policies_enabled(uuid) from public, anon;
grant execute on function hub_member_role(uuid) to authenticated;
grant execute on function hub_is_member_of(uuid) to authenticated;
grant execute on function hub_is_manager_of(uuid) to authenticated;
grant execute on function hub_is_owner_of(uuid) to authenticated;
grant execute on function hub_module_enabled(uuid, text) to authenticated;
grant execute on function hub_my_member_id(uuid) to authenticated;
grant execute on function hub_policies_enabled(uuid) to authenticated;

-- Trigger functions are never called directly.
revoke execute on function hub_keep_an_owner() from public, anon, authenticated;
revoke execute on function hub_staff_profile_business_matches() from public, anon, authenticated;
