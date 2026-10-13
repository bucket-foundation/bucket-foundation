import Link from "next/link";
import type { Metadata } from "next";
import { STATEMENT_VARIANTS } from "@/lib/research-os/statement-variants";
import scores from "./scores.json";

export const metadata: Metadata = { title: "Research statement variants", robots: { index: false } };

type Score = { score: number; pass: boolean; note: string };
const SCORES = scores as Record<string, Score>;

export default function StatementVariantsIndex() {
  const rows = [...STATEMENT_VARIANTS].sort((a, b) => (SCORES[b.id]?.score ?? -1) - (SCORES[a.id]?.score ?? -1));
  return (
    <main className="mx-auto max-w-[900px] px-6 py-12 text-[color:var(--basalt)]">
      <h1 className="font-display text-3xl mb-2">Research statement, one screen</h1>
      <p className="mb-8 text-[color:var(--basalt-2)]">
        {STATEMENT_VARIANTS.length} layouts of the three research directions with the frontier figure and the report numbers. Pass is 8.0 or above.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-[color:var(--basalt-3)]">
            <th className="py-2">id</th>
            <th>score</th>
            <th>layout</th>
            <th>palette</th>
            <th>type</th>
            <th>figure</th>
            <th>note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const s = SCORES[v.id];
            return (
              <tr key={v.id} className="border-b border-[color:var(--bone-3)] align-top">
                <td className="py-2">
                  <Link className="underline" href={`/research/statement/${v.id}`}>{v.id}</Link>
                </td>
                <td>{s ? `${s.score.toFixed(1)} ${s.pass ? "pass" : "fail"}` : "unscored"}</td>
                <td>{v.layout}</td>
                <td>{v.palette}</td>
                <td>{v.type}</td>
                <td>{v.figureFirst ? "first" : "after"}</td>
                <td className="text-xs text-[color:var(--basalt-3)]">{s?.note ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
