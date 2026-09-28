import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModuleKey } from "@/lib/modules";
import type { OnboardingCounts } from "@/lib/onboarding";

const ZERO: OnboardingCounts = {
  activeMembers: 0,
  publishedPolicies: 0,
  riskAssessments: 0,
  publishedPrivacyNotices: 0,
  clients: 0,
  services: 0,
  payDetails: 0,
  suppliers: 0,
};

async function count(supabase: SupabaseClient, table: string, businessId: string, extra?: Record<string, unknown>): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true }).eq("business_id", businessId);
  for (const [column, value] of Object.entries(extra ?? {})) query = query.eq(column, value);
  const { count: n } = await query;
  return n ?? 0;
}

// Only counts what a switched-on module's checklist step needs, so a
// business that hasn't enabled compliance never queries hub_risks. Reuses
// the members and published-policies counts the overview page already has,
// since it fetches both anyway.
export async function loadOnboardingCounts(
  supabase: SupabaseClient,
  businessId: string,
  enabled: Set<ModuleKey>,
  activeMembers: number,
  publishedPolicies: number
): Promise<OnboardingCounts> {
  const [riskAssessments, publishedPrivacyNotices, clients, services, payDetails, suppliers] = await Promise.all([
    enabled.has("compliance") ? count(supabase, "hub_risk_assessments", businessId) : Promise.resolve(0),
    enabled.has("gdpr") ? count(supabase, "hub_privacy_notices", businessId, { published: true }) : Promise.resolve(0),
    enabled.has("clients") ? count(supabase, "hub_clients", businessId) : Promise.resolve(0),
    enabled.has("website") ? count(supabase, "hub_services", businessId) : Promise.resolve(0),
    enabled.has("payroll") ? count(supabase, "hub_pay_details", businessId) : Promise.resolve(0),
    enabled.has("suppliers") ? count(supabase, "hub_suppliers", businessId) : Promise.resolve(0),
  ]);
  return { ...ZERO, activeMembers, publishedPolicies, riskAssessments, publishedPrivacyNotices, clients, services, payDetails, suppliers };
}
