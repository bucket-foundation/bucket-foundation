"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import SliceCircle from "./SliceCircle";
import { ERAS, SPACE_VIEWS, eraOf, type SpaceView } from "@/lib/research-os/solvability-space";
import { branchColor, solvabilityGuides, solvabilityLayout, visibleRows } from "@/lib/research-os/solvability-scene";
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

const SceneHost = dynamic(() => import("@/components/explore/SceneHost"), { ssr: false });
const SCENE_COLORS: Record<string, string> = Object.fromEntries(BRANCHES.map((b) => [b, branchColor(b)]));

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
        <span className={`border px-2 text-[10px] small-caps tracking-[0.14em] ${MINT_STYLE[p.mint_state]}`} title={`minted by ${p.mint_basis}: ${MINT_HINT[p.mint_state]}`}>
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
          ["cluster", `C${p.community}`],
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
      {p.formal !== "none" && (
        <p className="text-[11px] text-[color:var(--basalt-3)]">
          formal status:{" "}
          {p.formal_source ? (
            p.formal_source.url ? (
              <a href={p.formal_source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 text-[color:var(--aegean-deep)]">
                {p.formal_source.label}
              </a>
            ) : (
              p.formal_source.label
            )
          ) : (
            <span className="text-[color:var(--crimson)]">curator judgement, no source yet</span>
          )}
        </p>
      )}
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
  const [view, setView] = useState<"cards" | SpaceView>("cards");
  const [year, setYear] = useState(2026);
  const [selected, setSelected] = useState<string | null>(null);
  const [era, setEra] = useState(3);
  const picked = rows.find((p) => p.id === selected) ?? null;
  const guides = useMemo(() => (view === "cards" ? [] : solvabilityGuides(view, visibleRows(rows, year))), [rows, view, year]);
  const layout = useMemo(() => (view === "cards" ? null : solvabilityLayout(rows, view, year, selected, guides)), [rows, view, year, selected, guides]);
  const select = (id: string) => {
    setSelected(id);
    const p = rows.find((r) => r.id === id);
    if (p) setEra(eraOf(p.posed));
  };
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
        <Pills label="branch" value={f.branch} onChange={(v) => setF({ ...f, branch: v })} options={[{ v: "", label: "all" }, ...BRANCHES.filter((b) => b !== "bucketmath" && b !== "applied").map((b) => ({ v: b, label: b }))]} />
        <Pills label="minted" value={f.mint} onChange={(v) => setF({ ...f, mint: v })} options={[{ v: "", label: "all" }, ...MINT_STATES.map((m) => ({ v: m, label: m }))]} />
      </div>

      <div className="flex flex-col gap-2">
        <Pills label="view" value={view} onChange={setView} options={[{ v: "cards", label: "cards" }, ...SPACE_VIEWS.map((v) => ({ v, label: v }))]} />
        {view !== "cards" && (
          <label htmlFor="atlas-year" className="flex items-center gap-3 font-mono tabular-nums text-[12px]">
            <span className={LABEL}>year</span>
            <input id="atlas-year" type="range" min={1600} max={2026} value={year} onChange={(e) => setYear(Number(e.target.value))} className="flex-1 accent-[color:var(--gold-deep)]" />
            <span>{year}</span>
          </label>
        )}
      </div>

      {view === "cards" ? (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {rows.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-2 min-w-0">
            {layout && <SceneHost key={view} layout={layout} selected={selected} onSelect={select} />}
            <div className="flex flex-wrap gap-3 text-[12px]">
              {layout?.legend.map((l) => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
            <Pills label="era" value={String(era)} onChange={(v) => setEra(Number(v))} options={ERAS.map((e, i) => ({ v: String(i), label: e.label }))} />
            <p className="text-[12px] text-[color:var(--basalt-3)]">Drag to orbit, scroll to zoom. Click a problem to open its card and its era; pick an era to see it as a circle graph. Time runs from back left to front right; a larger dot is resolved by the chosen year; gold rings trace solvability smoothed across time and angle.</p>
          </div>
          <div className="flex flex-col gap-4 min-w-0">
            <SliceCircle rows={rows} era={era} year={year} selected={selected} colors={SCENE_COLORS} onSelect={select} />
            {picked ? <Card p={picked} /> : <p className="text-[13px] text-[color:var(--basalt-3)]">Pick a problem to see its card.</p>}
          </div>
        </div>
      )}
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
          <p>Minted state is measured by formal proof status: a machine-checked proof is minted, partial formalization is pending, a formal statement with an open proof is draft, and no formal statement is unminted. It records proof status and involves no token or chain.</p>
          <p>Embeddings come from bge-small-en-v1.5 over name, branch and tokens. Angle is rank along the first two principal directions. The catalog in problems.tsv, the levels and the market tags are hand-curated and open to review. Each card cites the formalization behind its formal status from formal_sources.tsv; BucketMath cards cite lean/manifest.json. A card without a citation says so and its status is curator judgement.</p>
        </div>
      </Panel>
    </div>
  );
}
