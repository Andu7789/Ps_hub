import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEnabledModules, requireManager } from "@/lib/auth";
import { getModule, isModuleKey, type ModuleKey } from "@/lib/modules";
import { registersForModule } from "@/lib/registers/defs";
import { collectDueItems, dueItemHref } from "@/lib/registers/data";
import { formatCalendarDate } from "@/lib/format";
import { RiskMatrix } from "@/components/registers/risk-matrix";
import { cardClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const key = (await params).module;
  return { title: isModuleKey(key) ? getModule(key).name : "Not found" };
}

// Pages that aren't a plain register, per module.
const EXTRA_LINKS: Partial<Record<ModuleKey, { href: string; label: string; description: string }[]>> = {
  staff_hub: [
    { href: "/app/staff", label: "Staff", description: "Everyone's record in one place." },
    { href: "/app/policies", label: "Policies", description: "Policies staff read and sign." },
    { href: "/app/training-matrix", label: "Training matrix", description: "Who has done which course, and what's expiring." },
    { href: "/app/files", label: "Files", description: "Contracts, ID, DBS and certificates." },
  ],
  compliance: [
    { href: "/app/policies", label: "Policies", description: "Health and safety and safeguarding policies." },
    { href: "/app/files", label: "Files", description: "Certificates, insurance documents and safety data sheets." },
  ],
  gdpr: [{ href: "/app/policies", label: "Policies", description: "Data protection policies staff sign." }],
  clients: [{ href: "/app/invoices", label: "Invoices", description: "Create, send and track invoices." }],
  website: [
    { href: "/app/website", label: "Website settings", description: "What your public page says, and publishing it." },
    { href: "/app/website/flyer", label: "Printable flyer", description: "An A4 flyer with your services and contact details." },
  ],
  payroll: [{ href: "/app/payroll", label: "Payroll export", description: "Approved hours, holiday and sickness for your payroll provider." }],
};

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const key = (await params).module;
  if (!isModuleKey(key)) notFound();
  const actor = await requireManager();
  const enabled = await getEnabledModules(actor.business_id);
  if (!enabled.has(key)) redirect("/app/modules");

  const mod = getModule(key);
  const supabase = await createClient();
  const registers = registersForModule(key).filter((r) => r.minRole !== "owner" || actor.role === "owner");
  const [counts, due] = await Promise.all([
    Promise.all(
      registers.map(async (r) => {
        const { count } = await supabase.from(r.table).select("*", { count: "exact", head: true }).eq("business_id", actor.business_id);
        return count ?? 0;
      })
    ),
    collectDueItems(supabase, actor.business_id, new Set([key])),
  ]);
  const { data: risks } =
    key === "compliance"
      ? await supabase.from("hub_risks").select("id, hazard, likelihood, severity, status").eq("business_id", actor.business_id)
      : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{mod.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
      </div>

      {due.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Coming up</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {due.slice(0, 10).map((item) => (
              <li key={`${item.register}-${item.id}-${item.label}`} className="flex items-center justify-between gap-3 py-2">
                <Link href={dueItemHref(item)} className="text-foreground hover:text-brand">
                  {item.label}: {item.title}
                </Link>
                <span className={item.overdue ? "font-medium text-danger" : "text-muted-foreground"}>
                  {item.overdue ? "Overdue, " : ""}
                  {formatCalendarDate(item.date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {risks && (
        <section className={cardClass}>
          <h2 className="mb-3 text-base font-semibold text-foreground">Risk matrix</h2>
          <RiskMatrix risks={risks as never} />
        </section>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(EXTRA_LINKS[key] ?? []).map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={`${cardClass} block h-full hover:border-brand`}>
              <p className="font-semibold text-foreground">{l.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{l.description}</p>
            </Link>
          </li>
        ))}
        {registers.map((r, i) => (
          <li key={r.key}>
            <Link href={`/app/r/${r.key}`} className={`${cardClass} block h-full hover:border-brand`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground">{r.title}</p>
                <span className="text-sm text-muted-foreground">{counts[i]}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
