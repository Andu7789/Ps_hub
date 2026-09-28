import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Membership } from "@/lib/auth";
import type { RegisterDef } from "@/lib/registers/types";
import type { Lookups } from "@/lib/registers/values";
import type { RecordRow } from "@/lib/registers/data";
import { markAuditDoneAction } from "@/lib/actions/records";
import {
  addStarterTemplatesAction,
  emailReviewLinkAction,
  generatePrivacyNoticeAction,
  hireApplicantAction,
  issueDocumentAction,
} from "@/lib/actions/custom";
import { siteOrigin } from "@/lib/site";
import { formatDateTime, hoursUntil } from "@/lib/format";
import { ActionForm } from "@/components/forms/action-form";
import { RiskMatrix } from "@/components/registers/risk-matrix";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";

// Register-specific additions above a register's list.
export async function RegisterListExtras({ def, actor }: { def: RegisterDef; actor: Membership }) {
  const supabase = await createClient();
  switch (def.key) {
    case "risks": {
      const { data } = await supabase.from("hub_risks").select("id, hazard, likelihood, severity, status").eq("business_id", actor.business_id);
      return (
        <section className={cardClass}>
          <RiskMatrix risks={(data ?? []) as never} />
        </section>
      );
    }
    case "vacancies":
      return (
        <p className="text-sm text-muted-foreground">
          Your public jobs page:{" "}
          <Link href={`/s/${actor.business.slug}/jobs`} className="text-brand hover:underline">
            {siteOrigin()}/s/{actor.business.slug}/jobs
          </Link>
        </p>
      );
    case "booking-requests":
    case "services":
      return (
        <p className="text-sm text-muted-foreground">
          Your public page:{" "}
          <Link href={`/s/${actor.business.slug}`} className="text-brand hover:underline">
            {siteOrigin()}/s/{actor.business.slug}
          </Link>{" "}
          · <Link href="/app/website" className="text-brand hover:underline">Website settings</Link>
        </p>
      );
    case "templates": {
      const { count } = await supabase.from("hub_templates").select("id", { count: "exact", head: true }).eq("business_id", actor.business_id);
      return count ? null : (
        <form action={addStarterTemplatesAction} className={cardClass}>
          <p className="text-sm text-foreground">
            Start with a written statement of employment particulars, a job description and an offer letter. They&apos;re
            starting points to adapt, not legal advice: have them checked by an employment solicitor before use.
          </p>
          <button type="submit" className={`mt-3 ${secondaryButtonClass}`}>
            Add starter templates
          </button>
        </form>
      );
    }
    case "privacy-notices":
      return (
        <form action={generatePrivacyNoticeAction} className={`${cardClass} flex flex-wrap items-end gap-3`}>
          <div>
            <label htmlFor="audience" className={labelClass}>
              Draft a notice from your data map for
            </label>
            <select id="audience" name="audience" className={`mt-1 ${inputClass}`}>
              <option value="customers">Customers</option>
              <option value="staff">Staff</option>
              <option value="job_applicants">Job applicants</option>
              <option value="website">Website visitors</option>
            </select>
          </div>
          <button type="submit" className={secondaryButtonClass}>
            Draft notice
          </button>
        </form>
      );
    case "timesheets":
      return (
        <p className="text-sm">
          <Link href="/app/payroll" className="text-brand hover:underline">
            Export approved hours for payroll →
          </Link>
        </p>
      );
    case "products": {
      const { data } = await supabase.from("hub_products").select("id, name, stock_level, reorder_level").eq("business_id", actor.business_id);
      const low = (data ?? []).filter((p) => p.reorder_level !== null && p.stock_level !== null && Number(p.stock_level) <= Number(p.reorder_level));
      return low.length === 0 ? null : (
        <p role="status" className="text-sm text-danger">
          Low stock: {low.map((p) => p.name).join(", ")}
        </p>
      );
    }
    default:
      return null;
  }
}

// Register-specific additions on a single record's page.
export async function RecordExtras({
  def,
  record,
  actor,
}: {
  def: RegisterDef;
  record: RecordRow;
  actor: Membership;
  lookups: Lookups;
}) {
  const supabase = await createClient();
  const id = String(record.id);
  switch (def.key) {
    case "audits":
      return (
        <form action={markAuditDoneAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className={primaryButtonClass}>
            Mark done today
          </button>
        </form>
      );
    case "applicants":
      return record.stage === "hired" ? null : (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Hire</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Adds them to your team, sends their sign-in invite and starts their onboarding checklist.
          </p>
          <div className="mt-3">
            <ActionForm action={hireApplicantAction} submitLabel="Add to team" pendingLabel="Adding…">
              <input type="hidden" name="id" value={id} />
            </ActionForm>
          </div>
        </section>
      );
    case "templates": {
      const { data: members } = await supabase
        .from("hub_members")
        .select("id, full_name")
        .eq("business_id", actor.business_id)
        .eq("status", "active")
        .order("full_name");
      return (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Issue to someone</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fills in their details and sends it to their Hub to read and sign.</p>
          <div className="mt-3">
            <ActionForm action={issueDocumentAction} submitLabel="Issue" pendingLabel="Issuing…">
              <input type="hidden" name="template_id" value={id} />
              <div>
                <label htmlFor="issue-member" className={labelClass}>
                  Person
                </label>
                <select id="issue-member" name="member_id" required className={`mt-1 ${inputClass}`}>
                  <option value="">Choose…</option>
                  {(members ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="requires_signature" defaultChecked /> Ask them to sign it
              </label>
            </ActionForm>
          </div>
        </section>
      );
    }
    case "issued-documents":
      return (
        <p className={`text-sm ${record.signed_at ? "text-success" : "text-muted-foreground"}`}>
          {record.signed_at
            ? `Signed as "${record.signed_name}" on ${formatDateTime(String(record.signed_at))}. It can no longer be changed.`
            : record.requires_signature
              ? "Waiting for their signature."
              : "Issued for information; no signature needed."}
        </p>
      );
    case "customer-reviews": {
      const link = `${siteOrigin()}/review/${record.token}`;
      return record.submitted_at ? null : (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Ask for the review</h2>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            Their review link: <span className="text-foreground">{link}</span>
          </p>
          <div className="mt-3">
            <ActionForm action={emailReviewLinkAction} submitLabel="Email them the link" pendingLabel="Sending…">
              <input type="hidden" name="id" value={id} />
            </ActionForm>
          </div>
        </section>
      );
    }
    case "breaches": {
      if (!record.ico_reportable || record.reported_to_ico_at) return null;
      const deadline = new Date(new Date(String(record.discovered_at)).getTime() + 72 * 3600 * 1000);
      const hoursLeft = hoursUntil(deadline);
      return (
        <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">
          Report to the ICO by {formatDateTime(deadline.toISOString())}
          {hoursLeft > 0 ? ` (${hoursLeft} hours left)` : " (the 72-hour deadline has passed; report now and explain the delay)"}.
          Report at ico.org.uk or call 0303 123 1113.
        </p>
      );
    }
    case "vacancies":
      return record.status === "open" ? (
        <p className="text-sm text-muted-foreground">
          Advertised at{" "}
          <Link href={`/s/${actor.business.slug}/jobs/${id}`} className="text-brand hover:underline">
            {siteOrigin()}/s/{actor.business.slug}/jobs/{id}
          </Link>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Set the status to Open to advertise it on your public jobs page.</p>
      );
    case "privacy-notices":
      return record.published ? (
        <p className="text-sm text-muted-foreground">
          Public link:{" "}
          <Link href={`/s/${actor.business.slug}/privacy/${id}`} className="text-brand hover:underline">
            {siteOrigin()}/s/{actor.business.slug}/privacy/{id}
          </Link>
        </p>
      ) : null;
    case "clients":
      return (
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/app/invoices/new?client_id=${id}`} className={secondaryButtonClass}>
            New invoice
          </Link>
          <Link href={`/app/r/assessments/new?client_id=${id}`} className={secondaryButtonClass}>
            Book assessment
          </Link>
          <Link href={`/app/r/disputes/new?client_id=${id}`} className={secondaryButtonClass}>
            Log a dispute
          </Link>
        </div>
      );
    default:
      return null;
  }
}
