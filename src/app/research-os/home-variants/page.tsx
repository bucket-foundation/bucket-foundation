import Link from "next/link";
import type { Metadata } from "next";
import { HEADLINES, VARIANTS } from "@/lib/research-os/home-variants";
import scores from "./scores.json";

export const metadata: Metadata = { title: "Research OS home variants", robots: { index: false } };

type Score = { score: number; pass: boolean; note: string };
const SCORES = scores as Record<string, Score>;

export default function HomeVariantsIndex() {
  const rows = [...VARIANTS].sort((a, b) => (SCORES[b.id]?.score ?? -1) - (SCORES[a.id]?.score ?? -1));
  return (
    <main className="mx-auto max-w-[1100px] px-6 py-12 text-[color:var(--basalt)]">
      <h1 className="font-display text-3xl mb-2">Research OS home variants</h1>
      <p className="mb-8 text-[color:var(--basalt-2)]">
        {VARIANTS.length} generated layouts of the same fourteen modules. Score is the critic&apos;s, pass is 8.0 or above.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-[color:var(--basalt-3)]">
            <th className="py-2">id</th>
            <th>score</th>
            <th>layout</th>
            <th>palette</th>
            <th>type</th>
            <th>grouping</th>
            <th>cta</th>
            <th>headline</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const s = SCORES[v.id];
            return (
              <tr key={v.id} className="border-b border-[color:var(--bone-3)] align-top">
                <td className="py-2">
                  <Link className="underline" href={`/research-os/home-variants/${v.id}`}>{v.id}</Link>
                </td>
                <td>{s ? `${s.score.toFixed(1)} ${s.pass ? "pass" : "fail"}` : "unscored"}</td>
                <td>{v.layout}</td>
                <td>{v.palette}</td>
                <td>{v.type}</td>
                <td>{v.grouping}</td>
                <td>{v.cta}</td>
                <td>{HEADLINES[v.headline].title}{s?.note ? <div className="text-xs text-[color:var(--basalt-3)]">{s.note}</div> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
