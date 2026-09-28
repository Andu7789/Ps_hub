import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireMember } from "@/lib/auth";
import { getRegister } from "@/lib/registers/defs";
import { listRecords, loadLookups, recordId } from "@/lib/registers/data";
import { displayValue } from "@/lib/registers/values";
import { acknowledgeSupervisionAction, staffCreateRecordAction } from "@/lib/actions/records";
import { ActionForm } from "@/components/forms/action-form";
import { FieldInput } from "@/components/registers/field-input";
import { cardClass, secondaryButtonClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ register: string }> }): Promise<Metadata> {
  return { title: getRegister((await params).register)?.title ?? "Not found" };
}

// A staff member's own records in one register, and the form to add one
// where staff are allowed to (holiday requests, incident reports…).
export default async function MyRegisterPage({ params }: { params: Promise<{ register: string }> }) {
  const def = getRegister((await params).register);
  if (!def?.staff || !def.module) notFound();
  const me = await requireMember();
  if (!(await isModuleEnabled(me.business_id, def.module))) redirect("/me");

  const supabase = await createClient();
  const [rows, lookups] = await Promise.all([
    def.staff.read ? listRecords(supabase, def, me.business_id, { memberId: me.id, limit: 200 }) : [],
    loadLookups(supabase, me.business_id, def),
  ]);
  const shown = def.fields.filter((f) => f.name !== def.memberField);
  const create = def.staff.create;

  return (
    <div className="space-y-6">
      <Link href="/me" className="text-sm text-muted-foreground hover:underline">
        ← My details
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">{create?.label ?? def.title}</h1>

      {create && (
        <section className={cardClass}>
          <ActionForm action={staffCreateRecordAction} submitLabel="Send" pendingLabel="Sending…" resetOnSuccess>
            <input type="hidden" name="register" value={def.key} />
            <div className="grid gap-4 sm:grid-cols-2">
              {create.fields.map((name) => {
                const field = def.fields.find((f) => f.name === name)!;
                return (
                  <div key={name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <FieldInput field={field} value={undefined} optionsOverride={create.options?.[name]} />
                  </div>
                );
              })}
            </div>
          </ActionForm>
          {!def.staff.read && (
            <p className="mt-3 text-xs text-muted-foreground">This goes to your manager in confidence. You won&apos;t see it listed here.</p>
          )}
        </section>
      )}

      {def.staff.read && (
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">{create ? "Sent so far" : def.title}</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={recordId(def, row)} className={cardClass}>
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {shown
                      .filter((f) => row[f.name] !== null && row[f.name] !== undefined && row[f.name] !== "")
                      .map((f) => (
                        <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                          <dt className="text-muted-foreground">{f.label}</dt>
                          <dd className="whitespace-pre-line text-foreground">{displayValue(f, row[f.name], lookups)}</dd>
                        </div>
                      ))}
                  </dl>
                  {def.key === "supervisions" && !row.acknowledged_at && (
                    <form action={acknowledgeSupervisionAction} className="mt-3">
                      <input type="hidden" name="id" value={recordId(def, row)} />
                      <button type="submit" className={secondaryButtonClass}>
                        I&apos;ve read this
                      </button>
                    </form>
                  )}
                  {def.key === "issued-documents" && (
                    <Link href={`/me/documents/${recordId(def, row)}`} className="mt-3 inline-block text-sm text-brand hover:underline">
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
