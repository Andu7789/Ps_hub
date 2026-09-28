import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitReviewAction } from "@/lib/actions/public";
import { ActionForm } from "@/components/forms/action-form";
import { HoneypotField, PublicShell } from "@/components/public/public-shell";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: { absolute: "Leave a review" }, robots: { index: false } };

type ReviewRequest = { business: string; brand_color: string; reviewer_name: string; submitted: boolean };

// Where a review request email lands. The token in the link is the only
// key: it works once.
export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("hub_review_request", { review_token: token });
  const request = data as ReviewRequest | null;
  if (!request) notFound();

  return (
    <PublicShell business={{ name: request.business, brand_color: request.brand_color }}>
      <div className="max-w-lg">
        {request.submitted ? (
          <p className="text-foreground">Thank you, you&apos;ve already left your review.</p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground">How did we do, {request.reviewer_name.split(" ")[0]}?</h1>
            <section className={`${cardClass} mt-6`}>
              <ActionForm action={submitReviewAction} submitLabel="Send review" pendingLabel="Sending…">
                <input type="hidden" name="token" value={token} />
                <HoneypotField />
                <fieldset>
                  <legend className={labelClass}>Your rating</legend>
                  <div className="mt-2 flex gap-4">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <label key={n} className="flex items-center gap-1 text-sm">
                        <input type="radio" name="rating" value={n} required defaultChecked={n === 5} />
                        <span className="text-amber-500">{"★".repeat(n)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="comment" className={labelClass}>
                    Your review
                  </label>
                  <textarea id="comment" name="comment" rows={5} className={`mt-1 ${inputClass}`} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your first name, rating and review may be shown on {request.business}&apos;s website.
                </p>
              </ActionForm>
            </section>
          </>
        )}
      </div>
    </PublicShell>
  );
}
