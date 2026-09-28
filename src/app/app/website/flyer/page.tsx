import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled, requireManager } from "@/lib/auth";
import { siteOrigin } from "@/lib/site";
import { PrintButton } from "@/components/ui/print-button";

export const metadata: Metadata = { title: "Flyer" };

// An A4 flyer from the business's own details and services, to print or
// save as a PDF.
export default async function FlyerPage() {
  const { business } = await requireManager();
  if (!(await isModuleEnabled(business.id, "website"))) redirect("/app/modules");
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("hub_services")
    .select("name, description, price")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("position")
    .limit(8);
  const url = business.custom_domain ? `https://${business.custom_domain}` : `${siteOrigin()}/s/${business.slug}`;

  return (
    // Always light (.light-surface, globals.css), whatever theme the rest
    // of the app is using: a flyer meant to be printed on white paper.
    <div className="light-surface space-y-4">
      <PrintButton />
      <article
        style={{ ["--brand-raw" as string]: business.brand_color }}
        className="mx-auto flex aspect-[210/297] max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-white text-gray-900 print:max-w-none print:rounded-none print:border-0"
      >
        <header className="bg-brand px-10 py-12 text-brand-foreground">
          {business.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- per-business logo, arbitrary external URL
            <img src={business.logo_url} alt="" className="mb-6 h-16 w-auto" />
          )}
          <h1 className="text-4xl font-bold">{business.name}</h1>
          {business.tagline && <p className="mt-3 text-xl opacity-90">{business.tagline}</p>}
        </header>
        <div className="flex-1 px-10 py-8">
          {(services ?? []).length > 0 && (
            <ul className="space-y-4">
              {(services ?? []).map((s) => (
                <li key={s.name} className="border-b border-gray-200 pb-3">
                  <div className="flex justify-between gap-4 text-lg">
                    <span className="font-semibold">{s.name}</span>
                    {s.price && <span className="font-semibold text-brand">{s.price}</span>}
                  </div>
                  {s.description && <p className="mt-1 text-sm text-gray-600">{s.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="bg-gray-100 px-10 py-8 text-lg">
          <p className="font-semibold">Get in touch</p>
          {business.phone && <p>{business.phone}</p>}
          {business.contact_email && <p>{business.contact_email}</p>}
          <p className="text-brand">{url.replace(/^https?:\/\//, "")}</p>
        </footer>
      </article>
    </div>
  );
}
