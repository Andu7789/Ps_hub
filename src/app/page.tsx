import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership, getUser } from "@/lib/auth";
import { isManagerRole } from "@/lib/permissions";
import { PRODUCT_NAME } from "@/lib/site";
import { primaryButtonClass } from "@/components/ui/styles";

// Signed in: straight to the right place for your role. Signed out: a
// short explanation and the way in.
export default async function HomePage() {
  const user = await getUser();
  if (user) {
    const membership = await getCurrentMembership();
    if (!membership) redirect("/start");
    redirect(isManagerRole(membership.role) ? "/app" : "/me");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-foreground">{PRODUCT_NAME}</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Your staff records, contracts, policies and compliance in one place. Switch on the modules you need and
        switch them off when you don&apos;t.
      </p>
      <ul className="mt-6 space-y-2 text-sm text-foreground">
        <li>• Keep every staff member&apos;s details in one record</li>
        <li>• Send policies to your team and see who has read and signed them</li>
        <li>• Add Compliance, GDPR and more as they launch</li>
      </ul>
      <div className="mt-8 flex gap-3">
        <Link href="/login" className={primaryButtonClass}>
          Sign in or get started
        </Link>
      </div>
    </div>
  );
}
