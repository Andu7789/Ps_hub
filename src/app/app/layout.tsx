import type { ReactNode } from "react";
import Link from "next/link";
import { getEnabledModules, requireManager } from "@/lib/auth";

// Everything under /app is for owners and managers. Staff are sent to /me.
export default async function ManagerLayout({ children }: { children: ReactNode }) {
  const membership = await requireManager();
  const modules = await getEnabledModules(membership.business_id);

  const links = [
    { href: "/app", label: "Overview" },
    { href: "/app/staff", label: "Staff" },
    ...(modules.has("staff_hub") ? [{ href: "/app/policies", label: "Policies" }] : []),
    { href: "/me", label: "My details" },
    ...(membership.role === "owner"
      ? [
          { href: "/app/modules", label: "Modules" },
          { href: "/app/settings", label: "Settings" },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border pb-4 text-sm">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-foreground hover:text-brand">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="py-6">{children}</div>
    </div>
  );
}
