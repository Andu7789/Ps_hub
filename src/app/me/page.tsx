import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEnabledModules, requireMember } from "@/lib/auth";
import { hasSignedCurrent } from "@/lib/policies";
import { EMPLOYMENT_TYPE_LABELS, formatCalendarDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { policiesEnabled } from "@/lib/modules";
import { REGISTERS } from "@/lib/registers/defs";
import { collectDueItems } from "@/lib/registers/data";
import { toggleOnboardingTaskAction } from "@/lib/actions/records";
import { FileList } from "@/components/files/file-list";
import { cardClass } from "@/components/ui/styles";
import type { Policy, PolicySignature, StaffProfile } from "@/lib/types";

export const metadata: Metadata = { title: "My details" };

type OnboardingTask = { id: string; task: string; done: boolean; due_on: string | null };
type IssuedDoc = { id: string; title: string; requires_signature: boolean; signed_at: string | null };

export default async function MyPage() {
  const me = await requireMember();
  const enabled = await getEnabledModules(me.business_id);
  const staffHub = enabled.has("staff_hub");
  const policiesOn = policiesEnabled(enabled);
  const supabase = await createClient();

  const [profileRes, policiesRes, signaturesRes, tasksRes, docsRes, due] = await Promise.all([
    staffHub ? supabase.from("hub_staff_profiles").select("*").eq("member_id", me.id).maybeSingle() : null,
    policiesOn ? supabase.from("hub_policies").select("*").eq("business_id", me.business_id).eq("is_published", true).order("title") : null,
    policiesOn ? supabase.from("hub_policy_signatures").select("*").eq("member_id", me.id) : null,
    staffHub ? supabase.from("hub_onboarding_tasks").select("id, task, done, due_on").eq("member_id", me.id).order("due_on") : null,
    staffHub
      ? supabase.from("hub_issued_documents").select("id, title, requires_signature, signed_at").eq("member_id", me.id).order("issued_at", { ascending: false })
      : null,
    collectDueItems(supabase, me.business_id, enabled, { memberId: me.id }),
  ]);
  const profile = (profileRes?.data ?? null) as StaffProfile | null;
  const policies = (policiesRes?.data ?? []) as Policy[];
  const signatures = (signaturesRes?.data ?? []) as PolicySignature[];
  const tasks = (tasksRes?.data ?? []) as OnboardingTask[];
  const docs = (docsRes?.data ?? []) as IssuedDoc[];
  const toSign = policies.filter((p) => !hasSignedCurrent(p, me.id, signatures));
  const signed = policies.filter((p) => hasSignedCurrent(p, me.id, signatures));
  const docsToSign = docs.filter((d) => d.requires_signature && !d.signed_at);
  const openTasks = tasks.filter((t) => !t.done);

  // What staff can see or send in each module that's on.
  const staffRegisters = REGISTERS.filter((r) => r.staff && r.module && enabled.has(r.module));

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

      {(policiesOn || docsToSign.length > 0) && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">To read and sign</h2>
          {toSign.length === 0 && docsToSign.length === 0 ? (
            <p className="mt-2 text-sm text-success">You&apos;re all up to date.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {docsToSign.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{d.title}</span>
                  <Link href={`/me/documents/${d.id}`} className="font-medium text-brand hover:underline">
                    Read and sign
                  </Link>
                </li>
              ))}
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

      {openTasks.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Getting started</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tick things off as you do them.</p>
          <ul className="mt-3 divide-y divide-border">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className={t.done ? "text-muted-foreground line-through" : "text-foreground"}>{t.task}</span>
                <form action={toggleOnboardingTaskAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="done" value={t.done ? "false" : "true"} />
                  <button type="submit" className="text-brand hover:underline">
                    {t.done ? "Undo" : "Done"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {due.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Coming up for you</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {due.map((item) => (
              <li key={`${item.register}-${item.id}-${item.label}`} className="flex justify-between gap-3 py-2">
                <span className="text-foreground">
                  {item.label}: {item.title}
                </span>
                <span className={item.overdue ? "font-medium text-danger" : "text-muted-foreground"}>
                  {item.overdue ? "Overdue, " : ""}
                  {formatCalendarDate(item.date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {staffRegisters.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">My records and requests</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {staffRegisters.map((r) => (
              <li key={r.key}>
                <Link href={`/me/r/${r.key}`} className="text-brand hover:underline">
                  {r.staff?.create ? r.staff.create.label : r.title}
                </Link>
              </li>
            ))}
          </ul>
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

      <section>
        <h2 className="mb-2 text-base font-semibold text-foreground">My files</h2>
        <FileList businessId={me.business_id} memberId={me.id} />
      </section>

      {(signed.length > 0 || docs.some((d) => d.signed_at || !d.requires_signature)) && (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Signed and issued</h2>
          <ul className="mt-3 divide-y divide-border">
            {docs
              .filter((d) => d.signed_at || !d.requires_signature)
              .map((d) => (
                <li key={d.id} className="py-2 text-sm">
                  <Link href={`/me/documents/${d.id}`} className="text-foreground hover:text-brand">
                    {d.title}
                  </Link>
                </li>
              ))}
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
