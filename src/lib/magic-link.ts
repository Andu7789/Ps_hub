import { createServiceClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site";

// Same approach as PS Clean (its DECISIONS.md #9): generateLink() creates
// the sign-in token without Supabase sending its own project-wide email
// template, and we build our own link around the raw token_hash, verified
// by confirmSignInAction. Works whether or not this Hub shares a Supabase
// project with other apps.
//
// The link says type=email, not magiclink: for someone who has never
// signed in, generateLink() issues a sign-up confirmation token rather
// than a magic-link one, and verifying that as "magiclink" fails with
// "token not found". "email" verifies either kind, so the same link works
// for a first-time invitee and a returning user (DECISIONS.md #6).
//
// Lives outside any "use server" file so it can't be called directly from
// the browser, which would let anyone mint a sign-in link for any email.
export async function generateMagicLink(email: string, next: string): Promise<string> {
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(error.message);

  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) throw new Error("Couldn't generate a sign-in link");

  return `${siteOrigin()}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=email&next=${encodeURIComponent(next)}`;
}
