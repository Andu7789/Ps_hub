import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPlatform } from "@/lib/platform-admin-server";
import { createServiceClient } from "@/lib/supabase/server";
import { updateBusinessFlagsAction } from "@/lib/actions/admin";
import { MODULES } from "@/lib/modules";
import { formatDate, formatMoney } from "@/lib/format";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Business" };

// A few tables that show how much a business actually uses the Hub.
const USAGE_TABLES = [
  { table: "hub_policies", label: "Policies" },
  { table: "hub_training", label: "Training records" },
  { table: "hub_absences", label: "Absences" },
  { table: "hub_incidents", label: "Incidents" },
  { table: "hub_clients", label: "Clients" },
  { table: "hub_invoices", label: "Invoices" },
  { table: "hub_booking_requests", label: "Booking requests" },
  { table: "hub_documents", label: "Files" },
] as const;

export default async function PlatformBusinessPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const { businesses, members, prices } = await loadPlatform();
  const business = businesses.find((b) => b.id === businessId);
  if (!business) notFound();

  const team = members.filter((m) => m.business_id === business.id);
  const db = createServiceClient();
  const usage = await Promise.all(
    USAGE_TABLES.map(async (u) => {
      const { count } = await db.from(u.table).select("*", { count: "exact", head: true }).eq("business_id", business.id);
      return { ...u, count: count ?? 0 };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-brand">
          ← All businesses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{business.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Joined {formatDate(business.created_at)} · {business.owner ? `${business.owner.full_name} (${business.owner.email})` : "No active owner"}
          {business.website_published && (
            <>
              {" · "}
              <Link href={`/s/${business.slug}`} className="text-brand hover:underline">
                Public page
              </Link>
            </>
          )}
          {business.custom_domain ? ` · ${business.custom_domain}` : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${cardClass} lg:col-span-2`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Modules</h2>
            <p className="text-sm text-muted-foreground">
              {business.excluded ? `Excluded from revenue (${formatMoney(business.listPrice)} a month at current prices)` : `${formatMoney(business.monthly)} a month`}
            </p>
          </div>
          <ul className="mt-3 divide-y divide-border text-sm">
            <li className="flex justify-between py-2">
              <span className="text-foreground">Base subscription</span>
              <span className="text-muted-foreground">{formatMoney(prices.base)}</span>
            </li>
            {MODULES.map((m) => {
              const on = business.modules.includes(m.key);
              return (
                <li key={m.key} className="flex justify-between py-2">
                  <span className={on ? "text-foreground" : "text-muted-foreground"}>
                    {m.name} <span className={`ml-1 text-xs ${on ? "text-success" : ""}`}>{on ? "On" : "Off"}</span>
                  </span>
                  <span className="text-muted-foreground">{on ? formatMoney(prices[m.key]) : "–"}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Account</h2>
          <ActionForm action={updateBusinessFlagsAction} submitLabel="Save" className="mt-3 space-y-4">
            <input type="hidden" name="business_id" value={business.id} />
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" name="exclude_from_revenue" defaultChecked={business.excluded} className="mt-1" />
              <span>
                Exclude from revenue
                <span className="block text-xs text-muted-foreground">For test, demo or free accounts.</span>
              </span>
            </label>
            <div>
              <label htmlFor="note" className={labelClass}>
                Private note
              </label>
              <textarea id="note" name="note" rows={3} defaultValue={business.note ?? ""} className={`mt-1 ${inputClass}`} />
            </div>
          </ActionForm>
        </section>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Usage</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {usage.map((u) => (
            <div key={u.table}>
              <dt className="text-sm text-muted-foreground">{u.label}</dt>
              <dd className="text-xl font-semibold text-foreground">{u.count}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Team ({business.activeMembers} active)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {team.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-3 text-foreground">{m.full_name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{m.email}</td>
                  <td className="py-2 pr-3 capitalize text-muted-foreground">{m.role}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {m.status === "left" ? "Left" : m.user_id ? "Signed in" : "Invited"}
                  </td>
                  <td className="whitespace-nowrap py-2 text-muted-foreground">{formatDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
