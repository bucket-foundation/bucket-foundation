import type { Metadata } from "next";
import data from "@/lib/research-os/patents-design-data.json";
import type { Segment } from "@/lib/research-os/software-atlas";

export const metadata: Metadata = { title: "Patents", robots: { index: false, follow: false } };

type Design = {
  memo: string;
  sources: { source: Segment[]; researchOs: Segment[]; gateway: Segment[] }[];
  corpus: { branch: Segment[]; cpc: Segment[]; why: Segment[] }[];
  settled: Segment[][];
  slices: { n: number; title: string; shipped: boolean }[];
};

const design = data as Design;
const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const MEMO_URL = "https://github.com/bucket-foundation/bucket-foundation/blob/dev/learning/research-os/PATENTS.md";

function Rich({ segs }: { segs: Segment[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.t === "code" ? (
          <code key={i} className="font-mono text-[12px] bg-[color:var(--bone-2)] px-1">
            {s.v}
          </code>
        ) : s.t === "link" ? (
          <a key={i} href={s.href} target="_blank" rel="noreferrer" className="underline underline-offset-4 break-words">
            {s.v}
          </a>
        ) : (
          <span key={i}>{s.v}</span>
        ),
      )}
    </>
  );
}

function allowed(segs: Segment[]): "yes" | "no" | "partly" {
  const t = segs.map((s) => s.v).join("").trim().toLowerCase();
  if (t === "yes") return "yes";
  if (t.startsWith("no") || t.startsWith("not in v1")) return "no";
  return "partly";
}

const TONE = {
  yes: "text-[color:var(--laurel-deep)]",
  partly: "text-[color:var(--gold-deep)]",
  no: "text-[color:var(--crimson)]",
};

export default function PatentsPage() {
  const shipped = design.slices.filter((s) => s.shipped).length;
  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1000px]">
      <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">Patents</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--basalt-2)] max-w-[70ch]">
        Patents as research objects beside the science they cite. The design is settled and no patent record is in the graph yet: {shipped} of {design.slices.length} slices have shipped, and the first corpus comes next.{" "}
        <a href={MEMO_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          The memo
        </a>{" "}
        has the reasoning and every source.
      </p>

      <section className="mt-8">
        <h2 className={LABEL}>slices</h2>
        <ol className="mt-2 border-t border-[color:var(--hairline)]">
          {design.slices.map((s) => (
            <li key={s.n} className="border-b border-[color:var(--hairline)] py-2 flex flex-wrap items-baseline gap-x-4 text-[13px]">
              <span className={`small-caps text-[11px] tracking-[0.12em] w-[70px] ${s.shipped ? "text-[color:var(--laurel-deep)]" : "text-[color:var(--basalt-3)]"}`}>{s.shipped ? "shipped" : "queued"}</span>
              <span className="flex-1 min-w-[220px] text-[color:var(--basalt)]">
                {s.n}. {s.title}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className={LABEL}>sources and what each allows</h2>
        <p className="mt-1 text-[12px] text-[color:var(--basalt-3)] max-w-[70ch]">Research OS is free to read beside paid citation, so it keeps to the licences the paid routes keep.</p>
        <ul className="mt-2 border-t border-[color:var(--hairline)]">
          {design.sources.map((s, i) => {
            const ros = allowed(s.researchOs);
            return (
              <li key={i} className="border-b border-[color:var(--hairline)] py-3 text-[13px] leading-relaxed">
                <div className="text-[14px] text-[color:var(--basalt)]">
                  <Rich segs={s.source} />
                </div>
                <div className="mt-1 grid gap-1 md:grid-cols-2 md:gap-4 text-[color:var(--basalt-2)]">
                  <p>
                    <span className={LABEL + " mr-2"}>research os</span>
                    <span className={TONE[ros]}>
                      <Rich segs={s.researchOs} />
                    </span>
                  </p>
                  <p>
                    <span className={LABEL + " mr-2"}>gateway</span>
                    <Rich segs={s.gateway} />
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className={LABEL}>the first corpus, by branch</h2>
        <p className="mt-1 text-[12px] text-[color:var(--basalt-3)] max-w-[70ch]">A patent joins the branch whose CPC symbol is the longest prefix of its main symbol.</p>
        <ul className="mt-2 border-t border-[color:var(--hairline)]">
          {design.corpus.map((c, i) => (
            <li key={i} className="border-b border-[color:var(--hairline)] py-3 text-[13px] leading-relaxed text-[color:var(--basalt-2)]">
              <div className="text-[14px] text-[color:var(--basalt)]">
                <Rich segs={c.branch} />
              </div>
              <p className="mt-1">
                <Rich segs={c.cpc} />
              </p>
              <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
                <Rich segs={c.why} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 max-w-[75ch]">
        <h2 className={LABEL}>what the memo settles</h2>
        <ul className="mt-2 list-disc pl-5 space-y-2 text-[13px] leading-relaxed text-[color:var(--basalt-2)]">
          {design.settled.map((s, i) => (
            <li key={i}>
              <Rich segs={s} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
