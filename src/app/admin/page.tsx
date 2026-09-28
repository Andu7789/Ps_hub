import type { Metadata } from "next";
import Link from "next/link";
import { loadPlatform } from "@/lib/platform-admin-server";
import { MODULES } from "@/lib/modules";
import { formatDate, formatMoney } from "@/lib/format";
import { cardClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Overview" };

const MODULE_SHORT: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.key, m.name]));

export default async function PlatformOverviewPage() {
  const { businesses, members, prices } = await loadPlatform();

  const paying = businesses.filter((b) => !b.excluded);
  const mrr = paying.reduce((sum, b) => sum + b.monthly, 0);
  const activePeople = members.filter((m) => m.status === "active");
  const signedIn = activePeople.filter((m) => m.user_id).length;

  const adoption = MODULES.map((m) => {
    const using = paying.filter((b) => b.modules.includes(m.key)).length;
    return { ...m, using, share: paying.length ? using / paying.length : 0, price: prices[m.key], revenue: using * prices[m.key] };
  });
  const baseRevenue = paying.length * prices.base;

  const months = lastMonths(6);
  const signups = months.map((month) => ({
    month,
    count: businesses.filter((b) => b.created_at.slice(0, 7) === month.key).length,
  }));
  const maxSignups = Math.max(1, ...signups.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Every business on the Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue is what each business would pay at the current <Link href="/admin/prices" className="text-brand hover:underline">prices</Link> for
          the modules it has switched on. There is no billing yet, so nothing here has actually been charged.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Businesses" value={String(businesses.length)} note={`${businesses.length - paying.length} excluded from revenue`} />
        <Stat label="Monthly revenue" value={formatMoney(mrr)} note={`${formatMoney(mrr * 12)} a year`} />
        <Stat label="Average per business" value={formatMoney(paying.length ? mrr / paying.length : 0)} note={`across ${paying.length} counted`} />
        <Stat label="People" value={String(activePeople.length)} note={`${signedIn} have signed in`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${cardClass} lg:col-span-2`}>
          <h2 className="text-base font-semibold text-foreground">Modules</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Module</th>
                  <th className="py-2 pr-3 font-medium">Businesses</th>
                  <th className="py-2 pr-3 text-right font-medium">Price</th>
                  <th className="py-2 text-right font-medium">A month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-3 text-foreground">Base subscription</td>
                  <td className="py-2 pr-3 text-muted-foreground">{paying.length}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">{formatMoney(prices.base)}</td>
                  <td className="py-2 text-right text-foreground">{formatMoney(baseRevenue)}</td>
                </tr>
                {adoption.map((m) => (
                  <tr key={m.key}>
                    <td className="py-2 pr-3 text-foreground">{m.name}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(m.share * 100)}%` }} />
                        </div>
                        <span className="text-muted-foreground">
                          {m.using} ({Math.round(m.share * 100)}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">{formatMoney(m.price)}</td>
                    <td className="py-2 text-right text-foreground">{formatMoney(m.revenue)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3 text-foreground" colSpan={3}>
                    Total
                  </td>
                  <td className="py-2 text-right text-foreground">{formatMoney(mrr)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">New businesses</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {signups.map((s) => (
              <li key={s.month.key} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-muted-foreground">{s.month.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(s.count / maxSignups) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-foreground">{s.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Businesses</h2>
        {businesses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No businesses yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Business</th>
                  <th className="py-2 pr-3 font-medium">Owner</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 pr-3 font-medium">Team</th>
                  <th className="py-2 pr-3 font-medium">Modules</th>
                  <th className="py-2 text-right font-medium">A month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {businesses.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="py-2 pr-3">
                      <Link href={`/admin/b/${b.id}`} className="font-medium text-foreground hover:text-brand">
                        {b.name}
                      </Link>
                      {b.excluded && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Excluded</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-foreground">{b.owner?.full_name ?? "No owner"}</span>
                      <span className="block text-xs text-muted-foreground">{b.owner?.email ?? b.contact_email}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">{formatDate(b.created_at)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.activeMembers}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {b.modules.length === 0 ? "None" : b.modules.map((k) => MODULE_SHORT[k] ?? k).join(", ")}
                    </td>
                    <td className={`whitespace-nowrap py-2 text-right ${b.excluded ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {formatMoney(b.listPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={cardClass}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

// The last n calendar months, oldest first, keyed like created_at ("2026-09").
function lastMonths(n: number): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return {
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
    };
  });
}
