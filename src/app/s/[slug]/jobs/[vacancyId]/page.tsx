import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicJobs } from "@/lib/public-site";
import { applyForJobAction } from "@/lib/actions/public";
import { formatCalendarDate } from "@/lib/format";
import { ActionForm } from "@/components/forms/action-form";
import { HoneypotField, PublicShell } from "@/components/public/public-shell";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; vacancyId: string }> }): Promise<Metadata> {
  const { slug, vacancyId } = await params;
  const jobs = await getPublicJobs(slug);
  const v = jobs?.vacancies.find((x) => x.id === vacancyId);
  return { title: { absolute: v && jobs ? `${v.title} · ${jobs.business.name}` : "Not found" } };
}

export default async function VacancyPage({ params }: { params: Promise<{ slug: string; vacancyId: string }> }) {
  const { slug, vacancyId } = await params;
  const jobs = await getPublicJobs(slug);
  const v = jobs?.vacancies.find((x) => x.id === vacancyId);
  if (!jobs || !v) notFound();

  return (
    <PublicShell business={jobs.business}>
      <Link href={`/s/${slug}/jobs`} className="text-sm text-muted-foreground hover:underline">
        ← All jobs
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{v.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {[v.location, v.hours, v.pay].filter(Boolean).join(" · ")}
        {v.closing_on ? ` · Closes ${formatCalendarDate(v.closing_on)}` : ""}
      </p>
      {v.description && <p className="mt-4 whitespace-pre-line text-foreground">{v.description}</p>}

      <section className={`${cardClass} mt-8 max-w-lg`}>
        <h2 className="text-lg font-semibold text-foreground">Apply</h2>
        <div className="mt-4">
          <ActionForm action={applyForJobAction} submitLabel="Send application" pendingLabel="Sending…" resetOnSuccess>
            <input type="hidden" name="vacancy_id" value={v.id} />
            <HoneypotField />
            <div>
              <label htmlFor="full_name" className={labelClass}>
                Full name
              </label>
              <input id="full_name" name="full_name" required autoComplete="name" className={`mt-1 ${inputClass}`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input id="email" name="email" type="email" required autoComplete="email" className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone
                </label>
                <input id="phone" name="phone" type="tel" autoComplete="tel" className={`mt-1 ${inputClass}`} />
              </div>
            </div>
            <div>
              <label htmlFor="cover_note" className={labelClass}>
                Tell us about yourself
              </label>
              <textarea id="cover_note" name="cover_note" rows={5} className={`mt-1 ${inputClass}`} />
            </div>
          </ActionForm>
        </div>
      </section>
    </PublicShell>
  );
}
