import type { ReactNode } from "react";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { isManagerRole } from "@/lib/permissions";

// Every member's own area: their details and policies to sign. Managers
// use it too, for their own policies.
export default async function MyLayout({ children }: { children: ReactNode }) {
  const membership = await requireMember();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {isManagerRole(membership.role) && (
        <Link href="/app" className="text-sm text-muted-foreground hover:underline">
          ← Back to managing {membership.business.name}
        </Link>
      )}
      <div className="py-4">{children}</div>
    </div>
  );
}
