"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RegisterDef } from "@/lib/registers/types";
import { displayValue, londonToday, type Lookups } from "@/lib/registers/values";
import { isClosed, recordId, type RecordRow } from "@/lib/registers/data";

// A register's records as a table. Dates that are due (not closed, and
// past) are highlighted. The whole row opens the record — not just the
// first column's text, which looked identical to any other cell and left
// people clicking a date or a status with nothing happening.
export function RecordTable({
  def,
  rows,
  lookups,
  hrefBase,
  columns,
}: {
  def: RegisterDef;
  rows: RecordRow[];
  lookups: Lookups;
  hrefBase: string | null;
  columns?: string[];
}) {
  const router = useRouter();
  const fields = (columns ?? def.list).map((name) => def.fields.find((f) => f.name === name)!).filter(Boolean);
  const dueFields = new Set(def.due?.map((d) => d.field));
  const today = londonToday();

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
          <tr>
            {fields.map((f) => (
              <th key={f.name} scope="col" className="px-4 py-2 font-medium">
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const id = recordId(def, row);
            const closed = isClosed(def, row);
            const href = hrefBase ? `${hrefBase}/${id}` : null;
            return (
              <tr
                key={id}
                onClick={href ? () => router.push(href) : undefined}
                className={`${closed ? "text-muted-foreground" : ""} ${href ? "cursor-pointer hover:bg-muted/60" : ""}`}
              >
                {fields.map((f, i) => {
                  const text = displayValue(f, row[f.name], lookups) || "—";
                  const overdue = !closed && dueFields.has(f.name) && Boolean(row[f.name]) && String(row[f.name]).slice(0, 10) < today;
                  return (
                    <td key={f.name} className={`px-4 py-2 align-top ${overdue ? "font-medium text-danger" : ""}`}>
                      {i === 0 && href ? (
                        // The one real link in the row, for keyboard focus,
                        // screen readers and opening in a new tab. Its own
                        // click would otherwise also bubble to the row's
                        // handler and push the same URL twice.
                        <Link href={href} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:text-brand">
                          {text}
                        </Link>
                      ) : (
                        text
                      )}
                      {overdue && <span className="sr-only"> (overdue)</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
