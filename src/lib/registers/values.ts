import type { FieldDef, RegisterDef } from "@/lib/registers/types";
import { formatCalendarDate, formatDateTime } from "@/lib/format";

const TIMEZONE = "Europe/London";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function londonParts(utcMillis: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMillis));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

// A datetime-local input value is UK wall-clock time; the database stores
// an instant. Works out the offset London had at that moment (GMT or BST)
// rather than using the server's own timezone.
export function londonLocalToIso(local: string): string | null {
  const m = LOCAL_DATETIME.exec(local);
  if (!m) return null;
  const [y, mo, d, h, min] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, min);
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const p = londonParts(guess);
    const wall = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    guess = asUtc - (wall - guess);
  }
  return new Date(guess).toISOString();
}

export function isoToLondonLocal(iso: string): string {
  const p = londonParts(new Date(iso).getTime());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

// Today's date in the UK, as YYYY-MM-DD.
export function londonToday(now: Date = new Date()): string {
  const p = londonParts(now.getTime());
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // Clamp to the end of the target month (31 Jan + 1 month = 28/29 Feb).
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

// Monday to Friday between two dates, both included.
export function weekdaysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const from = Date.UTC(sy, sm - 1, sd);
  const to = Date.UTC(ey, em - 1, ed);
  let count = 0;
  for (let t = from; t <= to; t += 86_400_000) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export type ParseResult = { values: Record<string, unknown>; error?: undefined } | { error: string; values?: undefined };

// Reads the named fields of a register from a submitted form, checking
// each against its type. Unknown or read-only fields are never taken from
// the form, whatever it contains.
export function parseFields(def: RegisterDef, formData: FormData, fieldNames: string[], optionOverrides?: Record<string, { value: string }[]>): ParseResult {
  const values: Record<string, unknown> = {};
  for (const name of fieldNames) {
    const field = def.fields.find((f) => f.name === name);
    if (!field || field.readonly) continue;
    const raw = String(formData.get(name) ?? "").trim();
    const result = parseValue(field, raw, optionOverrides?.[name]);
    if ("error" in result) return { error: result.error };
    values[name] = result.value;
  }
  return { values };
}

function parseValue(field: FieldDef, raw: string, options?: { value: string }[]): { value: unknown } | { error: string } {
  if (field.type === "boolean") return { value: raw === "on" || raw === "true" };
  if (raw === "") {
    return field.required ? { error: `${field.label} is required.` } : { value: null };
  }
  switch (field.type) {
    case "text":
    case "textarea":
    case "tel":
      return raw.length > 10_000 ? { error: `${field.label} is too long.` } : { value: raw };
    case "email":
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw) ? { value: raw.toLowerCase() } : { error: `${field.label} isn't a valid email.` };
    case "date":
      return DATE.test(raw) && !Number.isNaN(Date.parse(raw)) ? { value: raw } : { error: `${field.label} isn't a valid date.` };
    case "datetime": {
      const iso = londonLocalToIso(raw);
      return iso ? { value: iso } : { error: `${field.label} isn't a valid date and time.` };
    }
    case "number":
    case "money": {
      const n = Number(raw.replace(/[£,\s]/g, ""));
      if (!Number.isFinite(n)) return { error: `${field.label} must be a number.` };
      if (field.min !== undefined && n < field.min) return { error: `${field.label} must be at least ${field.min}.` };
      if (field.max !== undefined && n > field.max) return { error: `${field.label} must be at most ${field.max}.` };
      if (field.type === "money" && n < 0) return { error: `${field.label} can't be negative.` };
      return { value: field.type === "money" ? Math.round(n * 100) / 100 : n };
    }
    case "select": {
      const allowed = options ?? field.options ?? [];
      return allowed.some((o) => o.value === raw) ? { value: raw } : { error: `Choose a valid ${field.label.toLowerCase()}.` };
    }
    case "member":
    case "ref":
      return UUID.test(raw) ? { value: raw } : { error: `Choose a ${field.label.toLowerCase()}.` };
  }
}

export type Lookups = Record<string, Map<string, string>>;

// A value as it should read on screen.
export function displayValue(field: FieldDef, value: unknown, lookups: Lookups = {}): string {
  if (value === null || value === undefined || value === "") return field.type === "boolean" ? "No" : "";
  switch (field.type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "date":
      return formatCalendarDate(String(value));
    case "datetime":
      return formatDateTime(String(value));
    case "money":
      return `£${Number(value).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "select":
      return field.options?.find((o) => o.value === String(value))?.label ?? String(value);
    case "member":
      return lookups.member?.get(String(value)) ?? "Unknown person";
    case "ref":
      return lookups[field.ref!]?.get(String(value)) ?? "—";
    default:
      return String(value);
  }
}

// The value to pre-fill in an edit form.
export function inputValue(field: FieldDef, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.type === "datetime") return isoToLondonLocal(String(value));
  return String(value);
}

// Friendly messages for the database errors a form can run into.
export function describeDbError(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case "23502":
      return "A field that can't be left blank is empty.";
    case "23503":
      return "One of the people or items you picked isn't in your business any more.";
    case "23505":
      return "That would duplicate a record that already exists.";
    case "23514":
      return "One of the values isn't allowed. Check the dates and numbers.";
    case "42501":
      return "You don't have permission to do that.";
    default:
      return "Couldn't save. Try again.";
  }
}
