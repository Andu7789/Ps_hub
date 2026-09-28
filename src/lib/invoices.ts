import type { SupabaseClient } from "@supabase/supabase-js";

export type InvoiceLine = { id: string; description: string; quantity: number; unit_price: number; line_total: number; position: number };
export type Invoice = {
  id: string;
  number: string;
  client_id: string;
  issued_on: string;
  due_on: string;
  status: "draft" | "sent" | "paid" | "void";
  paid_on: string | null;
  notes: string | null;
  client: { id: string; name: string; email: string | null; address: string | null; contact_name: string | null } | null;
  lines: InvoiceLine[];
};

export const INVOICE_STATUS_LABELS = { draft: "Draft", sent: "Sent", paid: "Paid", void: "Void" } as const;

export function invoiceTotal(invoice: Pick<Invoice, "lines">): number {
  return invoice.lines.reduce((sum, l) => sum + Number(l.line_total), 0);
}

export function isOverdue(invoice: Pick<Invoice, "status" | "due_on">, today: string): boolean {
  return invoice.status === "sent" && invoice.due_on < today;
}

export async function loadInvoices(supabase: SupabaseClient, businessId: string, opts: { id?: string } = {}): Promise<Invoice[]> {
  let query = supabase
    .from("hub_invoices")
    .select("*, client:hub_clients(id, name, email, address, contact_name), lines:hub_invoice_lines(*)")
    .eq("business_id", businessId)
    .order("issued_on", { ascending: false });
  if (opts.id) query = query.eq("id", opts.id);
  const { data } = await query;
  return ((data ?? []) as Invoice[]).map((inv) => ({ ...inv, lines: [...inv.lines].sort((a, b) => a.position - b.position) }));
}
