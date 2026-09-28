"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/platform-admin-server";
import { PRICE_KEYS } from "@/lib/platform-admin";
import { field, optionalField, type ActionState } from "@/lib/action-state";

export async function updatePricesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePlatformAdmin();

  const rows = [];
  for (const { key, name } of PRICE_KEYS) {
    const raw = field(formData, key).replace(/^£/, "");
    const price = Number(raw);
    if (raw === "" || !Number.isFinite(price) || price < 0 || price > 100000) {
      return { error: `Enter a monthly price for ${name} (0 or more).` };
    }
    rows.push({ price_key: key, monthly_price: Math.round(price * 100) / 100 });
  }

  const { error } = await createServiceClient().from("hub_module_prices").upsert(rows, { onConflict: "price_key" });
  if (error) {
    console.error("Update prices failed", error);
    return { error: "We couldn't save the prices. Try again." };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Prices saved." };
}

export async function updateBusinessFlagsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePlatformAdmin();
  const businessId = field(formData, "business_id");
  if (!businessId) return { error: "Business not found." };

  const { error } = await createServiceClient()
    .from("hub_admin_business_flags")
    .upsert(
      {
        business_id: businessId,
        exclude_from_revenue: formData.get("exclude_from_revenue") === "on",
        note: optionalField(formData, "note"),
      },
      { onConflict: "business_id" }
    );
  if (error) {
    console.error("Update business flags failed", error);
    return { error: "We couldn't save that. Try again." };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}
