import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { setPolicyPublishedAction, updatePolicyAction } from "@/lib/actions/policies";
import { signOffSheet } from "@/lib/policies";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/forms/action-form";
import { PolicyFields } from "@/components/forms/policy-fields";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";
import type { Member, Policy, PolicySignature } from "@/lib/types";

export const metadata: Metadata = { title: "Policy" };

export default async function PolicyPage({ params }: { params: Promise<{ policyId: string }> }) {
  const { policyId } = await params;
  const membership = await requireManager();
  const supabase = await createClient();

  const { data } = await supabase
    .from("hub_policies")
    .select("*")
    .eq("id", policyId)
    .eq("business_id", membership.business_id)
    .maybeSingle();
  const policy = data as Policy | null;
  if (!policy) notFound();

  const [{ data: m }, { data: s }] = await Promise.all([
    supabase.from("hub_members").select("*").eq("business_id", membership.business_id).eq("status", "active"),
    supabase.from("hub_policy_signatures").select("*").eq("policy_id", policy.id),
  ]);
  const sheet = signOffSheet(policy, (m ?? []) as Member[], (s ?? []) as PolicySignature[]);
  const signedCount = sheet.filter((r) => r.signature).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/policies" className="text-sm text-muted-foreground hover:underline">
          ← Policies
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{policy.title}</h1>
            <p className="text-sm text-muted-foreground">
              Version {policy.version} · {policy.is_published ? "Published" : "Draft"}
            </p>
          </div>
          <form action={setPolicyPublishedAction}>
            <input type="hidden" name="policy_id" value={policy.id} />
            <input type="hidden" name="published" value={policy.is_published ? "false" : "true"} />
            <button type="submit" className={policy.is_published ? secondaryButtonClass : primaryButtonClass}>
              {policy.is_published ? "Unpublish" : "Publish to team"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Edit</h2>
          {policy.is_published && (
            <p className="mt-1 text-sm text-muted-foreground">
              Changing the wording makes a new version, and everyone will be asked to sign again.
            </p>
          )}
          <div className="mt-4">
            <ActionForm action={updatePolicyAction} submitLabel="Save changes">
              <input type="hidden" name="policy_id" value={policy.id} />
              <PolicyFields title={policy.title} body={policy.body} />
            </ActionForm>
          </div>
        </section>

        <section className={`${cardClass} h-fit`}>
          <h2 className="text-base font-semibold text-foreground">Sign-off</h2>
          {!policy.is_published ? (
            <p className="mt-2 text-sm text-muted-foreground">Publish this policy to ask your team to sign it.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {signedCount} of {sheet.length} signed version {policy.version}
              </p>
              <ul className="mt-3 divide-y divide-border">
                {sheet.map((row) => (
                  <li key={row.member.id} className="py-2 text-sm">
                    <Link href={`/app/staff/${row.member.id}`} className="text-foreground hover:text-brand">
                      {row.member.full_name}
                    </Link>
                    <p className={`text-xs ${row.signature ? "text-success" : "text-danger"}`}>
                      {row.signature
                        ? `Signed as "${row.signature.signed_name}", ${formatDateTime(row.signature.signed_at)}`
                        : row.signedOlderVersion
                          ? "Signed an earlier version, needs to sign again"
                          : "Not signed"}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
