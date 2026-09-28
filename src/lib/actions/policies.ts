"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager, requireMember } from "@/lib/auth";
import { field, type ActionState } from "@/lib/action-state";

async function requireStaffHubManager() {
  const actor = await requireManager();
  if (!(await isModuleEnabled(actor.business_id, "staff_hub"))) redirect("/app/modules");
  return actor;
}

export async function createPolicyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaffHubManager();
  const title = field(formData, "title");
  const body = field(formData, "body");
  if (!title) return { error: "Give the policy a title." };
  if (!body) return { error: "Write the policy text." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hub_policies")
    .insert({ business_id: actor.business_id, title, body })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save the policy." };
  revalidatePath("/app/policies");
  redirect(`/app/policies/${data.id}`);
}

export async function updatePolicyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaffHubManager();
  const title = field(formData, "title");
  const body = field(formData, "body");
  if (!title) return { error: "Give the policy a title." };
  if (!body) return { error: "Write the policy text." };

  // The database bumps the version when the wording changes, which asks
  // everyone to sign again (hub_policies_bump_version).
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hub_policies")
    .update({ title, body })
    .eq("id", field(formData, "policy_id"))
    .eq("business_id", actor.business_id)
    .select("version")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save the policy." };
  revalidatePath("/app/policies");
  revalidatePath("/me");
  return { ok: `Saved as version ${data.version}.` };
}

export async function setPolicyPublishedAction(formData: FormData) {
  const actor = await requireStaffHubManager();
  const policyId = field(formData, "policy_id");
  const supabase = await createClient();
  await supabase
    .from("hub_policies")
    .update({ is_published: field(formData, "published") === "true" })
    .eq("id", policyId)
    .eq("business_id", actor.business_id);
  revalidatePath("/app/policies");
  revalidatePath("/me");
  redirect(`/app/policies/${policyId}`);
}

export async function signPolicyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireMember();
  const policyId = field(formData, "policy_id");
  const typedName = field(formData, "signed_name");
  if (!typedName) return { error: "Type your full name to sign." };
  if (field(formData, "confirm") !== "on") return { error: "Tick the box to confirm you've read it." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("hub_sign_policy", { target_policy: policyId, typed_name: typedName });
  if (error) {
    console.error("Sign policy failed", error);
    return { error: "Couldn't record your signature. Refresh and try again." };
  }
  revalidatePath("/me");
  revalidatePath(`/app/policies/${policyId}`);
  redirect(`/me/policies/${policyId}?signed=1`);
}
