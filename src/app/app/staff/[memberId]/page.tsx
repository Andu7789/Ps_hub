import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEnabledModules, requireManager } from "@/lib/auth";
import { policiesEnabled } from "@/lib/modules";
import { MemberRecords } from "@/components/registers/member-records";
import { resendInviteAction, saveStaffProfileAction, setMemberStatusAction, updateMemberAction } from "@/lib/actions/staff";
import { canManageMember, ROLE_LABELS, rolesAssignableBy } from "@/lib/permissions";
import { hasSignedCurrent } from "@/lib/policies";
import { EMPLOYMENT_TYPE_LABELS, formatDate } from "@/lib/format";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass, secondaryButtonClass } from "@/components/ui/styles";
import type { Member, Policy, PolicySignature, StaffProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Staff member" };

const STATUS_ERRORS: Record<string, string> = {
  self: "You can't mark yourself as left.",
  owner: "The business needs at least one owner. Make someone else an owner first.",
};

export default async function StaffMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { memberId } = await params;
  const { error } = await searchParams;
  const actor = await requireManager();
  const supabase = await createClient();

  const { data } = await supabase
    .from("hub_members")
    .select("*")
    .eq("id", memberId)
    .eq("business_id", actor.business_id)
    .maybeSingle();
  const member = data as Member | null;
  if (!member) notFound();

  const canManage = canManageMember(actor.role, member.role) && member.id !== actor.id;
  const assignable = rolesAssignableBy(actor.role);
  const enabled = await getEnabledModules(actor.business_id);
  const staffHub = enabled.has("staff_hub");
  const policiesOn = policiesEnabled(enabled);

  let profile: StaffProfile | null = null;
  let policies: Policy[] = [];
  let signatures: PolicySignature[] = [];
  if (staffHub) {
    const { data: p } = await supabase.from("hub_staff_profiles").select("*").eq("member_id", member.id).maybeSingle();
    profile = p as StaffProfile | null;
  }
  if (policiesOn) {
    const [{ data: pol }, { data: sig }] = await Promise.all([
      supabase.from("hub_policies").select("*").eq("business_id", actor.business_id).eq("is_published", true).order("title"),
      supabase.from("hub_policy_signatures").select("*").eq("member_id", member.id),
    ]);
    policies = (pol ?? []) as Policy[];
    signatures = (sig ?? []) as PolicySignature[];
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/staff" className="text-sm text-muted-foreground hover:underline">
          ← Staff
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{member.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[member.role]} · {member.email}
          {member.status === "left" && " · Left"}
          {!member.user_id && member.status === "active" && " · Invite pending"}
        </p>
      </div>

      {error && STATUS_ERRORS[error] && (
        <p role="alert" className="text-sm text-danger">
          {STATUS_ERRORS[error]}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {canManage && (
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-foreground">Details</h2>
            <div className="mt-4">
              <ActionForm action={updateMemberAction} submitLabel="Save">
                <input type="hidden" name="member_id" value={member.id} />
                <div>
                  <label htmlFor="full_name" className={labelClass}>
                    Full name
                  </label>
                  <input id="full_name" name="full_name" defaultValue={member.full_name} required className={`mt-1 ${inputClass}`} />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={member.email}
                    readOnly={Boolean(member.user_id)}
                    className={`mt-1 ${inputClass} read-only:bg-muted`}
                  />
                  {member.user_id && <p className="mt-1 text-xs text-muted-foreground">Fixed once they&apos;ve signed in.</p>}
                </div>
                {assignable.length > 1 && (
                  <div>
                    <label htmlFor="role" className={labelClass}>
                      Role
                    </label>
                    <select id="role" name="role" defaultValue={member.role} className={`mt-1 ${inputClass}`}>
                      {assignable.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </ActionForm>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-4">
              {!member.user_id && member.status === "active" && (
                <ActionForm action={resendInviteAction} submitLabel="Resend invite" pendingLabel="Sending…" className="space-y-2">
                  <input type="hidden" name="member_id" value={member.id} />
                </ActionForm>
              )}
              <form action={setMemberStatusAction}>
                <input type="hidden" name="member_id" value={member.id} />
                <input type="hidden" name="status" value={member.status === "active" ? "left" : "active"} />
                <button type="submit" className={secondaryButtonClass}>
                  {member.status === "active" ? "Mark as left" : "Mark as back"}
                </button>
              </form>
            </div>
            {member.status === "active" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Marking someone as left removes their access straight away. Their records and signatures are kept.
              </p>
            )}
          </section>
        )}

        {staffHub && (
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-foreground">Employment</h2>
            <div className="mt-4">
              <ActionForm action={saveStaffProfileAction} submitLabel="Save employment details">
                <input type="hidden" name="member_id" value={member.id} />
                <div>
                  <label htmlFor="job_title" className={labelClass}>
                    Job title
                  </label>
                  <input id="job_title" name="job_title" defaultValue={profile?.job_title ?? ""} className={`mt-1 ${inputClass}`} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="employment_type" className={labelClass}>
                      Employment type
                    </label>
                    <select
                      id="employment_type"
                      name="employment_type"
                      defaultValue={profile?.employment_type ?? ""}
                      className={`mt-1 ${inputClass}`}
                    >
                      <option value="">Not set</option>
                      {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="start_date" className={labelClass}>
                      Start date
                    </label>
                    <input id="start_date" name="start_date" type="date" defaultValue={profile?.start_date ?? ""} className={`mt-1 ${inputClass}`} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone
                    </label>
                    <input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} className={`mt-1 ${inputClass}`} />
                  </div>
                  <div>
                    <label htmlFor="holiday_allowance_days" className={labelClass}>
                      Holiday allowance (days a year)
                    </label>
                    <input
                      id="holiday_allowance_days"
                      name="holiday_allowance_days"
                      type="number"
                      step="0.5"
                      min="0"
                      defaultValue={profile?.holiday_allowance_days ?? ""}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="emergency_contact_name" className={labelClass}>
                      Emergency contact
                    </label>
                    <input
                      id="emergency_contact_name"
                      name="emergency_contact_name"
                      defaultValue={profile?.emergency_contact_name ?? ""}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="emergency_contact_phone" className={labelClass}>
                      Their phone
                    </label>
                    <input
                      id="emergency_contact_phone"
                      name="emergency_contact_phone"
                      type="tel"
                      defaultValue={profile?.emergency_contact_phone ?? ""}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                </div>
              </ActionForm>
            </div>
          </section>
        )}
      </div>

      {policiesOn && policies.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Policies</h2>
          <ul className="mt-3 divide-y divide-border">
            {policies.map((p) => {
              const signed = hasSignedCurrent(p, member.id, signatures);
              const signature = signatures.find((s) => s.policy_id === p.id && s.policy_version === p.version);
              return (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/app/policies/${p.id}`} className="text-foreground hover:text-brand">
                    {p.title}
                  </Link>
                  <span className={signed ? "text-success" : "text-danger"}>
                    {signed && signature ? `Signed ${formatDate(signature.signed_at)}` : "Not signed"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <MemberRecords actor={actor} member={member} enabled={enabled} allowanceDays={profile?.holiday_allowance_days ?? null} />
    </div>
  );
}
