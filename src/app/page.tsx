import { redirect } from "next/navigation";
import { getCurrentMembership, getUser } from "@/lib/auth";
import { isManagerRole } from "@/lib/permissions";

// Signed in: straight to the right place for your role. Signed out: the
// marketing site (public/welcome.html, built by scripts/build-site.mjs).
export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/welcome");

  const membership = await getCurrentMembership();
  if (!membership) redirect("/start");
  redirect(isManagerRole(membership.role) ? "/app" : "/me");
}
