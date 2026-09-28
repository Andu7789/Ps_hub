"use server";

import { createClient } from "@/lib/supabase/server";
import { field, type ActionState } from "@/lib/action-state";

// Forms on public pages (no sign-in). Each goes through a database
// function that only accepts what that form is for (see migrations 0004
// and 0008), so the anonymous key never gets table access.
//
// Each form has a hidden "website" field real people never see or fill
// in; bots that fill every field get a polite success and nothing saved.
function isBot(formData: FormData): boolean {
  return field(formData, "website") !== "";
}

export async function requestBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isBot(formData)) return { ok: "Thanks, we'll be in touch." };
  const name = field(formData, "name");
  const email = field(formData, "email");
  const phone = field(formData, "phone");
  if (!name) return { error: "Enter your name." };
  if (!email && !phone) return { error: "Enter an email address or phone number so we can reply." };
  const preferred = field(formData, "preferred_date");

  const supabase = await createClient();
  const { error } = await supabase.rpc("hub_request_booking", {
    business_slug: field(formData, "slug"),
    target_service: field(formData, "service_id") || null,
    name,
    customer_email: email,
    customer_phone: phone,
    preferred: /^\d{4}-\d{2}-\d{2}$/.test(preferred) ? preferred : null,
    note: field(formData, "message"),
  });
  if (error) {
    console.error("Booking request failed", error);
    return { error: "Sorry, that didn't send. Please try again or contact us directly." };
  }
  return { ok: "Thanks, your request has been sent. We'll be in touch soon." };
}

export async function applyForJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isBot(formData)) return { ok: "Thanks for applying." };
  const name = field(formData, "full_name");
  const email = field(formData, "email");
  if (!name) return { error: "Enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("hub_apply_for_job", {
    target_vacancy: field(formData, "vacancy_id"),
    applicant_name: name,
    applicant_email: email,
    applicant_phone: field(formData, "phone"),
    note: field(formData, "cover_note"),
  });
  if (error) {
    console.error("Application failed", error);
    return { error: "Sorry, this job may have closed. Please try again or contact us directly." };
  }
  return { ok: "Thanks for applying. We'll be in touch." };
}

export async function submitReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isBot(formData)) return { ok: "Thank you for your review." };
  const rating = Number(field(formData, "rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5 stars." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("hub_submit_review", {
    review_token: field(formData, "token"),
    stars: rating,
    review_comment: field(formData, "comment"),
  });
  if (error) return { error: "This review link has already been used or has expired." };
  return { ok: "Thank you for your review." };
}
