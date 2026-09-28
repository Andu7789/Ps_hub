import { PRODUCT_NAME } from "@/lib/site";

// Sends through Resend. Without RESEND_API_KEY outside production, the
// email is printed to the server console instead, so sign-in and invites
// can be tried locally before email is set up.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email not sent — RESEND_API_KEY missing]\nTo: ${to}\nSubject: ${subject}\n${html}`);
      return;
    }
    throw new Error("Email isn't configured (RESEND_API_KEY missing)");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM_EMAIL ?? "hub@example.com",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend request failed: ${res.status} ${await res.text()}`);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailShell(heading: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
      <h1 style="font-size: 18px; margin-bottom: 16px;">${escapeHtml(heading)}</h1>
      ${bodyHtml}
    </div>
  `;
}

function button(href: string, label: string): string {
  return `<p><a href="${href}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600;">${escapeHtml(label)}</a></p>`;
}

export async function sendMagicLinkEmail(email: string, link: string): Promise<void> {
  const html = emailShell(
    PRODUCT_NAME,
    `<p>Click below to sign in.</p>
     ${button(link, "Sign in")}
     <p style="font-size: 12px; color: #5b6b68;">If you didn't request this, you can safely ignore this email.</p>`
  );
  await sendEmail(email, `Sign in to ${PRODUCT_NAME}`, html);
}

// The invite carries a one-click sign-in link. That link is single use and
// expires, and people don't always open invites straight away, so the
// login page is included as a fallback.
export async function sendInviteEmail(opts: {
  email: string;
  name: string;
  businessName: string;
  invitedBy: string;
  signInLink: string;
  loginUrl: string;
}): Promise<void> {
  const html = emailShell(
    opts.businessName,
    `<p>Hi ${escapeHtml(opts.name)},</p>
     <p>${escapeHtml(opts.invitedBy)} has added you to ${escapeHtml(opts.businessName)} on ${PRODUCT_NAME}. Sign in to see your details and any policies waiting for you to read.</p>
     ${button(opts.signInLink, `Sign in to ${opts.businessName}`)}
     <p style="font-size: 12px; color: #5b6b68;">This button works once and expires after a while. If it's stopped working, go to <a href="${opts.loginUrl}" style="color: #0f766e;">${opts.loginUrl}</a> and enter ${escapeHtml(opts.email)} to get a fresh link. No password needed.</p>`
  );
  await sendEmail(opts.email, `You've been added to ${opts.businessName}`, html);
}
