import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, isModuleEnabled } from "@/lib/auth";
import { payrollCsv } from "@/lib/payroll";
import { loadPayrollRows, validPeriod } from "@/lib/payroll-data";

// CSV of a pay period for the payroll provider. Owner only: it includes
// pay rates, tax codes and NI numbers.
export async function GET(request: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") return new NextResponse("Not allowed", { status: 403 });
  if (!(await isModuleEnabled(membership.business_id, "payroll"))) return new NextResponse("Payroll is off", { status: 403 });

  const period = validPeriod(request.nextUrl.searchParams.get("from") ?? undefined, request.nextUrl.searchParams.get("to") ?? undefined);
  if (!period) return new NextResponse("Choose a valid period", { status: 400 });

  const supabase = await createClient();
  const rows = await loadPayrollRows(supabase, membership.business_id, period.from, period.to);
  return new NextResponse(payrollCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${period.from}-to-${period.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
