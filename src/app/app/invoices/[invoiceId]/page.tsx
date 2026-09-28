import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager } from "@/lib/auth";
import { INVOICE_STATUS_LABELS, isOverdue, loadInvoices } from "@/lib/invoices";
import {
  addInvoiceLineAction,
  emailInvoiceAction,
  removeInvoiceLineAction,
  setInvoiceStatusAction,
  updateInvoiceAction,
} from "@/lib/actions/invoices";
import { londonToday } from "@/lib/registers/values";
import { formatMoney } from "@/lib/format";
import { ActionForm } from "@/components/forms/action-form";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const actor = await requireManager();
  if (!(await isModuleEnabled(actor.business_id, "clients"))) redirect("/app/modules");
  const supabase = await createClient();
  const [invoice] = /^[0-9a-f-]{36}$/i.test(invoiceId) ? await loadInvoices(supabase, actor.business_id, { id: invoiceId }) : [];
  if (!invoice) notFound();
  const draft = invoice.status === "draft";
  const overdue = isOverdue(invoice, londonToday());

  const statusButton = (status: string, label: string, primary = false) => (
    <form action={setInvoiceStatusAction}>
      <input type="hidden" name="id" value={invoice.id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={primary ? primaryButtonClass : secondaryButtonClass}>
        {label}
      </button>
    </form>
  );

  return (
    <div className="space-y-6">
      <Link href="/app/invoices" className="text-sm text-muted-foreground hover:underline">
        ← Invoices
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">
          {invoice.number}{" "}
          <span className={`text-base font-normal ${overdue ? "text-danger" : "text-muted-foreground"}`}>
            {overdue ? "Overdue" : INVOICE_STATUS_LABELS[invoice.status]}
          </span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/invoices/${invoice.id}/print`} className={secondaryButtonClass}>
            Print or save PDF
          </Link>
          {invoice.status === "draft" && statusButton("sent", "Mark as sent")}
          {invoice.status === "sent" && statusButton("paid", "Mark as paid", true)}
          {(invoice.status === "sent" || invoice.status === "paid") && statusButton("draft", "Back to draft")}
          {invoice.status !== "void" && invoice.status !== "paid" && statusButton("void", "Void")}
        </div>
      </div>

      {invoice.status !== "void" && invoice.status !== "paid" && (
        <section className={cardClass}>
          <ActionForm action={emailInvoiceAction} submitLabel={`Email to ${invoice.client?.email ?? "client"}`} pendingLabel="Sending…">
            <input type="hidden" name="id" value={invoice.id} />
          </ActionForm>
        </section>
      )}

      <InvoiceDocument invoice={invoice} business={actor.business} />

      {draft && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-foreground">Lines</h2>
            {invoice.lines.length > 0 && (
              <ul className="mt-3 divide-y divide-border text-sm">
                {invoice.lines.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {l.description} · {formatMoney(l.line_total)}
                    </span>
                    <form action={removeInvoiceLineAction}>
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <input type="hidden" name="line_id" value={l.id} />
                      <button type="submit" className="text-danger hover:underline">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <ActionForm action={addInvoiceLineAction} submitLabel="Add line" resetOnSuccess>
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <div>
                  <label htmlFor="description" className={labelClass}>
                    Description
                  </label>
                  <input id="description" name="description" required className={`mt-1 ${inputClass}`} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quantity" className={labelClass}>
                      Quantity
                    </label>
                    <input id="quantity" name="quantity" type="number" step="0.01" min="0.01" defaultValue="1" className={`mt-1 ${inputClass}`} />
                  </div>
                  <div>
                    <label htmlFor="unit_price" className={labelClass}>
                      Price each (£)
                    </label>
                    <input id="unit_price" name="unit_price" type="number" step="0.01" min="0" required className={`mt-1 ${inputClass}`} />
                  </div>
                </div>
              </ActionForm>
            </div>
          </section>
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-foreground">Details</h2>
            <div className="mt-4">
              <ActionForm action={updateInvoiceAction} submitLabel="Save">
                <input type="hidden" name="id" value={invoice.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="issued_on" className={labelClass}>
                      Invoice date
                    </label>
                    <input id="issued_on" name="issued_on" type="date" required defaultValue={invoice.issued_on} className={`mt-1 ${inputClass}`} />
                  </div>
                  <div>
                    <label htmlFor="due_on" className={labelClass}>
                      Due
                    </label>
                    <input id="due_on" name="due_on" type="date" required defaultValue={invoice.due_on} className={`mt-1 ${inputClass}`} />
                  </div>
                </div>
                <div>
                  <label htmlFor="notes" className={labelClass}>
                    Notes
                  </label>
                  <textarea id="notes" name="notes" rows={3} defaultValue={invoice.notes ?? ""} className={`mt-1 ${inputClass}`} />
                </div>
              </ActionForm>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
