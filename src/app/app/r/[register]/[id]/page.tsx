import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegister, REGISTERS } from "@/lib/registers/defs";
import { getRecord, listRecords, loadLookups } from "@/lib/registers/data";
import { loadRegisterPage } from "@/lib/registers/page-context";
import { displayValue } from "@/lib/registers/values";
import { deleteRecordAction } from "@/lib/actions/records";
import { getEnabledModules } from "@/lib/auth";
import { RecordForm } from "@/components/registers/record-form";
import { RecordTable } from "@/components/registers/record-table";
import { RecordExtras } from "@/components/registers/extras";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { cardClass, secondaryButtonClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ register: string }> }): Promise<Metadata> {
  return { title: getRegister((await params).register)?.singular ?? "Not found" };
}

export default async function RecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ register: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; v?: string }>;
}) {
  const { register, id } = await params;
  const { saved, error, v } = await searchParams;
  const { def, actor, lookups, memberChoices, supabase } = await loadRegisterPage(register);
  const record = await getRecord(supabase, def, actor.business_id, id);
  if (!record) notFound();

  const readonly = def.fields.filter((f) => f.readonly && record[f.name] !== null && record[f.name] !== undefined);
  const title = displayValue(def.fields.find((f) => f.name === def.titleField)!, record[def.titleField], lookups);

  // Other registers pointing at this record (a client's assessments,
  // invoices aside, a supplier's orders…).
  const enabled = await getEnabledModules(actor.business_id);
  const related = await Promise.all(
    REGISTERS.filter((r) => (!r.module || enabled.has(r.module)) && r.minRole !== "owner")
      .flatMap((r) => r.fields.filter((f) => f.type === "ref" && f.ref === def.key).map((f) => ({ r, f })))
      .map(async ({ r, f }) => ({
        def: r,
        rows: await listRecords(supabase, r, actor.business_id, { refField: f.name, refId: id, limit: 50 }),
        lookups: await loadLookups(supabase, actor.business_id, r),
      }))
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/app/r/${def.key}`} className="text-sm text-muted-foreground hover:underline">
          ← {def.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{title || def.singular}</h1>
      </div>

      {saved && (
        <p role="status" className="text-sm text-success">
          Saved.
        </p>
      )}
      {error === "delete" && (
        <p role="alert" className="text-sm text-danger">
          Couldn&apos;t delete this. Other records may depend on it, or it may be signed.
        </p>
      )}

      <RecordExtras def={def} record={record} actor={actor} lookups={lookups} />

      {readonly.length > 0 && (
        <dl className={`${cardClass} grid gap-3 text-sm sm:grid-cols-3`}>
          {readonly.map((f) => (
            <div key={f.name}>
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="whitespace-pre-line text-foreground">{displayValue(f, record[f.name], lookups)}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className={cardClass}>
        <RecordForm key={v} def={def} record={record} lookups={lookups} memberChoices={memberChoices} />
      </section>

      {related
        .filter((r) => r.rows.length > 0)
        .map((r) => (
          <section key={r.def.key}>
            <h2 className="mb-2 text-base font-semibold text-foreground">{r.def.title}</h2>
            <RecordTable def={r.def} rows={r.rows} lookups={r.lookups} hrefBase={`/app/r/${r.def.key}`} />
          </section>
        ))}

      <form action={deleteRecordAction} className="border-t border-border pt-4">
        <input type="hidden" name="register" value={def.key} />
        <input type="hidden" name="id" value={id} />
        <ConfirmButton message={`Delete this ${def.singular}? This can't be undone.`} className={`${secondaryButtonClass} text-danger`}>
          Delete {def.singular}
        </ConfirmButton>
      </form>
    </div>
  );
}
