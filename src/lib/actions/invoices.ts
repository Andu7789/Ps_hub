"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager } from "@/lib/auth";
import { escapeHtml, sendEmail } from "@/lib/notify";
import { formatCalendarDate, formatMoney } from "@/lib/format";
import { describeDbError, londonToday } from "@/lib/registers/values";
import { field, optionalField, type ActionState } from "@/lib/action-state";

async function requireInvoicing() {
  const actor = await requireManager();
  if (!(await isModuleEnabled(actor.business_id, "clients"))) redirect("/app/modules");
  return actor;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireInvoicing();
  const clientId = field(formData, "client_id");
  const issuedOn = field(formData, "issued_on");
  const dueOn = field(formData, "due_on");
  if (!clientId) return { error: "Choose a client." };
  if (!DATE.test(issuedOn) || !DATE.test(dueOn)) return { error: "Enter the invoice and due dates." };
  if (dueOn < issuedOn) return { error: "The due date can't be before the invoice date." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hub_invoices")
    .insert({ business_id: actor.business_id, client_id: clientId, issued_on: issuedOn, due_on: dueOn, notes: optionalField(formData, "notes") })
    .select("id")
    .single();
  if (error || !data) return { error: error ? describeDbError(error) : "Couldn't create the invoice." };
  redirect(`/app/invoices/${data.id}`);
}

export async function updateInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireInvoicing();
  const issuedOn = field(formData, "issued_on");
  const dueOn = field(formData, "due_on");
  if (!DATE.test(issuedOn) || !DATE.test(dueOn)) return { error: "Enter the invoice and due dates." };
  if (dueOn < issuedOn) return { error: "The due date can't be before the invoice date." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("hub_invoices")
    .update({ issued_on: issuedOn, due_on: dueOn, notes: optionalField(formData, "notes") })
    .eq("id", field(formData, "id"))
    .eq("business_id", actor.business_id);
  if (error) return { error: describeDbError(error) };
  revalidatePath(`/app/invoices/${field(formData, "id")}`);
  return { ok: "Saved." };
}

export async function addInvoiceLineAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireInvoicing();
  const invoiceId = field(formData, "invoice_id");
  const description = field(formData, "description");
  const quantity = Number(field(formData, "quantity") || "1");
  const unitPrice = Number(field(formData, "unit_price").replace(/[£,\s]/g, ""));
  if (!description) return { error: "Describe the work or item." };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Quantity must be more than 0." };
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return { error: "Enter a price." };

  const supabase = await createClient();
  const { data: invoice } = await supabase.from("hub_invoices").select("status").eq("id", invoiceId).eq("business_id", actor.business_id).maybeSingle();
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status !== "draft") return { error: "Only draft invoices can be changed." };

  const { error } = await supabase.from("hub_invoice_lines").insert({
    business_id: actor.business_id,
    invoice_id: invoiceId,
    description,
    quantity: Math.round(quantity * 100) / 100,
    unit_price: Math.round(unitPrice * 100) / 100,
    // Seconds since 1970 keeps lines in the order they were added.
    position: Math.floor(Date.now() / 1000),
  });
  if (error) return { error: describeDbError(error) };
  revalidatePath(`/app/invoices/${invoiceId}`);
  return { ok: "Line added." };
}

export async function removeInvoiceLineAction(formData: FormData) {
  const actor = await requireInvoicing();
  const invoiceId = field(formData, "invoice_id");
  const supabase = await createClient();
  const { data: invoice } = await supabase.from("hub_invoices").select("status").eq("id", invoiceId).eq("business_id", actor.business_id).maybeSingle();
  if (invoice?.status === "draft") {
    await supabase.from("hub_invoice_lines").delete().eq("id", field(formData, "line_id")).eq("invoice_id", invoiceId);
  }
  revalidatePath(`/app/invoices/${invoiceId}`);
  redirect(`/app/invoices/${invoiceId}`);
}

export async function setInvoiceStatusAction(formData: FormData) {
  const actor = await requireInvoicing();
  const id = field(formData, "id");
  const status = field(formData, "status");
  if (!["draft", "sent", "paid", "void"].includes(status)) redirect(`/app/invoices/${id}`);
  const supabase = await createClient();
  await supabase
    .from("hub_invoices")
    .update({ status, paid_on: status === "paid" ? londonToday() : null })
    .eq("id", id)
    .eq("business_id", actor.business_id);
  revalidatePath("/app/invoices");
  redirect(`/app/invoices/${id}`);
}

// Emails the invoice to the client's address and marks it as sent.
export async function emailInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireInvoicing();
  const id = field(formData, "id");
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("hub_invoices")
    .select("*, client:hub_clients(name, email), lines:hub_invoice_lines(description, quantity, unit_price, line_total, position)")
    .eq("id", id)
    .eq("business_id", actor.business_id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found." };
  const client = invoice.client as { name: string; email: string | null } | null;
  if (!client?.email) return { error: "Add an email address to the client first." };
  const lines = ((invoice.lines ?? []) as { description: string; quantity: number; unit_price: number; line_total: number; position: number }[]).sort(
    (a, b) => a.position - b.position
  );
  if (lines.length === 0) return { error: "Add at least one line first." };
  const total = lines.reduce((s, l) => s + Number(l.line_total), 0);
  const b = actor.business;

  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:4px 8px;">${escapeHtml(l.description)}</td><td style="padding:4px 8px;text-align:right;">${l.quantity}</td><td style="padding:4px 8px;text-align:right;">${formatMoney(l.unit_price)}</td><td style="padding:4px 8px;text-align:right;">${formatMoney(l.line_total)}</td></tr>`
    )
    .join("");
  const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
    <h1 style="font-size:18px;">${escapeHtml(b.name)}</h1>
    <p>Dear ${escapeHtml(client.name)},</p>
    <p>Please find invoice <strong>${escapeHtml(invoice.number)}</strong> below, due by ${formatCalendarDate(invoice.due_on)}.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;"><thead><tr style="text-align:left;border-bottom:1px solid #ddd;"><th style="padding:4px 8px;">Description</th><th style="padding:4px 8px;text-align:right;">Qty</th><th style="padding:4px 8px;text-align:right;">Price</th><th style="padding:4px 8px;text-align:right;">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="text-align:right;font-weight:600;">Total due: ${formatMoney(total)}</p>
    ${invoice.notes ? `<p>${escapeHtml(invoice.notes)}</p>` : ""}
    <p style="font-size:12px;color:#5b6b68;">${escapeHtml([b.address, b.phone, b.contact_email].filter(Boolean).join(" · "))}</p>
  </div>`;
  try {
    await sendEmail(client.email, `Invoice ${invoice.number} from ${b.name}`, html);
  } catch (err) {
    console.error("Invoice email failed", err);
    return { error: "The email didn't send. Try again." };
  }
  if (invoice.status === "draft") {
    await supabase.from("hub_invoices").update({ status: "sent" }).eq("id", id);
  }
  revalidatePath(`/app/invoices/${id}`);
  return { ok: `Emailed to ${client.email}.` };
}
