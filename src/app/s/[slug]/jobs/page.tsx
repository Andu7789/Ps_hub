import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicJobs } from "@/lib/public-site";
import { formatCalendarDate } from "@/lib/format";
import { PublicShell } from "@/components/public/public-shell";
import { cardClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const jobs = await getPublicJobs((await params).slug);
  return { title: { absolute: jobs ? `Jobs at ${jobs.business.name}` : "Not found" } };
}

// Open vacancies (Staff Hub). Works whether or not the Website module is on.
export default async function JobsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const jobs = await getPublicJobs(slug);
  if (!jobs) notFound();

  return (
    <PublicShell business={jobs.business}>
      <h1 className="text-2xl font-semibold text-foreground">Jobs at {jobs.business.name}</h1>
      {jobs.vacancies.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No vacancies at the moment. Please check back soon.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {jobs.vacancies.map((v) => (
            <li key={v.id} className={cardClass}>
              <Link href={`/s/${slug}/jobs/${v.id}`} className="text-lg font-semibold text-foreground hover:text-brand">
                {v.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {[v.location, v.hours, v.pay].filter(Boolean).join(" · ")}
                {v.closing_on ? ` · Closes ${formatCalendarDate(v.closing_on)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}
