import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager } from "@/lib/auth";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { addDays, londonToday } from "@/lib/registers/values";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ client_id?: string }> }) {
  const { client_id } = await searchParams;
  const actor = await requireManager();
  if (!(await isModuleEnabled(actor.business_id, "clients"))) redirect("/app/modules");
  const supabase = await createClient();
  const { data: clients } = await supabase.from("hub_clients").select("id, name").eq("business_id", actor.business_id).order("name");
  const today = londonToday();

  return (
    <div className="max-w-lg space-y-4">
      <Link href="/app/invoices" className="text-sm text-muted-foreground hover:underline">
        ← Invoices
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">New invoice</h1>
      {(clients ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/app/r/clients/new" className="text-brand hover:underline">
            Add a client
          </Link>{" "}
          first.
        </p>
      ) : (
        <section className={cardClass}>
          <ActionForm action={createInvoiceAction} submitLabel="Create draft">
            <div>
              <label htmlFor="client_id" className={labelClass}>
                Client
              </label>
              <select id="client_id" name="client_id" required defaultValue={client_id ?? ""} className={`mt-1 ${inputClass}`}>
                <option value="">Choose…</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="issued_on" className={labelClass}>
                  Invoice date
                </label>
                <input id="issued_on" name="issued_on" type="date" required defaultValue={today} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label htmlFor="due_on" className={labelClass}>
                  Due
                </label>
                <input id="due_on" name="due_on" type="date" required defaultValue={addDays(today, 30)} className={`mt-1 ${inputClass}`} />
              </div>
            </div>
            <div>
              <label htmlFor="notes" className={labelClass}>
                Notes (shown on the invoice)
              </label>
              <textarea id="notes" name="notes" rows={3} placeholder="e.g. Bank details for payment" className={`mt-1 ${inputClass}`} />
            </div>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
