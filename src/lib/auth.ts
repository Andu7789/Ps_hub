import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isManagerRole } from "@/lib/permissions";
import type { ModuleKey } from "@/lib/modules";
import type { Business, Member } from "@/lib/types";

// Which business a person is working in, when they belong to more than
// one (an owner running two companies, or someone PS Clean manages on
// behalf of several clients). Just a preference — every read is still
// checked by RLS, so a tampered cookie can only pick a business the user
// already belongs to.
export const CURRENT_BUSINESS_COOKIE = "hub_business";

export type Membership = Member & { business: Business };

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("hub_members")
    .select("*, business:hub_businesses(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");
  return (data ?? []) as Membership[];
});

export const getCurrentMembership = cache(async (): Promise<Membership | null> => {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;
  const chosen = (await cookies()).get(CURRENT_BUSINESS_COOKIE)?.value;
  return memberships.find((m) => m.business_id === chosen) ?? memberships[0];
});

export async function requireMember(): Promise<Membership> {
  await requireUser();
  const membership = await getCurrentMembership();
  if (!membership) redirect("/start");
  return membership;
}

export async function requireManager(): Promise<Membership> {
  const membership = await requireMember();
  if (!isManagerRole(membership.role)) redirect("/me");
  return membership;
}

export async function requireOwner(): Promise<Membership> {
  const membership = await requireMember();
  if (membership.role !== "owner") redirect("/app");
  return membership;
}

export const getEnabledModules = cache(async (businessId: string): Promise<Set<ModuleKey>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hub_business_modules")
    .select("module_key")
    .eq("business_id", businessId)
    .eq("enabled", true);
  return new Set((data ?? []).map((r) => r.module_key as ModuleKey));
});

export async function isModuleEnabled(businessId: string, key: ModuleKey): Promise<boolean> {
  return (await getEnabledModules(businessId)).has(key);
}
