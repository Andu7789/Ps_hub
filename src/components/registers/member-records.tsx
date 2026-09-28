import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Membership } from "@/lib/auth";
import type { ModuleKey } from "@/lib/modules";
import { REGISTERS } from "@/lib/registers/defs";
import { listRecords, loadLookups } from "@/lib/registers/data";
import { londonToday } from "@/lib/registers/values";
import { bradfordFactor, holidayBalance, type AbsenceRow } from "@/lib/absence";
import { formatCalendarDate } from "@/lib/format";
import { addStandardOnboardingAction } from "@/lib/actions/custom";
import { RecordTable } from "@/components/registers/record-table";
import { FileList } from "@/components/files/file-list";
import { cardClass, secondaryButtonClass } from "@/components/ui/styles";
import type { Member } from "@/lib/types";

// Everything recorded about one person across the modules that are on,
// for their staff page: absence summary, then one section per register.
export async function MemberRecords({
  actor,
  member,
  enabled,
  allowanceDays,
}: {
  actor: Membership;
  member: Member;
  enabled: Set<ModuleKey>;
  allowanceDays: number | null;
}) {
  const supabase = await createClient();
  const registers = REGISTERS.filter(
    (r) => r.memberField && r.module && enabled.has(r.module) && (r.minRole !== "owner" || actor.role === "owner")
  );
  const sections = await Promise.all(
    registers.map(async (def) => ({
      def,
      rows: await listRecords(supabase, def, actor.business_id, { memberId: member.id, limit: 100 }),
      lookups: await loadLookups(supabase, actor.business_id, def),
    }))
  );

  const absences = sections.find((s) => s.def.key === "absences");
  const today = londonToday();
  const bradford = absences ? bradfordFactor(absences.rows as unknown as AbsenceRow[], today) : null;
  const balance = absences
    ? holidayBalance(absences.rows as unknown as AbsenceRow[], allowanceDays === null ? null : Number(allowanceDays), today, actor.business.leave_year_start_month)
    : null;
  const onboarding = sections.find((s) => s.def.key === "onboarding");

  return (
    <div className="space-y-6">
      {bradford && balance && (
        <section className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
          <div>
            <h2 className="text-base font-semibold text-foreground">Holiday this leave year</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCalendarDate(balance.year.start)} to {formatCalendarDate(balance.year.end)}
            </p>
            <p className="mt-2 text-sm text-foreground">
              {balance.approved} days taken or booked
              {balance.requested > 0 && `, ${balance.requested} requested`}
              {balance.remaining !== null ? `. ${balance.remaining} days left.` : ". Set their allowance above to see what's left."}
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Bradford Factor</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sickness in the last 12 months: spells² × days.</p>
            <p className={`mt-2 text-sm ${bradford.score >= 200 ? "text-danger" : "text-foreground"}`}>
              {bradford.score} ({bradford.spells} {bradford.spells === 1 ? "spell" : "spells"}, {bradford.days} days)
            </p>
          </div>
        </section>
      )}

      {onboarding && onboarding.rows.length === 0 && member.status === "active" && (
        <form action={addStandardOnboardingAction} className={cardClass}>
          <input type="hidden" name="member_id" value={member.id} />
          <p className="text-sm text-foreground">No onboarding checklist yet.</p>
          <button type="submit" className={`mt-3 ${secondaryButtonClass}`}>
            Add the standard onboarding checklist
          </button>
        </form>
      )}

      {sections.map(({ def, rows, lookups }) => (
        <section key={def.key}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">{def.title}</h2>
            {!def.noCreate && (
              <Link href={`/app/r/${def.key}/new?${def.memberField}=${member.id}`} className="text-sm text-brand hover:underline">
                Add {def.singular}
              </Link>
            )}
          </div>
          <RecordTable
            def={def}
            rows={rows}
            lookups={lookups}
            hrefBase={`/app/r/${def.key}`}
            columns={def.list.filter((c) => c !== def.memberField)}
          />
        </section>
      ))}

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Files</h2>
          <Link href={`/app/files?member_id=${member.id}`} className="text-sm text-brand hover:underline">
            Upload a file
          </Link>
        </div>
        <FileList businessId={actor.business_id} memberId={member.id} />
      </section>
    </div>
  );
}
