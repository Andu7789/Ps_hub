import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { signPolicyAction } from "@/lib/actions/policies";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";
import type { Policy, PolicySignature } from "@/lib/types";

export const metadata: Metadata = { title: "Policy" };

export default async function MyPolicyPage({
  params,
  searchParams,
}: {
  params: Promise<{ policyId: string }>;
  searchParams: Promise<{ signed?: string }>;
}) {
  const { policyId } = await params;
  const { signed: justSigned } = await searchParams;
  const me = await requireMember();
  const supabase = await createClient();

  // RLS only returns published policies of a business with Staff Hub on.
  const { data } = await supabase
    .from("hub_policies")
    .select("*")
    .eq("id", policyId)
    .eq("business_id", me.business_id)
    .eq("is_published", true)
    .maybeSingle();
  const policy = data as Policy | null;
  if (!policy) notFound();

  const { data: sig } = await supabase
    .from("hub_policy_signatures")
    .select("*")
    .eq("policy_id", policy.id)
    .eq("policy_version", policy.version)
    .eq("member_id", me.id)
    .maybeSingle();
  const signature = sig as PolicySignature | null;

  return (
    <div className="space-y-6">
      <Link href="/me" className="text-sm text-muted-foreground hover:underline">
        ← My details
      </Link>
      <article className={cardClass}>
        <h1 className="text-2xl font-semibold text-foreground">{policy.title}</h1>
        <p className="text-xs text-muted-foreground">Version {policy.version}</p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground">
          {policy.body.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
      </article>

      <section className={cardClass}>
        {signature ? (
          <p className="text-sm text-success">
            {justSigned ? "Thanks, that's signed. " : ""}You signed this as &quot;{signature.signed_name}&quot; on{" "}
            {formatDateTime(signature.signed_at)}.
          </p>
        ) : (
          <>
            <h2 className="text-base font-semibold text-foreground">Sign</h2>
            <div className="mt-4">
              <ActionForm action={signPolicyAction} submitLabel="Sign policy" pendingLabel="Signing…">
                <input type="hidden" name="policy_id" value={policy.id} />
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input type="checkbox" name="confirm" required className="mt-1" />
                  I have read and understood this policy and agree to follow it.
                </label>
                <div>
                  <label htmlFor="signed_name" className={labelClass}>
                    Type your full name
                  </label>
                  <input
                    id="signed_name"
                    name="signed_name"
                    required
                    autoComplete="name"
                    placeholder={me.full_name}
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              </ActionForm>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
