import { MODULES, type ModuleKey } from "@/lib/modules";

// The platform admin is whoever runs the Hub itself, not a business owner:
// they see every business at /admin. Set by SUPERADMIN_EMAILS (comma
// separated) rather than a database role, so no one can grant it to
// themselves through the app (DECISIONS.md #14).
export function parseAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"))
  );
}

export function isPlatformAdminEmail(email: string | null | undefined, configured = process.env.SUPERADMIN_EMAILS): boolean {
  if (!email) return false;
  return parseAdminEmails(configured).has(email.trim().toLowerCase());
}

export type PriceKey = "base" | ModuleKey;
export type Prices = Record<PriceKey, number>;

export const PRICE_KEYS: { key: PriceKey; name: string }[] = [
  { key: "base", name: "Base subscription (every business)" },
  ...MODULES.map((m) => ({ key: m.key as PriceKey, name: m.name })),
];

export function pricesFromRows(rows: { price_key: string; monthly_price: number | string }[]): Prices {
  const prices = Object.fromEntries(PRICE_KEYS.map((p) => [p.key, 0])) as Prices;
  for (const row of rows) {
    if (row.price_key in prices) prices[row.price_key as PriceKey] = Number(row.monthly_price);
  }
  return prices;
}

// What a business would pay each month: the base fee plus each module it
// has switched on. Excluded (test, demo or free) accounts count as zero.
export function monthlyValue(enabled: Iterable<string>, prices: Prices, excluded = false): number {
  if (excluded) return 0;
  let total = prices.base;
  for (const key of enabled) {
    if (key in prices && key !== "base") total += prices[key as PriceKey];
  }
  return Math.round(total * 100) / 100;
}
