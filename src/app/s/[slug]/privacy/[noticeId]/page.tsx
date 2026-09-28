import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PublicShell } from "@/components/public/public-shell";

export const metadata: Metadata = { title: { absolute: "Privacy notice" } };

type Notice = { business: string; title: string; body: string; updated_at: string };

// A published privacy notice (GDPR Toolkit), readable by anyone.
export default async function PrivacyNoticePage({ params }: { params: Promise<{ slug: string; noticeId: string }> }) {
  const { slug, noticeId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(noticeId)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("hub_public_privacy_notice", { business_slug: slug, notice_id: noticeId });
  const notice = data as Notice | null;
  if (!notice) notFound();

  return (
    <PublicShell business={{ name: notice.business, slug, brand_color: "#0f766e" }}>
      <article>
        <h1 className="text-2xl font-semibold text-foreground">{notice.title}</h1>
        <p className="text-sm text-muted-foreground">Last updated {formatDate(notice.updated_at)}</p>
        <div className="mt-6 whitespace-pre-line leading-relaxed text-foreground">{notice.body}</div>
      </article>
    </PublicShell>
  );
}
