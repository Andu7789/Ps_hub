import type { Business } from "@/lib/types";
import { invoiceTotal, type Invoice } from "@/lib/invoices";
import { formatCalendarDate, formatMoney } from "@/lib/format";

// The invoice itself, as the client sees it. Used on the invoice page and
// the print view.
export function InvoiceDocument({ invoice, business }: { invoice: Invoice; business: Business }) {
  return (
    <article className="rounded-xl border border-border bg-card p-8 text-sm print:border-0 print:p-0">
      <div className="flex flex-wrap justify-between gap-6">
        <div>
          <p className="text-lg font-semibold text-foreground">{business.name}</p>
          <p className="whitespace-pre-line text-muted-foreground">
            {[business.address, business.phone, business.contact_email].filter(Boolean).join("\n")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-foreground">Invoice</p>
          <p className="text-foreground">{invoice.number}</p>
          <p className="text-muted-foreground">Date: {formatCalendarDate(invoice.issued_on)}</p>
          <p className="text-muted-foreground">Due: {formatCalendarDate(invoice.due_on)}</p>
        </div>
      </div>
      <div className="mt-6">
        <p className="text-muted-foreground">Bill to</p>
        <p className="font-medium text-foreground">{invoice.client?.name}</p>
        {invoice.client?.contact_name && <p className="text-foreground">{invoice.client.contact_name}</p>}
        {invoice.client?.address && <p className="whitespace-pre-line text-foreground">{invoice.client.address}</p>}
      </div>
      <table className="mt-6 w-full text-left">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Price</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoice.lines.map((l) => (
            <tr key={l.id}>
              <td className="py-2 text-foreground">{l.description}</td>
              <td className="py-2 text-right">{Number(l.quantity)}</td>
              <td className="py-2 text-right">{formatMoney(l.unit_price)}</td>
              <td className="py-2 text-right">{formatMoney(l.line_total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 text-right font-semibold text-foreground">
              Total
            </td>
            <td className="pt-3 text-right font-semibold text-foreground">{formatMoney(invoiceTotal(invoice))}</td>
          </tr>
        </tfoot>
      </table>
      {invoice.notes && <p className="mt-6 whitespace-pre-line text-foreground">{invoice.notes}</p>}
      {invoice.status === "paid" && invoice.paid_on && (
        <p className="mt-6 font-semibold text-success">Paid {formatCalendarDate(invoice.paid_on)}. Thank you.</p>
      )}
    </article>
  );
}
