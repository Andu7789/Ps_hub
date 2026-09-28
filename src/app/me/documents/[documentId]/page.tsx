import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { signIssuedDocumentAction } from "@/lib/actions/custom";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/forms/action-form";
import { cardClass, inputClass, labelClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Document" };

// A contract or letter issued to the signed-in person, to read and sign.
export default async function MyDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ signed?: string }>;
}) {
  const { documentId } = await params;
  const { signed } = await searchParams;
  const me = await requireMember();
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("hub_issued_documents")
    .select("*")
    .eq("id", documentId)
    .eq("member_id", me.id)
    .maybeSingle();
  if (!doc) notFound();

  return (
    <div className="space-y-6">
      <Link href="/me" className="text-sm text-muted-foreground hover:underline">
        ← My details
      </Link>
      <article className={cardClass}>
        <h1 className="text-2xl font-semibold text-foreground">{doc.title}</h1>
        <p className="text-xs text-muted-foreground">Issued {formatDateTime(doc.issued_at)}</p>
        <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground">{doc.body}</div>
      </article>

      {doc.requires_signature && (
        <section className={cardClass}>
          {doc.signed_at ? (
            <p className="text-sm text-success">
              {signed ? "Thanks, that's signed. " : ""}You signed this as &quot;{doc.signed_name}&quot; on {formatDateTime(doc.signed_at)}.
            </p>
          ) : (
            <ActionForm action={signIssuedDocumentAction} submitLabel="Sign" pendingLabel="Signing…">
              <input type="hidden" name="id" value={doc.id} />
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input type="checkbox" name="confirm" required className="mt-1" />
                I have read this document and agree to it.
              </label>
              <div>
                <label htmlFor="signed_name" className={labelClass}>
                  Type your full name
                </label>
                <input id="signed_name" name="signed_name" required autoComplete="name" placeholder={me.full_name} className={`mt-1 ${inputClass}`} />
              </div>
            </ActionForm>
          )}
        </section>
      )}
    </div>
  );
}
