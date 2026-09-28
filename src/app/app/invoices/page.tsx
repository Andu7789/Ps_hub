import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager } from "@/lib/auth";
import { INVOICE_STATUS_LABELS, invoiceTotal, isOverdue, loadInvoices } from "@/lib/invoices";
import { londonToday } from "@/lib/registers/values";
import { formatCalendarDate, formatMoney } from "@/lib/format";
import { cardClass, primaryButtonClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const actor = await requireManager();
  if (!(await isModuleEnabled(actor.business_id, "clients"))) redirect("/app/modules");
  const supabase = await createClient();
  const invoices = await loadInvoices(supabase, actor.business_id);
  const today = londonToday();
  const outstanding = invoices.filter((i) => i.status === "sent");
  const overdue = outstanding.filter((i) => isOverdue(i, today));

  return (
    <div className="space-y-4">
      <Link href="/app/m/clients" className="text-sm text-muted-foreground hover:underline">
        ← Clients
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
        <Link href="/app/invoices/new" className={primaryButtonClass}>
          New invoice
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{formatMoney(outstanding.reduce((s, i) => s + invoiceTotal(i), 0))}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className={`mt-1 text-2xl font-semibold ${overdue.length ? "text-danger" : "text-foreground"}`}>
            {formatMoney(overdue.reduce((s, i) => s + invoiceTotal(i), 0))}
          </p>
        </div>
      </div>
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-2">
                    <Link href={`/app/invoices/${inv.id}`} className="font-medium text-foreground hover:text-brand">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{inv.client?.name}</td>
                  <td className="px-4 py-2">{formatCalendarDate(inv.issued_on)}</td>
                  <td className={`px-4 py-2 ${isOverdue(inv, today) ? "font-medium text-danger" : ""}`}>{formatCalendarDate(inv.due_on)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(invoiceTotal(inv))}</td>
                  <td className="px-4 py-2">{isOverdue(inv, today) ? "Overdue" : INVOICE_STATUS_LABELS[inv.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
