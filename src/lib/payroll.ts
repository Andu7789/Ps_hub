import { weekdaysBetween } from "@/lib/registers/values";

export type PayrollInput = {
  members: { id: string; full_name: string; email: string }[];
  payDetails: { member_id: string; payroll_id: string | null; pay_type: string; rate: number | null; tax_code: string | null; ni_number: string | null; pension_status: string }[];
  timesheets: { member_id: string; work_on: string; hours: number; status: string }[];
  absences: { member_id: string; kind: string; start_on: string; end_on: string; status: string }[];
};

export type PayrollRow = {
  name: string;
  email: string;
  payrollId: string;
  payType: string;
  rate: string;
  taxCode: string;
  niNumber: string;
  pension: string;
  hours: number;
  holidayDays: number;
  sickDays: number;
  unpaidDays: number;
  otherLeaveDays: number;
};

// Weekdays of an absence that fall inside the pay period.
function daysInPeriod(a: { start_on: string; end_on: string }, from: string, to: string): number {
  const start = a.start_on > from ? a.start_on : from;
  const end = a.end_on < to ? a.end_on : to;
  return start > end ? 0 : weekdaysBetween(start, end);
}

// One row per person for a pay period: approved hours, and leave taken
// in the period, for the payroll provider to run pay from. Holiday counts
// only once approved; sickness and other leave once recorded.
export function payrollRows(input: PayrollInput, from: string, to: string): PayrollRow[] {
  return input.members.map((m) => {
    const pay = input.payDetails.find((p) => p.member_id === m.id);
    const hours = input.timesheets
      .filter((t) => t.member_id === m.id && t.status === "approved" && t.work_on >= from && t.work_on <= to)
      .reduce((s, t) => s + Number(t.hours), 0);
    const leave = (kinds: string[]) =>
      input.absences
        .filter((a) => a.member_id === m.id && kinds.includes(a.kind) && (a.status === "approved" || a.status === "recorded"))
        .reduce((s, a) => s + daysInPeriod(a, from, to), 0);
    return {
      name: m.full_name,
      email: m.email,
      payrollId: pay?.payroll_id ?? "",
      payType: pay?.pay_type ?? "",
      rate: pay?.rate != null ? Number(pay.rate).toFixed(2) : "",
      taxCode: pay?.tax_code ?? "",
      niNumber: pay?.ni_number ?? "",
      pension: pay?.pension_status ?? "",
      hours: Math.round(hours * 100) / 100,
      holidayDays: leave(["holiday"]),
      sickDays: leave(["sickness"]),
      unpaidDays: leave(["unpaid"]),
      otherLeaveDays: leave(["compassionate", "parental", "other"]),
    };
  });
}

function csvCell(value: string | number): string {
  const text = String(value);
  // Quote anything with a comma, quote or newline, and neutralise a
  // leading = + - @ so a spreadsheet never runs it as a formula.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function payrollCsv(rows: PayrollRow[]): string {
  const header = ["Name", "Email", "Payroll ID", "Pay type", "Rate", "Tax code", "NI number", "Pension", "Approved hours", "Holiday days", "Sick days", "Unpaid days", "Other leave days"];
  const lines = rows.map((r) =>
    [r.name, r.email, r.payrollId, r.payType, r.rate, r.taxCode, r.niNumber, r.pension, r.hours, r.holidayDays, r.sickDays, r.unpaidDays, r.otherLeaveDays]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...lines].join("\r\n") + "\r\n";
}
