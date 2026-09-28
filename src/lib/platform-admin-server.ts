import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail, monthlyValue, pricesFromRows, type Prices } from "@/lib/platform-admin";

// Everything under /admin, and every admin action, calls this first. Anyone
// else gets a plain 404, so the page doesn't reveal that it exists.
export async function requirePlatformAdmin() {
  const user = await getUser();
  if (!user || !isPlatformAdminEmail(user.email)) notFound();
  return user;
}

export type AdminMember = {
  id: string;
  business_id: string;
  full_name: string;
  email: string;
  role: "owner" | "manager" | "staff";
  status: "active" | "left";
  user_id: string | null;
  created_at: string;
};

export type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  created_at: string;
  website_published: boolean;
  custom_domain: string | null;
  owner: AdminMember | null;
  activeMembers: number;
  signedIn: number;
  modules: string[];
  excluded: boolean;
  note: string | null;
  monthly: number;
  // What it would pay if it weren't excluded.
  listPrice: number;
};

// Reads across every business with the service-role client, so it checks
// for the platform admin itself: a layout's check doesn't guard its pages,
// which render in parallel with it.
export async function loadPlatform(): Promise<{ businesses: AdminBusiness[]; members: AdminMember[]; prices: Prices }> {
  await requirePlatformAdmin();
  const db = createServiceClient();
  const [businesses, members, modules, prices, flags] = await Promise.all([
    db.from("hub_businesses").select("id, name, slug, contact_email, created_at, website_published, custom_domain").order("created_at", { ascending: false }),
    db.from("hub_members").select("id, business_id, full_name, email, role, status, user_id, created_at").order("created_at"),
    db.from("hub_business_modules").select("business_id, module_key").eq("enabled", true),
    db.from("hub_module_prices").select("price_key, monthly_price"),
    db.from("hub_admin_business_flags").select("business_id, exclude_from_revenue, note"),
  ]);
  const failed = [businesses, members, modules, prices, flags].find((r) => r.error);
  if (failed?.error) throw new Error(`Platform admin read failed: ${failed.error.message}`);

  const priceTable = pricesFromRows(prices.data ?? []);
  const allMembers = (members.data ?? []) as AdminMember[];
  const flagsById = new Map((flags.data ?? []).map((f) => [f.business_id as string, f]));
  const modulesById = new Map<string, string[]>();
  for (const row of modules.data ?? []) {
    const list = modulesById.get(row.business_id) ?? [];
    list.push(row.module_key);
    modulesById.set(row.business_id, list);
  }

  const result = (businesses.data ?? []).map((b) => {
    const team = allMembers.filter((m) => m.business_id === b.id && m.status === "active");
    const enabled = modulesById.get(b.id) ?? [];
    const flag = flagsById.get(b.id);
    const excluded = Boolean(flag?.exclude_from_revenue);
    return {
      ...b,
      owner: team.find((m) => m.role === "owner") ?? null,
      activeMembers: team.length,
      signedIn: team.filter((m) => m.user_id).length,
      modules: enabled,
      excluded,
      note: (flag?.note as string | null) ?? null,
      monthly: monthlyValue(enabled, priceTable, excluded),
      listPrice: monthlyValue(enabled, priceTable),
    } as AdminBusiness;
  });

  return { businesses: result, members: allMembers, prices: priceTable };
}
