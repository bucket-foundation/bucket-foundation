"use client";

import { useMemo, useState } from "react";
import { PageHeader, Panel } from "@/components/ui";
import {
  BRANCHES,
  MINT_HINT,
  MINT_STATES,
  dialPoint,
  filterProductions,
  mintCounts,
  type AtlasFilter,
  type AtlasProduction,
  type MintState,
  type SolvabilityAtlasData,
} from "@/lib/research-os/solvability-atlas";

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const PILL = "border px-3 min-h-[36px] text-[12px] tracking-[0.04em]";
const ON = "bg-[color:var(--basalt)] text-[color:var(--bone)] border-[color:var(--basalt)]";
const OFF = "border-[color:var(--hairline)] text-[color:var(--basalt-2)] hover:border-[color:var(--gold-deep)]";

const BRANCH_COLOR: Record<string, string> = {
  mathematics: "var(--aegean)",
  physics: "var(--copper)",
  chemistry: "var(--laurel-core)",
  information: "var(--aegean-dark)",
  biophysics: "var(--crimson)",
  cosmology: "var(--verdigris)",
  mind: "var(--gold)",
  bucketmath: "var(--stone-300)",
};

const MINT_STYLE: Record<MintState, string> = {
  minted: "border-[color:var(--laurel-deep)] text-[color:var(--laurel-deep)]",
  pending: "border-[color:var(--gold-deep)] text-[color:var(--gold-deep)]",
  draft: "border-[color:var(--basalt-3)] text-[color:var(--basalt-2)]",
  unminted: "border-[color:var(--crimson)] text-[color:var(--crimson)]",
};

function Dial({ p }: { p: AtlasProduction }) {
  const { x, y } = dialPoint(p.theta, p.solvability);
  return (
    <svg viewBox="0 0 44 44" className="w-10 h-10 shrink-0" aria-hidden="true">
      <circle cx="22" cy="22" r="19" fill="none" stroke="var(--hairline)" />
      <circle cx="22" cy="22" r="6" fill="none" stroke="var(--hairline)" strokeDasharray="2 2" />
      <line x1="22" y1="22" x2={x} y2={y} stroke="var(--basalt-3)" />
      <circle cx={x} cy={y} r="3" fill={BRANCH_COLOR[p.branch]} />
    </svg>
  );
}

function Card({ p }: { p: AtlasProduction }) {
  const years = p.resolved ? `${p.posed} to ${p.resolved}` : `${p.posed}, open`;
  return (
    <article className="border border-[color:var(--hairline)] bg-white/60 p-4 flex flex-col gap-3 min-w-0" style={{ borderTop: `3px solid ${BRANCH_COLOR[p.branch]}` }}>
      <div className="flex items-center justify-between gap-2">
        <span className={LABEL} style={{ color: BRANCH_COLOR[p.branch] }}>{p.branch}</span>
        <span className={`border px-2 text-[10px] small-caps tracking-[0.14em] ${MINT_STYLE[p.mint_state]}`} title={MINT_HINT[p.mint_state]}>
          {p.mint_state}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Dial p={p} />
        <h3 className="font-display text-[17px] leading-tight text-[color:var(--basalt)]">{p.title}</h3>
      </div>
      <p className="text-[13px] leading-relaxed text-[color:var(--basalt-2)]">{p.claim}</p>
      <dl className="grid grid-cols-4 border-y border-[color:var(--hairline)] py-2 tabular-nums">
        {[
          ["level", `L${p.level}`],
          ["formal", p.formal],
          ["solvable", p.solvability.toFixed(2)],
          ["status", p.status],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className={LABEL}>{k}</dt>
            <dd className="font-mono text-[12px] text-[color:var(--basalt)]">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11px] text-[color:var(--basalt-3)] mr-1">{years}</span>
        {p.markets.map((m) => (
          <span key={m} className="border border-[color:var(--hairline)] bg-[color:var(--bone-2)] px-1.5 text-[11px]">{m}</span>
        ))}
      </div>
      <p className="text-[11px] text-[color:var(--basalt-3)]">{p.tokens.join(", ")}</p>
      {p.sources[0]?.url && (
        <a href={p.sources[0].url} target="_blank" rel="noreferrer" className="text-[11px] underline underline-offset-4 text-[color:var(--aegean-deep)]">
          {p.sources[0].label}
        </a>
      )}
    </article>
  );
}

function Pills<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`${LABEL} mr-1`}>{label}</span>
      {options.map((o) => (
        <button key={o.v || "all"} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)} className={`${PILL} ${value === o.v ? ON : OFF}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SolvabilityAtlas({ data }: { data: SolvabilityAtlasData }) {
  const [f, setF] = useState<AtlasFilter>({ source: "problem", branch: "", mint: "" });
  const rows = useMemo(() => filterProductions(data.productions, f), [data.productions, f]);
  const counts = mintCounts(data.productions);
  const s = data.summary;
  const stats: [string, string][] = [
    ["nodes and links", `${s.nodes} nodes, ${s.edges} links, ${s.components} components`],
    ["density", String(s.density)],
    ["weighted clustering", String(s.avg_clustering)],
    ["communities, modularity", `${s.communities}, ${s.modularity}`],
    ["branch assortativity", String(s.branch_assortativity)],
    ["solvability vs neighbours", `r = ${s.solvability_neighbor_corr}, permutation p < 0.001`],
    ["level vs solvability, Spearman", String(s.spearman_level_vs_solvability)],
    ["markets vs level, Spearman", String(s.spearman_markets_vs_level)],
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Research OS · a production of bucket.foundation"
        title="solvability atlas"
        lede={`${data.productions.length} productions: open and settled problems across the seven canon branches, and the theorems of BucketMath. Each card carries its level, formal proof status, solvability and minted state. The dial marks its angle on the token circle and its solvability as distance from the centre. Regenerate everything with ${data.generator}/build.sh.`}
      />

      <div className="flex flex-wrap gap-8 font-mono tabular-nums">
        {MINT_STATES.map((m) => (
          <div key={m} className="flex flex-col">
            <span className={`text-[28px] ${MINT_STYLE[m].split(" ")[1]}`}>{counts[m]}</span>
            <span className={LABEL}>{m}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-y border-[color:var(--hairline)] py-3">
        <Pills label="source" value={f.source} onChange={(v) => setF({ ...f, source: v })} options={[{ v: "problem", label: "problems" }, { v: "lean", label: "BucketMath" }]} />
        <Pills label="branch" value={f.branch} onChange={(v) => setF({ ...f, branch: v })} options={[{ v: "", label: "all" }, ...BRANCHES.filter((b) => b !== "bucketmath").map((b) => ({ v: b, label: b }))]} />
        <Pills label="minted" value={f.mint} onChange={(v) => setF({ ...f, mint: v })} options={[{ v: "", label: "all" }, ...MINT_STATES.map((m) => ({ v: m, label: m }))]} />
      </div>

      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        {rows.map((p) => (
          <Card key={p.id} p={p} />
        ))}
      </div>
      {rows.length === 0 && <p className="text-[13px] text-[color:var(--basalt-3)]">No production matches these filters.</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="network statistics" meta={`k = ${s.k}`}>
          <table className="w-full text-[13px] tabular-nums">
            <tbody>
              {stats.map(([k, v]) => (
                <tr key={k} className="border-b border-[color:var(--hairline)]">
                  <th className="text-left font-normal py-1.5 pr-4 text-[color:var(--basalt-3)]">{k}</th>
                  <td className="font-mono">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="strongest bridges" meta="betweenness">
          <ol className="flex flex-col text-[13px]">
            {s.top_bridges_betweenness.map(([n, b]) => (
              <li key={n} className="flex justify-between border-b border-[color:var(--hairline)] py-1.5">
                <span>{n}</span>
                <span className="font-mono text-[color:var(--basalt-3)]">{b.toFixed(4)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {data.plots.map((p) => (
          <figure key={p.src} className="border border-[color:var(--hairline)] bg-white">
            <a href={p.src} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.title} loading="lazy" className="w-full block" />
            </a>
            <figcaption className="p-3 text-[12px] text-[color:var(--basalt-2)] border-t border-[color:var(--hairline)]">
              <b className="text-[color:var(--basalt)]">{p.title}.</b> {p.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <Panel title="method">
        <div className="flex flex-col gap-2 text-[13px] text-[color:var(--basalt-2)] max-w-[72ch]">
          <p>Solvability = 0.55 x resolved + 0.45 x formal, with formal at proved 1.0, partial 0.6, statement 0.35 and none 0.1. Formal counts a machine-checked proof in Lean, Coq, Isabelle or HOL Light.</p>
          <p>Minted state follows formal status: proved is minted, partial is pending, a stated result is draft, no formalization is unminted. Minted maps to an accepted production and pending to submitted.</p>
          <p>Embeddings come from bge-small-en-v1.5 over name, branch and tokens. Angle is rank along the first two principal directions. The catalog in problems.tsv, the levels and the market tags are hand-curated and open to review.</p>
        </div>
      </Panel>
    </div>
  );
}
