import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { outstandingCount } from "@/lib/policies";
import { formatDate } from "@/lib/format";
import { primaryButtonClass } from "@/components/ui/styles";
import type { Member, Policy, PolicySignature } from "@/lib/types";

export const metadata: Metadata = { title: "Policies" };

export default async function PoliciesPage() {
  const membership = await requireManager();
  const supabase = await createClient();
  const [{ data: p }, { data: m }, { data: s }] = await Promise.all([
    supabase.from("hub_policies").select("*").eq("business_id", membership.business_id).order("title"),
    supabase.from("hub_members").select("*").eq("business_id", membership.business_id).eq("status", "active"),
    supabase.from("hub_policy_signatures").select("*").eq("business_id", membership.business_id),
  ]);
  const policies = (p ?? []) as Policy[];
  const members = (m ?? []) as Member[];
  const signatures = (s ?? []) as PolicySignature[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Policies</h1>
        <Link href="/app/policies/new" className={primaryButtonClass}>
          New policy
        </Link>
      </div>

      {policies.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No policies yet. Add your first one, publish it, and your team will be asked to read and sign it.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {policies.map((policy) => {
            const outstanding = outstandingCount(policy, members, signatures);
            return (
              <li key={policy.id}>
                <Link href={`/app/policies/${policy.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
                  <div>
                    <p className="text-sm font-medium text-foreground">{policy.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Version {policy.version} · updated {formatDate(policy.updated_at)}
                    </p>
                  </div>
                  <span className="text-right text-xs text-muted-foreground">
                    {!policy.is_published ? "Draft" : outstanding === 0 ? "Everyone signed" : `${outstanding} to sign`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
