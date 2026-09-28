"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager, requireMember, type Membership } from "@/lib/auth";
import { generateMagicLink } from "@/lib/magic-link";
import { escapeHtml, sendEmail, sendInviteEmail } from "@/lib/notify";
import { renderTemplate, STANDARD_ONBOARDING_TASKS, STARTER_TEMPLATES } from "@/lib/templates";
import { draftPrivacyNotice, type ProcessorEntry, type RopaEntry } from "@/lib/privacy";
import { addDays, londonToday } from "@/lib/registers/values";
import { siteOrigin } from "@/lib/site";
import { field, type ActionState } from "@/lib/action-state";
import type { ModuleKey } from "@/lib/modules";

async function requireModuleManager(module: ModuleKey): Promise<Membership> {
  const actor = await requireManager();
  if (!(await isModuleEnabled(actor.business_id, module))) redirect("/app/modules");
  return actor;
}

// Turns an applicant into a team member: invites them by email, records
// their job title from the vacancy, and marks them hired.
export async function hireApplicantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireModuleManager("staff_hub");
  const supabase = await createClient();
  const { data: applicant } = await supabase
    .from("hub_applicants")
    .select("*, vacancy:hub_vacancies(title)")
    .eq("id", field(formData, "id"))
    .eq("business_id", actor.business_id)
    .maybeSingle();
  if (!applicant) return { error: "Applicant not found." };
  if (!applicant.email) return { error: "Add their email address first." };

  const { data: member, error } = await supabase
    .from("hub_members")
    .insert({ business_id: actor.business_id, email: String(applicant.email).toLowerCase(), full_name: applicant.full_name, role: "staff" })
    .select("id")
    .single();
  if (error || !member) {
    return { error: error?.code === "23505" ? "Someone with that email is already on your team." : "Couldn't add them to the team." };
  }
  await supabase.from("hub_staff_profiles").insert({
    member_id: member.id,
    business_id: actor.business_id,
    job_title: (applicant.vacancy as { title?: string } | null)?.title ?? null,
  });
  await supabase.from("hub_onboarding_tasks").insert(
    STANDARD_ONBOARDING_TASKS.map((task) => ({ business_id: actor.business_id, member_id: member.id, task }))
  );
  await supabase.from("hub_applicants").update({ stage: "hired" }).eq("id", applicant.id);

  try {
    await sendInviteEmail({
      email: applicant.email,
      name: applicant.full_name,
      businessName: actor.business.name,
      invitedBy: actor.full_name,
      signInLink: await generateMagicLink(applicant.email, "/"),
      loginUrl: `${siteOrigin()}/login`,
    });
  } catch (err) {
    console.error("Hire invite failed", err);
  }
  revalidatePath("/app/staff");
  redirect(`/app/staff/${member.id}`);
}

export async function addStandardOnboardingAction(formData: FormData) {
  const actor = await requireModuleManager("staff_hub");
  const memberId = field(formData, "member_id");
  const supabase = await createClient();
  const today = londonToday();
  await supabase.from("hub_onboarding_tasks").insert(
    STANDARD_ONBOARDING_TASKS.map((task) => ({
      business_id: actor.business_id,
      member_id: memberId,
      task,
      due_on: addDays(today, 14),
    }))
  );
  revalidatePath(`/app/staff/${memberId}`);
  redirect(`/app/staff/${memberId}`);
}

export async function addStarterTemplatesAction() {
  const actor = await requireModuleManager("staff_hub");
  const supabase = await createClient();
  await supabase.from("hub_templates").insert(STARTER_TEMPLATES.map((t) => ({ ...t, business_id: actor.business_id })));
  revalidatePath("/app/r/templates");
  redirect("/app/r/templates");
}

// Issues a template to one person: fills in their details and freezes
// the result as their own document.
export async function issueDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireModuleManager("staff_hub");
  const supabase = await createClient();
  const [{ data: template }, { data: member }] = await Promise.all([
    supabase.from("hub_templates").select("*").eq("id", field(formData, "template_id")).eq("business_id", actor.business_id).maybeSingle(),
    supabase
      .from("hub_members")
      .select("*, profile:hub_staff_profiles(job_title, employment_type, start_date)")
      .eq("id", field(formData, "member_id"))
      .eq("business_id", actor.business_id)
      .maybeSingle(),
  ]);
  if (!template) return { error: "Template not found." };
  if (!member) return { error: "Choose who to issue it to." };

  const profile = (Array.isArray(member.profile) ? member.profile[0] : member.profile) as
    | { job_title: string | null; employment_type: null; start_date: string | null }
    | null;
  const body = renderTemplate(template.body, {
    full_name: member.full_name,
    email: member.email,
    job_title: profile?.job_title,
    employment_type: profile?.employment_type,
    start_date: profile?.start_date,
    business_name: actor.business.name,
    today: londonToday(),
  });
  const { data: issued, error } = await supabase
    .from("hub_issued_documents")
    .insert({
      business_id: actor.business_id,
      member_id: member.id,
      kind: template.kind,
      title: template.title,
      body,
      requires_signature: formData.get("requires_signature") === "on",
    })
    .select("id")
    .single();
  if (error || !issued) return { error: "Couldn't issue the document." };
  redirect(`/app/r/issued-documents/${issued.id}?saved=1`);
}

export async function signIssuedDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireMember();
  const typedName = field(formData, "signed_name");
  if (!typedName) return { error: "Type your full name to sign." };
  if (field(formData, "confirm") !== "on") return { error: "Tick the box to confirm you've read it." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("hub_sign_issued_document", { target: field(formData, "id"), typed_name: typedName });
  if (error) return { error: "Couldn't record your signature. Refresh and try again." };
  revalidatePath("/me");
  redirect(`/me/documents/${field(formData, "id")}?signed=1`);
}

export async function emailReviewLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireModuleManager("website");
  const supabase = await createClient();
  const { data: review } = await supabase
    .from("hub_reviews_public")
    .select("*")
    .eq("id", field(formData, "id"))
    .eq("business_id", actor.business_id)
    .maybeSingle();
  if (!review) return { error: "Review request not found." };
  if (!review.email) return { error: "Add their email address first." };
  if (review.submitted_at) return { error: "They've already left their review." };

  const link = `${siteOrigin()}/review/${review.token}`;
  const name = escapeHtml(actor.business.name);
  try {
    await sendEmail(
      review.email,
      `How did we do? A quick review for ${actor.business.name}`,
      `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
        <h1 style="font-size: 18px;">${name}</h1>
        <p>Hi ${escapeHtml(review.reviewer_name)},</p>
        <p>Thank you for choosing ${name}. Would you take a minute to tell us how we did?</p>
        <p><a href="${link}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600;">Leave a review</a></p>
      </div>`
    );
  } catch (err) {
    console.error("Review email failed", err);
    return { error: "The email didn't send. Try again, or copy the link instead." };
  }
  return { ok: `Sent to ${review.email}.` };
}

export async function generatePrivacyNoticeAction(formData: FormData) {
  const actor = await requireModuleManager("gdpr");
  const audience = field(formData, "audience");
  if (!["customers", "staff", "job_applicants", "website"].includes(audience)) redirect("/app/r/privacy-notices");
  const supabase = await createClient();
  const [{ data: ropa }, { data: processors }] = await Promise.all([
    supabase.from("hub_ropa").select("*").eq("business_id", actor.business_id).order("data_category"),
    supabase.from("hub_processors").select("name, service, location").eq("business_id", actor.business_id).order("name"),
  ]);
  const body = draftPrivacyNotice({
    businessName: actor.business.name,
    contactEmail: actor.business.contact_email,
    audience,
    ropa: (ropa ?? []) as RopaEntry[],
    processors: (processors ?? []) as ProcessorEntry[],
  });
  const titles: Record<string, string> = {
    customers: "Privacy notice for customers",
    staff: "Privacy notice for staff",
    job_applicants: "Privacy notice for job applicants",
    website: "Website privacy notice",
  };
  const { data, error } = await supabase
    .from("hub_privacy_notices")
    .insert({ business_id: actor.business_id, audience, title: titles[audience], body })
    .select("id")
    .single();
  if (error || !data) redirect("/app/r/privacy-notices");
  redirect(`/app/r/privacy-notices/${data.id}?saved=1`);
}
