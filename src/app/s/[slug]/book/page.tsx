import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSite } from "@/lib/public-site";
import { requestBookingAction } from "@/lib/actions/public";
import { ActionForm } from "@/components/forms/action-form";
import { HoneypotField, PublicShell } from "@/components/public/public-shell";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await getPublicSite((await params).slug);
  return { title: { absolute: site ? `Request a booking · ${site.business.name}` : "Not found" } };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getPublicSite(slug);
  if (!site) notFound();

  return (
    <PublicShell business={site.business}>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-foreground">Request a booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell us what you need and we&apos;ll get back to you to confirm.</p>
        <section className={`${cardClass} mt-6`}>
          <ActionForm action={requestBookingAction} submitLabel="Send request" pendingLabel="Sending…" resetOnSuccess>
            <input type="hidden" name="slug" value={slug} />
            <HoneypotField />
            {site.services.length > 0 && (
              <div>
                <label htmlFor="service_id" className={labelClass}>
                  Service
                </label>
                <select id="service_id" name="service_id" className={`mt-1 ${inputClass}`}>
                  <option value="">Not sure yet</option>
                  {site.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.price ? ` (${s.price})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="name" className={labelClass}>
                Your name
              </label>
              <input id="name" name="name" required autoComplete="name" className={`mt-1 ${inputClass}`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input id="email" name="email" type="email" autoComplete="email" className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone
                </label>
                <input id="phone" name="phone" type="tel" autoComplete="tel" className={`mt-1 ${inputClass}`} />
              </div>
            </div>
            <div>
              <label htmlFor="preferred_date" className={labelClass}>
                Preferred date
              </label>
              <input id="preferred_date" name="preferred_date" type="date" className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label htmlFor="message" className={labelClass}>
                Anything else we should know?
              </label>
              <textarea id="message" name="message" rows={4} className={`mt-1 ${inputClass}`} />
            </div>
            {site.privacy_notice_id && (
              <p className="text-xs text-muted-foreground">
                We&apos;ll use your details to reply to you. See our{" "}
                <a href={`/s/${slug}/privacy/${site.privacy_notice_id}`} className="underline">
                  privacy notice
                </a>
                .
              </p>
            )}
          </ActionForm>
        </section>
      </div>
    </PublicShell>
  );
}
