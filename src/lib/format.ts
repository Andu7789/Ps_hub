const TIMEZONE = "Europe/London";

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TIMEZONE });
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
}

// A plain "YYYY-MM-DD" date column (no time, no zone) — parsed as a
// calendar date so it never shifts a day either side of midnight UTC.
export function formatCalendarDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const EMPLOYMENT_TYPE_LABELS = {
  full_time: "Full time",
  part_time: "Part time",
  zero_hours: "Zero hours",
  casual: "Casual",
  contractor: "Contractor",
} as const;
