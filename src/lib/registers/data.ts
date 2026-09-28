import type { SupabaseClient } from "@supabase/supabase-js";
import { getRegister, REGISTERS } from "@/lib/registers/defs";
import { addDays, londonToday, type Lookups } from "@/lib/registers/values";
import type { RegisterDef } from "@/lib/registers/types";
import type { ModuleKey } from "@/lib/modules";

export type RecordRow = Record<string, unknown> & { id?: string };

export function recordId(def: RegisterDef, row: RecordRow): string {
  return String(row[def.idColumn ?? "id"]);
}

export function isClosed(def: RegisterDef, row: RecordRow): boolean {
  if (!def.closedWhen) return false;
  return def.closedWhen.values.includes(row[def.closedWhen.field] as string | boolean);
}

// Names for everything a register's fields point at: people for member
// fields, and each referenced register's records by their title field.
export async function loadLookups(supabase: SupabaseClient, businessId: string, def: RegisterDef): Promise<Lookups> {
  const lookups: Lookups = {};
  const jobs: Promise<void>[] = [];
  if (def.fields.some((f) => f.type === "member")) {
    jobs.push(
      (async () => {
        const { data } = await supabase.from("hub_members").select("id, full_name").eq("business_id", businessId);
        lookups.member = new Map((data ?? []).map((m) => [m.id as string, m.full_name as string]));
      })()
    );
  }
  for (const field of def.fields.filter((f) => f.type === "ref")) {
    const target = getRegister(field.ref!)!;
    jobs.push(
      (async () => {
        const { data } = await supabase
          .from(target.table)
          .select(`id, ${target.titleField}`)
          .eq("business_id", businessId)
          .order(target.titleField)
          .limit(1000);
        lookups[field.ref!] = new Map(
          ((data ?? []) as unknown as RecordRow[]).map((r) => [String(r.id), String(r[target.titleField] ?? "")])
        );
      })()
    );
  }
  await Promise.all(jobs);
  return lookups;
}

export async function listRecords(
  supabase: SupabaseClient,
  def: RegisterDef,
  businessId: string,
  opts: { memberId?: string; refField?: string; refId?: string; limit?: number } = {}
): Promise<RecordRow[]> {
  let query = supabase.from(def.table).select("*").eq("business_id", businessId);
  if (opts.memberId && def.memberField) query = query.eq(def.memberField, opts.memberId);
  if (opts.refField && opts.refId) query = query.eq(opts.refField, opts.refId);
  const { data } = await query
    .order(def.order.column, { ascending: def.order.ascending, nullsFirst: false })
    .limit(opts.limit ?? 500);
  return (data ?? []) as RecordRow[];
}

export async function getRecord(supabase: SupabaseClient, def: RegisterDef, businessId: string, id: string): Promise<RecordRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from(def.table)
    .select("*")
    .eq("business_id", businessId)
    .eq(def.idColumn ?? "id", id)
    .maybeSingle();
  return (data as RecordRow | null) ?? null;
}

export type DueItem = {
  register: string;
  registerTitle: string;
  id: string;
  title: string;
  label: string;
  date: string;
  overdue: boolean;
  memberId: string | null;
};

// Everything with a date coming up in the next `horizonDays` (or already
// past) across the registers of the modules that are on, soonest first.
// Used by the overview page and the daily reminder email.
export async function collectDueItems(
  supabase: SupabaseClient,
  businessId: string,
  enabled: Set<ModuleKey>,
  opts: { horizonDays?: number; today?: string; memberId?: string } = {}
): Promise<DueItem[]> {
  const today = opts.today ?? londonToday();
  const horizon = addDays(today, opts.horizonDays ?? 30);
  const items: DueItem[] = [];

  const jobs = REGISTERS.filter((def) => def.module && enabled.has(def.module) && def.due?.length).flatMap((def) =>
    def.due!.map(async ({ field, label }) => {
      const fieldDef = def.fields.find((f) => f.name === field)!;
      const upper = fieldDef.type === "datetime" ? `${horizon}T23:59:59Z` : horizon;
      let query = supabase.from(def.table).select("*").eq("business_id", businessId).not(field, "is", null).lte(field, upper);
      if (opts.memberId) {
        if (!def.memberField) return;
        query = query.eq(def.memberField, opts.memberId);
      }
      const { data } = await query.limit(200);
      for (const row of (data ?? []) as RecordRow[]) {
        if (isClosed(def, row)) continue;
        const date = String(row[field]).slice(0, 10);
        items.push({
          register: def.key,
          registerTitle: def.title,
          id: recordId(def, row),
          title: String(row[def.titleField] ?? def.singular),
          label,
          date,
          overdue: date < today,
          memberId: def.memberField ? ((row[def.memberField] as string | null) ?? null) : null,
        });
      }
    })
  );

  // Two deadlines that aren't a plain date column.
  if (enabled.has("gdpr") && !opts.memberId) {
    jobs.push(
      (async () => {
        const { data } = await supabase
          .from("hub_breaches")
          .select("id, description, discovered_at, status")
          .eq("business_id", businessId)
          .eq("ico_reportable", true)
          .is("reported_to_ico_at", null)
          .neq("status", "closed");
        for (const b of data ?? []) {
          const deadline = new Date(new Date(b.discovered_at as string).getTime() + 72 * 3600 * 1000).toISOString();
          items.push({
            register: "breaches",
            registerTitle: "Data breaches",
            id: b.id as string,
            title: String(b.description).slice(0, 80),
            label: "Report to the ICO (72 hours)",
            date: deadline.slice(0, 10),
            overdue: deadline < new Date().toISOString(),
            memberId: null,
          });
        }
      })()
    );
  }
  if (enabled.has("clients") && !opts.memberId) {
    jobs.push(
      (async () => {
        const { data } = await supabase
          .from("hub_invoices")
          .select("id, number, due_on")
          .eq("business_id", businessId)
          .eq("status", "sent")
          .lte("due_on", horizon);
        for (const inv of data ?? []) {
          items.push({
            register: "invoices",
            registerTitle: "Invoices",
            id: inv.id as string,
            title: inv.number as string,
            label: "Invoice payment due",
            date: inv.due_on as string,
            overdue: (inv.due_on as string) < today,
            memberId: null,
          });
        }
      })()
    );
  }

  await Promise.all(jobs);
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export function dueItemHref(item: DueItem): string {
  return item.register === "invoices" ? `/app/invoices/${item.id}` : `/app/r/${item.register}/${item.id}`;
}
