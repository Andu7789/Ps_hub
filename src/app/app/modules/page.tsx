import type { Metadata } from "next";
import { getEnabledModules, requireOwner } from "@/lib/auth";
import { setModuleEnabledAction } from "@/lib/actions/business";
import { MODULES } from "@/lib/modules";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Modules" };

export default async function ModulesPage() {
  const owner = await requireOwner();
  const enabled = await getEnabledModules(owner.business_id);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Modules</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Switch modules on as you need them. Switching one off hides it from your team but keeps everything in it, so
        nothing is lost if you switch it back on.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {MODULES.map((m) => {
          const on = enabled.has(m.key);
          return (
            <li key={m.key} className={`${cardClass} flex flex-col`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">{m.name}</h2>
                <span className={`text-xs font-medium ${on ? "text-success" : "text-muted-foreground"}`}>
                  {!m.available ? "Coming soon" : on ? "On" : "Off"}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{m.description}</p>
              {m.available && (
                <form action={setModuleEnabledAction} className="mt-4">
                  <input type="hidden" name="module_key" value={m.key} />
                  <input type="hidden" name="enabled" value={on ? "false" : "true"} />
                  <button type="submit" className={on ? secondaryButtonClass : primaryButtonClass}>
                    {on ? "Switch off" : "Switch on"}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
