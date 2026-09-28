"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_BUSINESS_COOKIE, requireOwner, requireUser } from "@/lib/auth";
import { getModule, isModuleKey } from "@/lib/modules";
import { field, optionalField, type ActionState } from "@/lib/action-state";

export async function createBusinessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const businessName = field(formData, "business_name");
  const ownerName = field(formData, "owner_name");
  if (!businessName) return { error: "Enter your business name." };
  if (!ownerName) return { error: "Enter your name." };

  const supabase = await createClient();
  const { data: businessId, error } = await supabase.rpc("hub_create_business", {
    business_name: businessName,
    owner_name: ownerName,
  });
  if (error || !businessId) {
    console.error("Create business failed", error);
    return { error: "We couldn't create your business. Try again." };
  }

  // Every new business starts with Staff Hub on, so there's something to
  // use straight away. The owner can switch it off on the Modules page.
  await supabase.from("hub_business_modules").insert({ business_id: businessId, module_key: "staff_hub" });

  (await cookies()).set(CURRENT_BUSINESS_COOKIE, businessId as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/app");
}

export async function setModuleEnabledAction(formData: FormData) {
  const owner = await requireOwner();
  const key = field(formData, "module_key");
  const enabled = field(formData, "enabled") === "true";
  if (!isModuleKey(key) || !getModule(key).available) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("hub_business_modules")
    .upsert(
      { business_id: owner.business_id, module_key: key, enabled, updated_at: new Date().toISOString() },
      { onConflict: "business_id,module_key" }
    );
  if (error) throw new Error("Couldn't update the module");
  revalidatePath("/", "layout");
}

export async function updateBusinessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireOwner();
  const name = field(formData, "name");
  const brandColor = field(formData, "brand_color");
  if (!name) return { error: "Enter a business name." };
  if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) return { error: "Pick a brand colour." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("hub_businesses")
    .update({ name, brand_color: brandColor, contact_email: optionalField(formData, "contact_email") })
    .eq("id", owner.business_id);
  if (error) return { error: "Couldn't save your changes." };
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}
