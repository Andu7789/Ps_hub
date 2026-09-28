"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager, type Membership } from "@/lib/auth";
import { canManageMember, rolesAssignableBy } from "@/lib/permissions";
import { generateMagicLink } from "@/lib/magic-link";
import { sendInviteEmail } from "@/lib/notify";
import { siteOrigin } from "@/lib/site";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/format";
import { field, optionalField, type ActionState } from "@/lib/action-state";
import type { Member, Role } from "@/lib/types";

const roleSchema = z.enum(["owner", "manager", "staff"]);

async function loadManagedMember(actor: Membership, memberId: string): Promise<Member | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hub_members")
    .select("*")
    .eq("id", memberId)
    .eq("business_id", actor.business_id)
    .maybeSingle();
  const member = data as Member | null;
  if (!member || !canManageMember(actor.role, member.role)) return null;
  return member;
}

async function sendInvite(actor: Membership, email: string, name: string): Promise<boolean> {
  try {
    const link = await generateMagicLink(email, "/");
    await sendInviteEmail({
      email,
      name,
      businessName: actor.business.name,
      invitedBy: actor.full_name,
      signInLink: link,
      loginUrl: `${siteOrigin()}/login`,
    });
    return true;
  } catch (err) {
    console.error("Invite email failed", err);
    return false;
  }
}

export async function inviteMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireManager();
  const fullName = field(formData, "full_name");
  const email = z.string().email().safeParse(field(formData, "email").toLowerCase());
  const role = roleSchema.safeParse(field(formData, "role") || "staff");
  if (!fullName) return { error: "Enter their name." };
  if (!email.success) return { error: "Enter a valid email address." };
  if (!role.success || !rolesAssignableBy(actor.role).includes(role.data)) {
    return { error: "You can't add someone with that role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("hub_members").insert({
    business_id: actor.business_id,
    email: email.data,
    full_name: fullName,
    role: role.data,
  });
  if (error) {
    if (error.code === "23505") return { error: `${email.data} is already on your team.` };
    console.error("Invite failed", error);
    return { error: "Couldn't add them. Try again." };
  }

  revalidatePath("/app/staff");
  const sent = await sendInvite(actor, email.data, fullName);
  return sent
    ? { ok: `Invite sent to ${email.data}.` }
    : { ok: `${fullName} was added, but the invite email didn't send. Use "Resend invite" on their page.` };
}

export async function resendInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireManager();
  const member = await loadManagedMember(actor, field(formData, "member_id"));
  if (!member) return { error: "You can't manage this person." };
  if (member.status !== "active") return { error: "They've been marked as left." };
  const sent = await sendInvite(actor, member.email, member.full_name);
  return sent ? { ok: `Invite sent to ${member.email}.` } : { error: "The invite email didn't send. Try again." };
}

export async function updateMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireManager();
  const member = await loadManagedMember(actor, field(formData, "member_id"));
  if (!member) return { error: "You can't manage this person." };

  const fullName = field(formData, "full_name");
  const role = roleSchema.safeParse(field(formData, "role") || member.role);
  if (!fullName) return { error: "Enter their name." };
  if (!role.success || (role.data !== member.role && !rolesAssignableBy(actor.role).includes(role.data))) {
    return { error: "You can't give them that role." };
  }

  const update: { full_name: string; role: Role; email?: string } = { full_name: fullName, role: role.data };
  // The email can only change until they've signed in: after that it's
  // the address their login is tied to.
  const newEmail = field(formData, "email").toLowerCase();
  if (newEmail && newEmail !== member.email) {
    if (member.user_id) return { error: "Their email can't change once they've signed in." };
    if (!z.string().email().safeParse(newEmail).success) return { error: "Enter a valid email address." };
    update.email = newEmail;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("hub_members").update(update).eq("id", member.id);
  if (error) {
    if (error.message.includes("at least one owner")) return { error: "The business needs at least one owner." };
    if (error.code === "23505") return { error: "Someone else on your team already uses that email." };
    return { error: "Couldn't save your changes." };
  }
  revalidatePath("/app/staff");
  return { ok: "Saved." };
}

export async function setMemberStatusAction(formData: FormData) {
  const actor = await requireManager();
  const member = await loadManagedMember(actor, field(formData, "member_id"));
  const status = field(formData, "status");
  if (!member || (status !== "active" && status !== "left")) redirect("/app/staff");
  if (member.id === actor.id) redirect(`/app/staff/${member.id}?error=self`);

  const supabase = await createClient();
  const { error } = await supabase.from("hub_members").update({ status }).eq("id", member.id);
  if (error) redirect(`/app/staff/${member.id}?error=owner`);
  revalidatePath("/app/staff");
  redirect(`/app/staff/${member.id}`);
}

const employmentTypeSchema = z.enum(Object.keys(EMPLOYMENT_TYPE_LABELS) as [keyof typeof EMPLOYMENT_TYPE_LABELS]);

export async function saveStaffProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireManager();
  if (!(await isModuleEnabled(actor.business_id, "staff_hub"))) return { error: "Staff Hub is switched off." };

  // Managers can view and fill in employment details for anyone on the
  // team they can see, including other managers and the owner (RLS allows
  // it) — unlike role changes, this isn't restricted by seniority.
  const supabase = await createClient();
  const memberId = field(formData, "member_id");
  const { data: member } = await supabase
    .from("hub_members")
    .select("id")
    .eq("id", memberId)
    .eq("business_id", actor.business_id)
    .maybeSingle();
  if (!member) return { error: "Couldn't find that person." };

  const employmentType = optionalField(formData, "employment_type");
  if (employmentType && !employmentTypeSchema.safeParse(employmentType).success) {
    return { error: "Pick an employment type." };
  }
  const startDate = optionalField(formData, "start_date");
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { error: "Enter a valid start date." };

  const { error } = await supabase.from("hub_staff_profiles").upsert(
    {
      member_id: member.id,
      business_id: actor.business_id,
      job_title: optionalField(formData, "job_title"),
      employment_type: employmentType,
      start_date: startDate,
      phone: optionalField(formData, "phone"),
      emergency_contact_name: optionalField(formData, "emergency_contact_name"),
      emergency_contact_phone: optionalField(formData, "emergency_contact_phone"),
    },
    { onConflict: "member_id" }
  );
  if (error) {
    console.error("Save profile failed", error);
    return { error: "Couldn't save their details." };
  }
  revalidatePath(`/app/staff/${member.id}`);
  return { ok: "Saved." };
}
