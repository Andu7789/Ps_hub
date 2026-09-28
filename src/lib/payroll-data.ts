import type { SupabaseClient } from "@supabase/supabase-js";
import { payrollRows, type PayrollInput } from "@/lib/payroll";

export async function loadPayrollRows(supabase: SupabaseClient, businessId: string, from: string, to: string) {
  const [members, payDetails, timesheets, absences] = await Promise.all([
    supabase.from("hub_members").select("id, full_name, email").eq("business_id", businessId).eq("status", "active").order("full_name"),
    supabase.from("hub_pay_details").select("member_id, payroll_id, pay_type, rate, tax_code, ni_number, pension_status").eq("business_id", businessId),
    supabase.from("hub_timesheets").select("member_id, work_on, hours, status").eq("business_id", businessId).gte("work_on", from).lte("work_on", to),
    supabase.from("hub_absences").select("member_id, kind, start_on, end_on, status").eq("business_id", businessId).lte("start_on", to).gte("end_on", from),
  ]);
  const input: PayrollInput = {
    members: members.data ?? [],
    payDetails: payDetails.data ?? [],
    timesheets: timesheets.data ?? [],
    absences: absences.data ?? [],
  };
  return payrollRows(input, from, to);
}

export function validPeriod(from: string | undefined, to: string | undefined): { from: string; to: string } | null {
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !date.test(from) || !date.test(to) || from > to) return null;
  return { from, to };
}
