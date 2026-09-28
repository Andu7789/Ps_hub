import type { Metadata } from "next";
import { loadPlatform } from "@/lib/platform-admin-server";
import { updatePricesAction } from "@/lib/actions/admin";
import { PRICE_KEYS } from "@/lib/platform-admin";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Prices" };

export default async function PlatformPricesPage() {
  const { prices } = await loadPlatform();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-foreground">Prices</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Monthly price for each module. Every business pays the base subscription plus each module it switches on.
        These only drive the revenue figures in this admin area: businesses don&apos;t see them and aren&apos;t
        charged.
      </p>
      <div className={`${cardClass} mt-6`}>
        <ActionForm action={updatePricesAction} submitLabel="Save prices">
          {PRICE_KEYS.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-4">
              <label htmlFor={p.key} className={labelClass}>
                {p.name}
              </label>
              <div className="flex w-36 items-center gap-1">
                <span className="text-sm text-muted-foreground">£</span>
                <input
                  id={p.key}
                  name={p.key}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  required
                  defaultValue={prices[p.key].toFixed(2)}
                  className={`${inputClass} text-right`}
                />
              </div>
            </div>
          ))}
        </ActionForm>
      </div>
    </div>
  );
}
