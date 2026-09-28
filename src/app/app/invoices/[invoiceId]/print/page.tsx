import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import { loadInvoices } from "@/lib/invoices";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { PrintButton } from "@/components/ui/print-button";

export const metadata: Metadata = { title: "Invoice" };

// Just the invoice, for printing or saving as a PDF from the browser.
export default async function PrintInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const actor = await requireManager();
  const supabase = await createClient();
  const [invoice] = /^[0-9a-f-]{36}$/i.test(invoiceId) ? await loadInvoices(supabase, actor.business_id, { id: invoiceId }) : [];
  if (!invoice) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PrintButton />
      <InvoiceDocument invoice={invoice} business={actor.business} />
    </div>
  );
}
