import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager } from "@/lib/auth";
import { londonToday, addDays } from "@/lib/registers/values";
import { formatCalendarDate } from "@/lib/format";

export const metadata: Metadata = { title: "Training matrix" };

type Training = { id: string; member_id: string; course: string; completed_on: string | null; expires_on: string | null };

// People down the side, courses across the top: the latest record for
// each, coloured by whether it's current, expiring in 60 days, or expired.
export default async function TrainingMatrixPage() {
  const actor = await requireManager();
  if (!(await isModuleEnabled(actor.business_id, "staff_hub"))) redirect("/app/modules");
  const supabase = await createClient();
  const [{ data: members }, { data: training }] = await Promise.all([
    supabase.from("hub_members").select("id, full_name").eq("business_id", actor.business_id).eq("status", "active").order("full_name"),
    supabase.from("hub_training").select("id, member_id, course, completed_on, expires_on").eq("business_id", actor.business_id),
  ]);
  const rows = (training ?? []) as Training[];
  const courses = [...new Set(rows.map((t) => t.course.trim()))].sort((a, b) => a.localeCompare(b));
  const today = londonToday();
  const soon = addDays(today, 60);

  const latest = new Map<string, Training>();
  for (const t of rows) {
    const key = `${t.member_id}|${t.course.trim()}`;
    const existing = latest.get(key);
    if (!existing || (t.completed_on ?? "") > (existing.completed_on ?? "")) latest.set(key, t);
  }

  function cell(t: Training | undefined) {
    if (!t) return { text: "—", className: "text-muted-foreground" };
    if (!t.expires_on) return { text: t.completed_on ? formatCalendarDate(t.completed_on) : "Done", className: "bg-green-100 text-green-900" };
    if (t.expires_on < today) return { text: `Expired ${formatCalendarDate(t.expires_on)}`, className: "bg-red-100 text-red-900" };
    if (t.expires_on <= soon) return { text: `Expires ${formatCalendarDate(t.expires_on)}`, className: "bg-amber-100 text-amber-900" };
    return { text: `Until ${formatCalendarDate(t.expires_on)}`, className: "bg-green-100 text-green-900" };
  }

  return (
    <div className="space-y-4">
      <Link href="/app/m/staff_hub" className="text-sm text-muted-foreground hover:underline">
        ← Staff Hub
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Training matrix</h1>
        <Link href="/app/r/training/new" className="text-sm text-brand hover:underline">
          Add training record
        </Link>
      </div>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No training recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Person
                </th>
                {courses.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(members ?? []).map((m) => (
                <tr key={m.id}>
                  <th scope="row" className="px-3 py-2 font-medium text-foreground">
                    <Link href={`/app/staff/${m.id}`} className="hover:text-brand">
                      {m.full_name}
                    </Link>
                  </th>
                  {courses.map((c) => {
                    const t = latest.get(`${m.id}|${c}`);
                    const { text, className } = cell(t);
                    return (
                      <td key={c} className={`px-3 py-2 ${className}`}>
                        {t ? (
                          <Link href={`/app/r/training/${t.id}`} className="hover:underline">
                            {text}
                          </Link>
                        ) : (
                          text
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
