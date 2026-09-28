import type { ReactNode } from "react";
import Link from "next/link";

// Frame for public pages (a business's site, job adverts, review links):
// the business's own name, logo and colour, with no Hub navigation. Always
// light (.light-surface, globals.css), whatever theme the Hub's own
// screens are using — a business's customers see its own site, not the
// Hub's admin dashboard.
export function PublicShell({
  business,
  children,
}: {
  business: { name: string; slug?: string; brand_color: string; logo_url?: string | null };
  children: ReactNode;
}) {
  return (
    <div style={{ ["--brand-raw" as string]: business.brand_color }} className="light-surface min-h-full">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          {business.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- per-business logo, arbitrary external URL
            <img src={business.logo_url} alt="" className="h-10 w-auto max-w-40 object-contain" />
          )}
          {business.slug ? (
            <Link href={`/s/${business.slug}`} className="text-lg font-semibold text-foreground">
              {business.name}
            </Link>
          ) : (
            <span className="text-lg font-semibold text-foreground">{business.name}</span>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}

// A field only bots fill in (see actions/public.ts).
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
