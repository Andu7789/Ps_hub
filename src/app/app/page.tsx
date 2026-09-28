import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEnabledModules, requireManager } from "@/lib/auth";
import { outstandingCount } from "@/lib/policies";
import { cardClass } from "@/components/ui/styles";
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
  const notSignedIn = members.filter((m) => !m.user_id).length;

  let policies: Policy[] = [];
  let signatures: PolicySignature[] = [];
  if (modules.has("staff_hub")) {
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Hello, {membership.full_name.split(" ")[0]}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/app/staff" className={`${cardClass} hover:border-brand`}>
          <p className="text-sm text-muted-foreground">Team</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{members.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {notSignedIn > 0 ? `${notSignedIn} not signed in yet` : "Everyone has signed in"}
          </p>
        </Link>
        {modules.has("staff_hub") ? (
          <Link href="/app/policies" className={`${cardClass} hover:border-brand`}>
            <p className="text-sm text-muted-foreground">Published policies</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">{policies.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {unsigned.length > 0 ? `${unsigned.length} waiting on signatures` : "All signed"}
            </p>
          </Link>
        ) : (
          <div className={cardClass}>
            <p className="text-sm text-muted-foreground">Staff Hub is off</p>
            <p className="mt-1 text-sm text-foreground">
              {membership.role === "owner" ? (
                <Link href="/app/modules" className="text-brand hover:underline">
                  Switch it on
                </Link>
              ) : (
                "Ask the owner to switch it on."
              )}{" "}
              to manage policies and employment details.
            </p>
          </div>
        )}
      </div>

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
