"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateMagicLink } from "@/lib/magic-link";
import { sendMagicLinkEmail } from "@/lib/notify";
import { CURRENT_BUSINESS_COOKIE, getMemberships, requireUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/site";
import { field, type ActionState } from "@/lib/action-state";

export async function requestMagicLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Lower-cased before use: phone keyboards capitalise the first letter,
  // and invites are matched on the exact stored (lower-case) address.
  const parsed = z.string().email().safeParse(field(formData, "email").toLowerCase());
  if (!parsed.success) return { error: "Enter a valid email address." };

  const next = safeNextPath(field(formData, "next"));
  try {
    const link = await generateMagicLink(parsed.data, next);
    await sendMagicLinkEmail(parsed.data, link);
  } catch (err) {
    console.error("Sign-in link failed", err);
    return { error: "We couldn't send your sign-in link. Try again in a minute." };
  }
  return { ok: parsed.data };
}

// Behind a button click, never run on page load: email scanners open links
// to check them, and would otherwise spend the single-use token before the
// person clicks (found the hard way in PS Clean, its DECISIONS.md).
export async function confirmSignInAction(formData: FormData) {
  const tokenHash = field(formData, "token_hash");
  const type = field(formData, "type") as EmailOtpType;
  const next = safeNextPath(field(formData, "next"));
  if (!tokenHash || !type) redirect("/login?error=auth");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) redirect("/login?error=auth");

  // Link any invites waiting for this email address.
  await supabase.rpc("hub_claim_invites");
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(CURRENT_BUSINESS_COOKIE);
  redirect("/login");
}

export async function switchBusinessAction(formData: FormData) {
  await requireUser();
  const businessId = field(formData, "business_id");
  const memberships = await getMemberships();
  const target = memberships.find((m) => m.business_id === businessId);
  if (!target) redirect("/");

  (await cookies()).set(CURRENT_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(target.role === "staff" ? "/me" : "/app");
}
