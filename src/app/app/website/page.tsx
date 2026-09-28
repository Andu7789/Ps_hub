import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isModuleEnabled, requireOwner } from "@/lib/auth";
import { updateWebsiteAction } from "@/lib/actions/business";
import { siteOrigin } from "@/lib/site";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Website settings" };

export default async function WebsiteSettingsPage() {
  const { business } = await requireOwner();
  if (!(await isModuleEnabled(business.id, "website"))) redirect("/app/modules");

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/app/m/website" className="text-sm text-muted-foreground hover:underline">
        ← Website & Bookings
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">Website settings</h1>
      <p className="text-sm text-muted-foreground">
        Your page lives at{" "}
        <Link href={`/s/${business.slug}`} className="text-brand hover:underline">
          {siteOrigin()}/s/{business.slug}
        </Link>
        {business.website_published ? "." : ", once you publish it."} Add what you offer under{" "}
        <Link href="/app/r/services" className="text-brand hover:underline">
          Services
        </Link>
        .
      </p>
      <section className={cardClass}>
        <ActionForm action={updateWebsiteAction} submitLabel="Save">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input type="checkbox" name="website_published" defaultChecked={business.website_published} />
            Published (anyone with the link can see it)
          </label>
          <div>
            <label htmlFor="slug" className={labelClass}>
              Web address
            </label>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <span>{siteOrigin()}/s/</span>
              <input id="slug" name="slug" required defaultValue={business.slug} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="tagline" className={labelClass}>
              Tagline
            </label>
            <input id="tagline" name="tagline" defaultValue={business.tagline ?? ""} placeholder="e.g. Friendly, reliable home cleaning in Leeds" className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="about" className={labelClass}>
              About you
            </label>
            <textarea id="about" name="about" rows={6} defaultValue={business.about ?? ""} className={`mt-1 ${inputClass}`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone
              </label>
              <input id="phone" name="phone" type="tel" defaultValue={business.phone ?? ""} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label htmlFor="address" className={labelClass}>
                Address or area
              </label>
              <input id="address" name="address" defaultValue={business.address ?? ""} className={`mt-1 ${inputClass}`} />
            </div>
          </div>
          <div>
            <label htmlFor="custom_domain" className={labelClass}>
              Your own domain (optional)
            </label>
            <input
              id="custom_domain"
              name="custom_domain"
              defaultValue={business.custom_domain ?? ""}
              placeholder="www.yourbusiness.co.uk"
              className={`mt-1 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Buy the domain from any registrar, then ask PS Clean to connect it: it needs adding to the Hub&apos;s hosting and a
              DNS record pointing at it. Your email address shown on the page is the contact email in Settings.
            </p>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
