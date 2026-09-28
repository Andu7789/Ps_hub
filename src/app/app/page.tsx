import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEnabledModules, requireManager } from "@/lib/auth";
import { outstandingCount } from "@/lib/policies";
import { collectDueItems, dueItemHref } from "@/lib/registers/data";
import { policiesEnabled } from "@/lib/modules";
import { buildOnboardingChecklist } from "@/lib/onboarding";
import { loadOnboardingCounts } from "@/lib/onboarding-data";
import { formatCalendarDate } from "@/lib/format";
import { cardClass, secondaryButtonClass } from "@/components/ui/styles";
import type { Member, Policy, PolicySignature } from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const membership = await requireManager();
  const modules = await getEnabledModules(membership.business_id);
  const supabase = await createClient();

  const { data: memberRows } = await supabase
    .from("hub_members")
    .select("*")
    .eq("business_id", membership.business_id)
    .eq("status", "active");
  const members = (memberRows ?? []) as Member[];
  const names = new Map(members.map((m) => [m.id, m.full_name]));
  const notSignedIn = members.filter((m) => !m.user_id).length;

  let policies: Policy[] = [];
  let signatures: PolicySignature[] = [];
  const policiesOn = policiesEnabled(modules);
  if (policiesOn) {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("hub_policies").select("*").eq("business_id", membership.business_id).eq("is_published", true),
      supabase.from("hub_policy_signatures").select("*").eq("business_id", membership.business_id),
    ]);
    policies = (p ?? []) as Policy[];
    signatures = (s ?? []) as PolicySignature[];
  }
  const unsigned = policies
    .map((p) => ({ policy: p, outstanding: outstandingCount(p, members, signatures) }))
    .filter((r) => r.outstanding > 0);

  // Owner-only pay data never reaches a manager's list: RLS hides it.
  const due = await collectDueItems(supabase, membership.business_id, modules);
  const overdue = due.filter((d) => d.overdue).length;

  // Getting-started checklist: owner only (one of its steps is pay details,
  // which RLS hides from managers anyway), and only while something on it
  // is still outstanding — an established business stops seeing it.
  let checklist: ReturnType<typeof buildOnboardingChecklist> = [];
  if (membership.role === "owner") {
    const counts = await loadOnboardingCounts(supabase, membership.business_id, modules, members.length, policies.length);
    checklist = buildOnboardingChecklist(modules, counts).filter((item) => !item.done);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Hello, {membership.full_name.split(" ")[0]}</h1>

      {checklist.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Getting started</h2>
          <p className="mt-1 text-sm text-muted-foreground">A few things left to get set up.</p>
          <ul className="mt-3 divide-y divide-border text-sm">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 py-2">
                <span className="text-foreground">{item.label}</span>
                <Link href={item.href} className={secondaryButtonClass}>
                  {item.key === "invite" ? "Invite" : "Add"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/app/staff" className={`${cardClass} hover:border-brand`}>
          <p className="text-sm text-muted-foreground">Team</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{members.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {notSignedIn > 0 ? `${notSignedIn} not signed in yet` : "Everyone has signed in"}
          </p>
        </Link>
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">Due in the next 30 days</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{due.length}</p>
          <p className={`mt-1 text-sm ${overdue > 0 ? "text-danger" : "text-muted-foreground"}`}>
            {overdue > 0 ? `${overdue} overdue` : "Nothing overdue"}
          </p>
        </div>
        {policiesOn ? (
          <Link href="/app/policies" className={`${cardClass} hover:border-brand`}>
            <p className="text-sm text-muted-foreground">Published policies</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">{policies.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {unsigned.length > 0 ? `${unsigned.length} waiting on signatures` : "All signed"}
            </p>
          </Link>
        ) : (
          <div className={cardClass}>
            <p className="text-sm text-muted-foreground">No modules on yet</p>
            <p className="mt-1 text-sm text-foreground">
              {membership.role === "owner" ? (
                <Link href="/app/modules" className="text-brand hover:underline">
                  Choose your modules
                </Link>
              ) : (
                "Ask the owner to switch modules on."
              )}
            </p>
          </div>
        )}
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Coming up and overdue</h2>
        {due.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing due in the next 30 days.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {due.slice(0, 25).map((item) => (
              <li key={`${item.register}-${item.id}-${item.label}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={dueItemHref(item)} className="text-foreground hover:text-brand">
                  <span className="text-muted-foreground">{item.label}:</span> {item.title}
                  {item.memberId && names.get(item.memberId) ? ` (${names.get(item.memberId)})` : ""}
                </Link>
                <span className={item.overdue ? "font-medium text-danger" : "text-muted-foreground"}>
                  {item.overdue ? "Overdue, " : ""}
                  {formatCalendarDate(item.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {unsigned.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Waiting on signatures</h2>
          <ul className="mt-3 divide-y divide-border">
            {unsigned.map(({ policy, outstanding }) => (
              <li key={policy.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/app/policies/${policy.id}`} className="text-foreground hover:text-brand">
                  {policy.title}
                </Link>
                <span className="text-muted-foreground">{outstanding} to sign</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
