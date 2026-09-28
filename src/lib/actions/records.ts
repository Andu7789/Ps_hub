"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager, requireMember, requireOwner, type Membership } from "@/lib/auth";
import { getRegister } from "@/lib/registers/defs";
import { addMonths, describeDbError, londonToday, parseFields, weekdaysBetween } from "@/lib/registers/values";
import { field, type ActionState } from "@/lib/action-state";
import type { RegisterDef } from "@/lib/registers/types";

async function requireRegisterManager(def: RegisterDef): Promise<Membership> {
  const actor = def.minRole === "owner" ? await requireOwner() : await requireManager();
  if (def.module && !(await isModuleEnabled(actor.business_id, def.module))) redirect("/app/modules");
  return actor;
}

// Fills in anything worked out from the other values before saving.
function completeValues(def: RegisterDef, values: Record<string, unknown>) {
  if (def.key === "absences" && values.days == null && values.start_on && values.end_on) {
    values.days = weekdaysBetween(String(values.start_on), String(values.end_on));
  }
  if (def.key === "pay-details" && typeof values.ni_number === "string") {
    values.ni_number = values.ni_number.replace(/\s/g, "").toUpperCase();
  }
  if (def.key === "pay-details" && typeof values.tax_code === "string") {
    values.tax_code = values.tax_code.replace(/\s/g, "").toUpperCase();
  }
}

// On a new record, a blank optional field is left out so the database
// default applies (an "opened on" date of today, a display order of 0)
// instead of an explicit null.
function withoutBlanks(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null));
}

export async function saveRecordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const def = getRegister(field(formData, "register"));
  if (!def) return { error: "Unknown register." };
  const actor = await requireRegisterManager(def);
  const id = field(formData, "id");
  if (!id && def.noCreate) return { error: `${def.title} can't be added here.` };

  const parsed = parseFields(def, formData, def.fields.map((f) => f.name));
  if (!parsed.values) return { error: parsed.error };
  const values = parsed.values;
  completeValues(def, values);

  const supabase = await createClient();
  const idColumn = def.idColumn ?? "id";
  const result = id
    ? await supabase.from(def.table).update(values).eq(idColumn, id).eq("business_id", actor.business_id).select(idColumn).maybeSingle()
    : await supabase.from(def.table).insert({ ...withoutBlanks(values), business_id: actor.business_id }).select(idColumn).single();
  if (result.error || !result.data) {
    console.error(`Save ${def.key} failed`, result.error);
    if (!id && def.idColumn && result.error?.code === "23505") return { error: "That person already has a record here. Edit it instead." };
    return { error: result.error ? describeDbError(result.error) : "Couldn't find that record." };
  }

  revalidatePath(`/app/r/${def.key}`);
  if (!id) redirect(`/app/r/${def.key}/${(result.data as unknown as Record<string, string>)[idColumn]}?saved=1`);
  return { ok: "Saved." };
}

export async function deleteRecordAction(formData: FormData) {
  const def = getRegister(field(formData, "register"));
  if (!def) redirect("/app");
  const actor = await requireRegisterManager(def);
  const id = field(formData, "id");

  const supabase = await createClient();
  const { error } = await supabase
    .from(def.table)
    .delete()
    .eq(def.idColumn ?? "id", id)
    .eq("business_id", actor.business_id);
  if (error) redirect(`/app/r/${def.key}/${id}?error=delete`);
  revalidatePath(`/app/r/${def.key}`);
  redirect(`/app/r/${def.key}`);
}

// Staff adding a record about themselves: only the fields the register
// allows them, always about their own member record. The database also
// resets anything only a manager may set (hub_self_service_defaults).
export async function staffCreateRecordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const def = getRegister(field(formData, "register"));
  if (!def?.staff?.create || !def.memberField) return { error: "Unknown register." };
  const me = await requireMember();
  if (def.module && !(await isModuleEnabled(me.business_id, def.module))) return { error: "This is switched off." };

  const parsed = parseFields(def, formData, def.staff.create.fields, def.staff.create.options);
  if (!parsed.values) return { error: parsed.error };
  const values = parsed.values;
  completeValues(def, values);
  for (const required of def.fields.filter((f) => f.required && f.name !== def.memberField)) {
    if (values[required.name] == null && !def.staff.create.fields.includes(required.name)) {
      return { error: `${required.label} is required.` };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(def.table)
    .insert({ ...withoutBlanks(values), business_id: me.business_id, [def.memberField]: me.id });
  if (error) {
    console.error(`Staff create ${def.key} failed`, error);
    return { error: describeDbError(error) };
  }
  revalidatePath(`/me/r/${def.key}`);
  revalidatePath("/me");
  return { ok: def.staff.read ? "Sent. You can see it below." : "Sent to your manager. Thank you." };
}

// Records an audit as done today and moves its next date on by its
// frequency.
export async function markAuditDoneAction(formData: FormData) {
  const def = getRegister("audits")!;
  const actor = await requireRegisterManager(def);
  const id = field(formData, "id");
  const supabase = await createClient();
  const { data } = await supabase.from("hub_audits").select("frequency").eq("id", id).eq("business_id", actor.business_id).maybeSingle();
  if (!data) redirect("/app/r/audits");

  const months = { monthly: 1, quarterly: 3, six_monthly: 6, annual: 12 }[data.frequency as string] ?? 12;
  const today = londonToday();
  await supabase
    .from("hub_audits")
    .update({ last_done_on: today, next_due_on: addMonths(today, months) })
    .eq("id", id)
    .eq("business_id", actor.business_id);
  revalidatePath("/app/r/audits");
  // `v` makes the edit form below remount with the new dates, rather than
  // keeping the old ones on screen for the next save to write back.
  redirect(`/app/r/audits/${id}?saved=1&v=${Date.now()}`);
}

export async function acknowledgeSupervisionAction(formData: FormData) {
  await requireMember();
  const supabase = await createClient();
  await supabase.rpc("hub_acknowledge_supervision", { target: field(formData, "id") });
  revalidatePath("/me/r/supervisions");
  redirect("/me/r/supervisions");
}

export async function toggleOnboardingTaskAction(formData: FormData) {
  await requireMember();
  const supabase = await createClient();
  await supabase.rpc("hub_complete_onboarding_task", {
    target: field(formData, "id"),
    is_done: field(formData, "done") === "true",
  });
  revalidatePath("/me/r/onboarding");
  redirect("/me/r/onboarding");
}
