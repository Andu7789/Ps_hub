import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager, requireOwner, type Membership } from "@/lib/auth";
import { getRegister } from "@/lib/registers/defs";
import { loadLookups } from "@/lib/registers/data";
import type { RegisterDef } from "@/lib/registers/types";
import type { Lookups } from "@/lib/registers/values";

// Everything a manager-side register page needs, after checking the
// register exists, the module is on and the person may manage it.
export async function loadRegisterPage(key: string): Promise<{
  def: RegisterDef;
  actor: Membership;
  lookups: Lookups;
  memberChoices: { value: string; label: string }[];
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const def = getRegister(key);
  if (!def) notFound();
  const actor = def.minRole === "owner" ? await requireOwner() : await requireManager();
  if (def.module && !(await isModuleEnabled(actor.business_id, def.module))) redirect("/app/modules");

  const supabase = await createClient();
  const [lookups, { data: members }] = await Promise.all([
    loadLookups(supabase, actor.business_id, def),
    supabase.from("hub_members").select("id, full_name").eq("business_id", actor.business_id).eq("status", "active").order("full_name"),
  ]);
  const memberChoices = (members ?? []).map((m) => ({ value: m.id as string, label: m.full_name as string }));
  return { def, actor, lookups, memberChoices, supabase };
}
