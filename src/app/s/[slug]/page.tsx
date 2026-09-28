import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSite } from "@/lib/public-site";
import { formatDate } from "@/lib/format";
import { PublicShell } from "@/components/public/public-shell";
import { cardClass, primaryButtonClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await getPublicSite((await params).slug);
  if (!site) return { title: "Not found" };
  return {
    title: { absolute: site.business.name },
    description: site.business.tagline ?? `${site.business.name}: services, reviews and bookings.`,
  };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-amber-500">
      {"★".repeat(rating)}
      <span className="text-muted-foreground">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

// A business's public page (Website & Bookings module).
export default async function PublicSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getPublicSite(slug);
  if (!site) notFound();
  const { business, services, reviews } = site;
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <PublicShell business={business}>
      <section className="py-6">
        <h1 className="text-3xl font-semibold text-foreground">{business.name}</h1>
        {business.tagline && <p className="mt-2 text-lg text-muted-foreground">{business.tagline}</p>}
        {average !== null && (
          <p className="mt-2 text-sm">
            <Stars rating={Math.round(average)} /> {average.toFixed(1)} from {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        )}
        <Link href={`/s/${business.slug}/book`} className={`mt-6 inline-block ${primaryButtonClass}`}>
          Request a booking
        </Link>
      </section>

      {business.about && (
        <section className="py-6">
          <h2 className="text-xl font-semibold text-foreground">About us</h2>
          <p className="mt-2 whitespace-pre-line text-foreground">{business.about}</p>
        </section>
      )}

      {services.length > 0 && (
        <section className="py-6">
          <h2 className="text-xl font-semibold text-foreground">Services</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <li key={s.id} className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{s.name}</h3>
                  {s.price && <span className="text-sm font-medium text-brand">{s.price}</span>}
                </div>
                {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
                {s.duration && <p className="mt-2 text-xs text-muted-foreground">{s.duration}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="py-6">
          <h2 className="text-xl font-semibold text-foreground">What customers say</h2>
          <ul className="mt-4 space-y-4">
            {reviews.slice(0, 12).map((r, i) => (
              <li key={i} className={cardClass}>
                <Stars rating={r.rating} />
                {r.comment && <p className="mt-2 text-foreground">&ldquo;{r.comment}&rdquo;</p>}
                <p className="mt-2 text-sm text-muted-foreground">
                  {r.name}, {formatDate(r.submitted_at)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-border py-6 text-sm text-foreground">
        <h2 className="text-xl font-semibold">Contact</h2>
        <ul className="mt-2 space-y-1">
          {business.phone && <li>Phone: <a href={`tel:${business.phone}`} className="text-brand hover:underline">{business.phone}</a></li>}
          {business.email && <li>Email: <a href={`mailto:${business.email}`} className="text-brand hover:underline">{business.email}</a></li>}
          {business.address && <li className="whitespace-pre-line">{business.address}</li>}
        </ul>
        <p className="mt-4 flex flex-wrap gap-4 text-muted-foreground">
          {site.jobs && (
            <Link href={`/s/${business.slug}/jobs`} className="hover:underline">
              Jobs
            </Link>
          )}
          {site.privacy_notice_id && (
            <Link href={`/s/${business.slug}/privacy/${site.privacy_notice_id}`} className="hover:underline">
              Privacy notice
            </Link>
          )}
        </p>
      </section>
    </PublicShell>
  );
}
