import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { collectDueItems, dueItemHref } from "@/lib/registers/data";
import { escapeHtml, sendEmail } from "@/lib/notify";
import { formatCalendarDate } from "@/lib/format";
import { siteOrigin } from "@/lib/site";
import type { ModuleKey } from "@/lib/modules";

// Daily email to each business's owners and managers listing what's
// overdue or due in the next 7 days (vercel.json schedules it). Uses the
// service role because there's no signed-in user; every query is scoped
// to one business at a time.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const service = createServiceClient();
  const { data: moduleRows } = await service.from("hub_business_modules").select("business_id, module_key").eq("enabled", true);
  const byBusiness = new Map<string, Set<ModuleKey>>();
  for (const row of moduleRows ?? []) {
    const set = byBusiness.get(row.business_id) ?? new Set<ModuleKey>();
    set.add(row.module_key as ModuleKey);
    byBusiness.set(row.business_id, set);
  }

  let sent = 0;
  const failures: string[] = [];
  for (const [businessId, enabled] of byBusiness) {
    const items = await collectDueItems(service, businessId, enabled, { horizonDays: 7 });
    if (items.length === 0) continue;

    const [{ data: business }, { data: managers }] = await Promise.all([
      service.from("hub_businesses").select("name").eq("id", businessId).single(),
      service.from("hub_members").select("email").eq("business_id", businessId).eq("status", "active").in("role", ["owner", "manager"]),
    ]);
    // Pay details are owner-only in the app; keep them out of an email
    // that also goes to managers.
    const shareable = items.filter((i) => i.register !== "pay-details");
    if (shareable.length === 0) continue;

    const list = shareable
      .slice(0, 50)
      .map(
        (i) =>
          `<li style="margin-bottom:6px;"><a href="${siteOrigin()}${dueItemHref(i)}" style="color:#0f766e;">${escapeHtml(i.label)}: ${escapeHtml(i.title)}</a> — ${
            i.overdue ? `<strong style="color:#b3261e;">overdue since ${formatCalendarDate(i.date)}</strong>` : formatCalendarDate(i.date)
          }</li>`
      )
      .join("");
    const overdue = shareable.filter((i) => i.overdue).length;
    const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
      <h1 style="font-size:18px;">${escapeHtml(business?.name ?? "Your business")}</h1>
      <p>${overdue > 0 ? `${overdue} overdue and ` : ""}${shareable.length - overdue} due in the next 7 days.</p>
      <ul style="padding-left:18px;">${list}</ul>
      <p style="font-size:12px;color:#5b6b68;">Sent daily by PS Business Hub while anything is due.</p>
    </div>`;

    for (const m of managers ?? []) {
      try {
        await sendEmail(m.email, `${overdue > 0 ? `${overdue} overdue: ` : ""}what's due at ${business?.name ?? "your business"}`, html);
        sent++;
      } catch (err) {
        console.error("Reminder email failed", err);
        failures.push(m.email);
      }
    }
  }
  return NextResponse.json({ sent, failed: failures.length });
}
