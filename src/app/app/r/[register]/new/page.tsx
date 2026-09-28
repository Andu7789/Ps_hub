import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegister } from "@/lib/registers/defs";
import { loadRegisterPage } from "@/lib/registers/page-context";
import { RecordForm } from "@/components/registers/record-form";
import { cardClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ register: string }> }): Promise<Metadata> {
  const def = getRegister((await params).register);
  return { title: def ? `Add ${def.singular}` : "Not found" };
}

export default async function NewRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ register: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { register } = await params;
  const query = await searchParams;
  const { def, lookups, memberChoices } = await loadRegisterPage(register);
  if (def.noCreate) notFound();

  // Links elsewhere can pre-fill a field, e.g. "Add training" from a
  // person's page passes ?member_id=…
  const presets: Record<string, string> = {};
  for (const f of def.fields) {
    const v = query[f.name];
    if (typeof v === "string" && v.length < 200) presets[f.name] = v;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/app/r/${def.key}`} className="text-sm text-muted-foreground hover:underline">
        ← {def.title}
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">Add {def.singular}</h1>
      <section className={cardClass}>
        <RecordForm def={def} record={null} lookups={lookups} memberChoices={memberChoices} presets={presets} />
      </section>
    </div>
  );
}
