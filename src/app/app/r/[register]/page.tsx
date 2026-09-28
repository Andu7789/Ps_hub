import type { Metadata } from "next";
import Link from "next/link";
import { getRegister } from "@/lib/registers/defs";
import { isClosed, listRecords } from "@/lib/registers/data";
import { loadRegisterPage } from "@/lib/registers/page-context";
import { getModule } from "@/lib/modules";
import { RecordTable } from "@/components/registers/record-table";
import { RegisterListExtras } from "@/components/registers/extras";
import { primaryButtonClass } from "@/components/ui/styles";

export async function generateMetadata({ params }: { params: Promise<{ register: string }> }): Promise<Metadata> {
  return { title: getRegister((await params).register)?.title ?? "Not found" };
}

export default async function RegisterListPage({
  params,
  searchParams,
}: {
  params: Promise<{ register: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { register } = await params;
  const { show } = await searchParams;
  const { def, actor, lookups, supabase } = await loadRegisterPage(register);

  const all = await listRecords(supabase, def, actor.business_id);
  const showAll = show === "all" || !def.closedWhen;
  const rows = showAll ? all : all.filter((r) => !isClosed(def, r));
  const hiddenCount = all.length - rows.length;

  return (
    <div className="space-y-4">
      <div>
        {def.module && (
          <Link href={`/app/m/${def.module}`} className="text-sm text-muted-foreground hover:underline">
            ← {getModule(def.module).name}
          </Link>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{def.title}</h1>
          {!def.noCreate && (
            <Link href={`/app/r/${def.key}/new`} className={primaryButtonClass}>
              Add {def.singular}
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{def.description}</p>
      </div>

      <RegisterListExtras def={def} actor={actor} />

      {def.closedWhen && (
        <p className="text-sm">
          {showAll ? (
            <Link href={`/app/r/${def.key}`} className="text-brand hover:underline">
              Show open only
            </Link>
          ) : hiddenCount > 0 ? (
            <Link href={`/app/r/${def.key}?show=all`} className="text-brand hover:underline">
              Show {hiddenCount} closed
            </Link>
          ) : null}
        </p>
      )}

      <RecordTable def={def} rows={rows} lookups={lookups} hrefBase={`/app/r/${def.key}`} />
    </div>
  );
}
