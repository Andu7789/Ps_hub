import Link from "next/link";
import { signOutAction, switchBusinessAction } from "@/lib/actions/auth";
import { PRODUCT_NAME } from "@/lib/site";

export function Header({
  signedIn,
  current,
  businesses,
}: {
  signedIn: boolean;
  current: { businessId: string; name: string; logoUrl: string | null } | null;
  businesses: { id: string; name: string }[];
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-foreground">
          {current?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- per-business logo, arbitrary external URL
            <img src={current.logoUrl} alt="" className="h-8 w-auto max-w-40 object-contain" />
          )}
          {current?.name ?? PRODUCT_NAME}
        </Link>
        {signedIn && (
          <div className="flex items-center gap-4 text-sm">
            {businesses.length > 1 && current && (
              <form action={switchBusinessAction} className="flex items-center gap-2">
                <label htmlFor="business-switcher" className="sr-only">
                  Switch business
                </label>
                <select
                  id="business-switcher"
                  name="business_id"
                  defaultValue={current.businessId}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="text-brand hover:underline">
                  Switch
                </button>
              </form>
            )}
            <form action={signOutAction}>
              <button type="submit" className="text-muted-foreground hover:underline">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
