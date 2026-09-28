import { addMonths } from "@/lib/registers/values";

export type AbsenceRow = {
  kind: string;
  start_on: string;
  end_on: string;
  days: number | string | null;
  status: string;
};

// Bradford Factor: spells² × days, over sickness in the 52 weeks up to
// `today`. Frequent short absences score far higher than one long one.
export function bradfordFactor(absences: AbsenceRow[], today: string): { spells: number; days: number; score: number } {
  const since = addMonths(today, -12);
  const sickness = absences.filter((a) => a.kind === "sickness" && a.end_on >= since && a.start_on <= today);
  const spells = sickness.length;
  const days = sickness.reduce((sum, a) => sum + Number(a.days ?? 0), 0);
  return { spells, days, score: spells * spells * days };
}

// The leave year containing `today`, given the month it starts in.
export function leaveYear(today: string, startMonth: number): { start: string; end: string } {
  const [y, m] = today.split("-").map(Number);
  const startYear = m >= startMonth ? y : y - 1;
  const start = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
  const next = addMonths(start, 12);
  const [ny, nm, nd] = next.split("-").map(Number);
  const end = new Date(Date.UTC(ny, nm - 1, nd - 1)).toISOString().slice(0, 10);
  return { start, end };
}

// Holiday taken or booked (approved) in this leave year, and what's left
// of the allowance.
export function holidayBalance(absences: AbsenceRow[], allowance: number | null, today: string, startMonth: number) {
  const year = leaveYear(today, startMonth);
  const inYear = absences.filter((a) => a.kind === "holiday" && a.start_on >= year.start && a.start_on <= year.end);
  const approved = inYear.filter((a) => a.status === "approved" || a.status === "recorded").reduce((s, a) => s + Number(a.days ?? 0), 0);
  const requested = inYear.filter((a) => a.status === "requested").reduce((s, a) => s + Number(a.days ?? 0), 0);
  return { year, approved, requested, remaining: allowance === null ? null : allowance - approved };
}
