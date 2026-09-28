import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireOwner } from "@/lib/auth";
import { loadPayrollRows, validPeriod } from "@/lib/payroll-data";
import { addDays, addMonths, londonToday } from "@/lib/registers/values";
import { formatCalendarDate } from "@/lib/format";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Payroll export" };

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const query = await searchParams;
  const owner = await requireOwner();
  if (!(await isModuleEnabled(owner.business_id, "payroll"))) redirect("/app/modules");

  // Defaults to last calendar month.
  const today = londonToday();
  const thisMonthStart = `${today.slice(0, 7)}-01`;
  const period = validPeriod(query.from, query.to) ?? { from: addMonths(thisMonthStart, -1), to: addDays(thisMonthStart, -1) };
  const supabase = await createClient();
  const rows = await loadPayrollRows(supabase, owner.business_id, period.from, period.to);
  const { count: pending } = await supabase
    .from("hub_timesheets")
    .select("id", { count: "exact", head: true })
    .eq("business_id", owner.business_id)
    .eq("status", "submitted")
    .gte("work_on", period.from)
    .lte("work_on", period.to);
  const csvHref = `/api/payroll-export?from=${period.from}&to=${period.to}`;

  return (
    <div className="space-y-4">
      <Link href="/app/m/payroll" className="text-sm text-muted-foreground hover:underline">
        ← Payroll Connect
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">Payroll export</h1>
      <p className="text-sm text-muted-foreground">
        Approved hours and leave per person, with their pay details, as a CSV for your payroll provider. Your provider
        calculates tax and NI and makes the HMRC submissions; record each run under{" "}
        <Link href="/app/r/payroll-runs" className="text-brand hover:underline">
          Pay runs
        </Link>
        .
      </p>

      <form className={`${cardClass} flex flex-wrap items-end gap-3`}>
        <div>
          <label htmlFor="from" className={labelClass}>
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={period.from} className={`mt-1 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="to" className={labelClass}>
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={period.to} className={`mt-1 ${inputClass}`} />
        </div>
        <button type="submit" className={secondaryButtonClass}>
          Show
        </button>
        <a href={csvHref} className={primaryButtonClass}>
          Download CSV
        </a>
      </form>

      {pending ? (
        <p role="status" className="text-sm text-danger">
          {pending} timesheet {pending === 1 ? "entry is" : "entries are"} still waiting for approval in this period and{" "}
          {pending === 1 ? "isn't" : "aren't"} counted.{" "}
          <Link href="/app/r/timesheets" className="underline">
            Review timesheets
          </Link>
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {formatCalendarDate(period.from)} to {formatCalendarDate(period.to)}
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
            <tr>
              {["Name", "Payroll ID", "Pay", "Tax code", "Hours", "Holiday", "Sick", "Unpaid", "Other leave"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.email}>
                <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                <td className="px-3 py-2">{r.payrollId || <span className="text-danger">Missing</span>}</td>
                <td className="px-3 py-2">{r.rate ? `£${r.rate} ${r.payType === "salary" ? "a year" : "an hour"}` : "—"}</td>
                <td className="px-3 py-2">{r.taxCode || "—"}</td>
                <td className="px-3 py-2">{r.hours}</td>
                <td className="px-3 py-2">{r.holidayDays}</td>
                <td className="px-3 py-2">{r.sickDays}</td>
                <td className="px-3 py-2">{r.unpaidDays}</td>
                <td className="px-3 py-2">{r.otherLeaveDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
