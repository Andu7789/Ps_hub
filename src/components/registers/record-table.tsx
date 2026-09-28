import Link from "next/link";
import type { RegisterDef } from "@/lib/registers/types";
import { displayValue, londonToday, type Lookups } from "@/lib/registers/values";
import { isClosed, recordId, type RecordRow } from "@/lib/registers/data";

// A register's records as a table. Dates that are due (not closed, and
// past) are highlighted.
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
            return (
              <tr key={id} className={closed ? "text-muted-foreground" : ""}>
                {fields.map((f, i) => {
                  const text = displayValue(f, row[f.name], lookups) || "—";
                  const overdue = !closed && dueFields.has(f.name) && Boolean(row[f.name]) && String(row[f.name]).slice(0, 10) < today;
                  return (
                    <td key={f.name} className={`px-4 py-2 align-top ${overdue ? "font-medium text-danger" : ""}`}>
                      {i === 0 && hrefBase ? (
                        <Link href={`${hrefBase}/${id}`} className="font-medium text-foreground hover:text-brand">
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
