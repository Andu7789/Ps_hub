import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireMember } from "@/lib/auth";
import { hasSignedCurrent } from "@/lib/policies";
import { EMPLOYMENT_TYPE_LABELS, formatCalendarDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { cardClass } from "@/components/ui/styles";
import type { Policy, PolicySignature, StaffProfile } from "@/lib/types";

export const metadata: Metadata = { title: "My details" };

export default async function MyPage() {
  const me = await requireMember();
  const staffHub = await isModuleEnabled(me.business_id, "staff_hub");
  const supabase = await createClient();

  let profile: StaffProfile | null = null;
  let policies: Policy[] = [];
  let signatures: PolicySignature[] = [];
  if (staffHub) {
    const [{ data: p }, { data: pol }, { data: sig }] = await Promise.all([
      supabase.from("hub_staff_profiles").select("*").eq("member_id", me.id).maybeSingle(),
      supabase.from("hub_policies").select("*").eq("business_id", me.business_id).eq("is_published", true).order("title"),
      supabase.from("hub_policy_signatures").select("*").eq("member_id", me.id),
    ]);
    profile = p as StaffProfile | null;
    policies = (pol ?? []) as Policy[];
    signatures = (sig ?? []) as PolicySignature[];
  }
  const toSign = policies.filter((p) => !hasSignedCurrent(p, me.id, signatures));
  const signed = policies.filter((p) => hasSignedCurrent(p, me.id, signatures));

  const details: [string, string | null | undefined][] = [
    ["Email", me.email],
    ["Role", ROLE_LABELS[me.role]],
    ["Job title", profile?.job_title],
    ["Employment type", profile?.employment_type ? EMPLOYMENT_TYPE_LABELS[profile.employment_type] : null],
    ["Start date", profile?.start_date ? formatCalendarDate(profile.start_date) : null],
    ["Phone", profile?.phone],
    [
      "Emergency contact",
      profile?.emergency_contact_name
        ? `${profile.emergency_contact_name}${profile.emergency_contact_phone ? `, ${profile.emergency_contact_phone}` : ""}`
        : null,
    ],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{me.full_name}</h1>

      {staffHub && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Policies to read and sign</h2>
          {toSign.length === 0 ? (
            <p className="mt-2 text-sm text-success">You&apos;re all up to date.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {toSign.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{p.title}</span>
                  <Link href={`/me/policies/${p.id}`} className="font-medium text-brand hover:underline">
                    Read and sign
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">My details</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-foreground">{value}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">Something wrong? Let your manager know and they&apos;ll update it.</p>
      </section>

      {signed.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Signed policies</h2>
          <ul className="mt-3 divide-y divide-border">
            {signed.map((p) => (
              <li key={p.id} className="py-2 text-sm">
                <Link href={`/me/policies/${p.id}`} className="text-foreground hover:text-brand">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
