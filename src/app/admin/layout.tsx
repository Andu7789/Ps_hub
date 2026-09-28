import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-admin-server";

export const metadata: Metadata = { title: { default: "Platform admin", template: "%s · Platform admin" }, robots: { index: false } };

// The Hub operator's view across every business (DECISIONS.md #14).
export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin();
  const links = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/prices", label: "Prices" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border pb-4 text-sm">
        <span className="rounded-md bg-foreground px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-background">
          Platform admin
        </span>
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
