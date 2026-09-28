import Link from "next/link";

type Risk = { id: string; hazard: string; likelihood: number; severity: number; status: string };

function band(score: number): { label: string; className: string } {
  if (score >= 15) return { label: "High", className: "bg-red-600 text-white" };
  if (score >= 8) return { label: "Medium", className: "bg-amber-400 text-black" };
  return { label: "Low", className: "bg-green-600 text-white" };
}

// 5×5 grid: severity across, likelihood up. Each cell shows how many open
// risks sit there; the list under it names the high ones.
export function RiskMatrix({ risks }: { risks: Risk[] }) {
  const open = risks.filter((r) => r.status !== "closed");
  const high = open.filter((r) => r.likelihood * r.severity >= 15).sort((a, b) => b.likelihood * b.severity - a.likelihood * a.severity);

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
      <div>
        <table className="border-separate border-spacing-1 text-center text-xs" aria-label="Risk matrix">
          <tbody>
            {[5, 4, 3, 2, 1].map((l) => (
              <tr key={l}>
                <th scope="row" className="pr-1 text-right font-normal text-muted-foreground">
                  {l}
                </th>
                {[1, 2, 3, 4, 5].map((s) => {
                  const count = open.filter((r) => r.likelihood === l && r.severity === s).length;
                  const b = band(l * s);
                  return (
                    <td key={s} className={`h-10 w-10 rounded ${b.className}`} title={`Likelihood ${l} × severity ${s} = ${l * s} (${b.label})`}>
                      {count > 0 ? <span className="font-semibold">{count}</span> : <span className="opacity-40">{l * s}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td />
              {[1, 2, 3, 4, 5].map((s) => (
                <td key={s} className="text-muted-foreground">
                  {s}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-xs text-muted-foreground">Likelihood (up) × severity (across). Numbers are open risks.</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">High risks</h3>
        {high.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No open high risks.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {high.map((r) => (
              <li key={r.id}>
                <Link href={`/app/r/risks/${r.id}`} className="text-foreground hover:text-brand">
                  {r.hazard}
                </Link>{" "}
                <span className="text-danger">({r.likelihood * r.severity})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
