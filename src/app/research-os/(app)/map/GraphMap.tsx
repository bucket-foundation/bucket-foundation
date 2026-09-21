"use client";

import { OUTAGE_COPY, UNCONFIGURED_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { layoutGraph, ROW_H } from "@/lib/research-os/graph-layout";
import { ErrorState, LoadingState, STAGE_LABEL } from "@/components/ui";

interface GNode {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  frontierFlag: string | null;
  visibility: string;
  source: string;
}
interface GEdge {
  fromId: string;
  toId: string;
  kind: string;
}
interface GraphData {
  branch: string;
  nodes: GNode[];
  edges: GEdge[];
  standing: Record<string, string>;
  assignments: { nodeId: string; title: string; className: string; dueAt: string | null }[];
  holders: Record<string, Record<string, number>> | null;
  learners: number;
  signedIn: boolean;
}

const branchLabel = (id: string) => id.replace(/^\d+-/, "").replace(/-/g, " ");

/** What a node came from, for the stroke and the filter: the Academy, the canon, the person's own work. */
const SOURCE_OF: Record<string, string> = {
  academy_atom: "atoms",
  seed: "atoms",
  // A transcript card is a source excerpt, out of canon by the founder's
  // decision of 2026-09-21, so it gets its own filter rather than sitting
  // under claims. `canon_claim` stays until the hosted graph takes the
  // migration that renames it, and both answer the same group.
  source_excerpt: "excerpts",
  canon_claim: "excerpts",
  canon_concept: "claims",
  canon_bridge: "claims",
  canon_entry: "papers",
  canon_paper: "papers",
  canon_source: "papers",
  canon_figure: "figures",
  canon_site: "figures",
  production: "productions",
  import: "productions",
};
const SOURCE_STROKE: Record<string, string> = { atoms: "var(--basalt-3)", claims: "var(--aegean-deep)", papers: "var(--gold-deep)", figures: "var(--laurel-deep)", productions: "var(--crimson)" };
const SOURCES = ["atoms", "claims", "excerpts", "papers", "figures", "productions"] as const;
const PRODUCTION_KINDS = new Set(["production", "extension", "replication", "peer_review", "hypothesis"]);
const sourceOf = (n: GNode) => SOURCE_OF[n.source] ?? (PRODUCTION_KINDS.has(n.kind) || n.source === "import" ? "productions" : "atoms");

const STAGE_FILL: Record<string, string> = {
  access: "var(--basalt-3)",
  awareness: "var(--aegean-deep)",
  understanding: "var(--gold)",
  internalization: "var(--laurel-deep)",
  production: "var(--basalt)",
};
const RANK: Record<string, number> = { access: 1, awareness: 2, understanding: 3, internalization: 4, production: 5 };
const R = 6;

/**
 * The map as the graph: one branch laid out by tier, every node a point
 * colored by the viewer's standing, prerequisite edges as lines, the
 * frontier ringed, assignments marked, and for staff a class heatmap.
 * Click a node to open its page; type to find one.
 */
export default function GraphMap({ initialBranch, initialQuery }: { initialBranch: string; initialQuery: string }) {
  const router = useRouter();
  const [branch, setBranch] = useState(initialBranch);
  const [data, setData] = useState<GraphData | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [q, setQ] = useState(initialQuery);
  const [layer, setLayer] = useState<"standing" | "class">("standing");
  const [hover, setHover] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: string; nodes: number }[]>([]);
  const [show, setShow] = useState<Set<string>>(() => new Set(SOURCES));
  // Two meanings behind one 503, told apart by the body (Bucket critic C59).
  const [code, setCode] = useState<string | null>(null);
  const [branchesUnavailable, setBranchesUnavailable] = useState(false);

  useEffect(() => {
    fetch("/api/research-os/graph?list=1", { cache: "no-store" })
      // C62: a failed branch count rendered as a graph with no branches
      // in it, which is the outage reading as an answer.
      .then(async (r) => {
        if (r.ok) return (await r.json()) as { branches?: { id: string; nodes: number }[] };
        setBranchesUnavailable(true);
        return { branches: [] };
      })
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => setBranchesUnavailable(true));
  }, []);

  useEffect(() => {
    let alive = true;
    setStatus(null);
    fetch(`/api/research-os/graph?branch=${encodeURIComponent(branch)}`, { cache: "no-store" })
      .then(async (r) => {
        if (!alive) return;
        setStatus(r.status);
        if (r.ok) {
          setData((await r.json()) as GraphData);
          return;
        }
        setCode(await readErrorCode(r));
      })
      .catch(() => alive && setStatus(0));
    return () => {
      alive = false;
    };
  }, [branch]);

  const shown = useMemo(() => (data ? data.nodes.filter((n) => show.has(sourceOf(n))) : []), [data, show]);
  const shownIds = useMemo(() => new Set(shown.map((n) => n.id)), [shown]);
  const layout = useMemo(() => (data ? layoutGraph(shown.map((n) => ({ id: n.id, tier: n.tier, title: n.title })), data.edges.filter((e) => shownIds.has(e.fromId) && shownIds.has(e.toId))) : null), [data, shown, shownIds]);
  const pos = useMemo(() => new Map((layout?.placed ?? []).map((p) => [p.id, p])), [layout]);
  const byId = useMemo(() => new Map((data?.nodes ?? []).map((n) => [n.id, n])), [data]);
  const needle = q.trim().toLowerCase();
  const matches = useMemo(() => (needle && data ? new Set(data.nodes.filter((n) => n.title.toLowerCase().includes(needle)).map((n) => n.id)) : null), [needle, data]);
  const assignedIds = useMemo(() => new Set((data?.assignments ?? []).map((a) => a.nodeId)), [data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    Object.values(data?.standing ?? {}).forEach((s) => (c[s] = (c[s] ?? 0) + 1));
    return c;
  }, [data]);

  function fillFor(n: GNode): { fill: string; opacity: number } {
    if (layer === "class" && data?.holders) {
      const h = data.holders[n.id];
      const held = h ? (h.understanding ?? 0) + (h.internalization ?? 0) + (h.production ?? 0) : 0;
      const share = data.learners ? held / data.learners : 0;
      return { fill: "var(--gold-deep)", opacity: 0.15 + 0.85 * share };
    }
    const s = data?.standing[n.id];
    return s ? { fill: STAGE_FILL[s] ?? "var(--basalt-3)", opacity: 1 } : { fill: "var(--bone-3)", opacity: 1 };
  }

  const hovered = hover ? byId.get(hover) : null;
  const hoveredPos = hover ? pos.get(hover) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {branchesUnavailable && (
          <span className="text-[11px] text-[color:var(--basalt-3)]">the branch list could not be read, showing this branch alone</span>
        )}
        <div role="tablist" aria-label="Branch" className="flex flex-wrap gap-1">
          {(branches.length ? branches : [{ id: branch, nodes: 0 }]).map((b) => (
            <button
              key={b.id}
              role="tab"
              aria-selected={branch === b.id}
              title={b.nodes ? `${b.nodes} nodes` : undefined}
              onClick={() => {
                setBranch(b.id);
                router.replace(`/research-os/map?branch=${encodeURIComponent(b.id)}`);
              }}
              className={"small-caps text-[10px] tracking-[0.16em] px-3 py-2 border rounded-sm min-h-[36px] " + (branch === b.id ? "border-[color:var(--gold-deep)] text-[color:var(--basalt)] bg-[color:var(--bone)]" : "border-[color:var(--hairline)] text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]")}
            >
              {branchLabel(b.id)}
            </button>
          ))}
        </div>
        <input id="map-find" value={q} onChange={(e) => setQ(e.target.value)} placeholder="find a node" className="ml-auto border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60 min-w-[200px]" />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[color:var(--basalt-3)]">
        {data?.holders && (
          <div role="group" aria-label="Layer" className="flex gap-1">
            {(["standing", "class"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLayer(l)} className={"small-caps tracking-[0.14em] px-2 py-1 border rounded-sm " + (layer === l ? "border-[color:var(--gold-deep)] text-[color:var(--basalt)]" : "border-[color:var(--hairline)]")}>
                {l === "standing" ? "your standing" : `class heatmap · ${data.learners} learner${data.learners === 1 ? "" : "s"}`}
              </button>
            ))}
          </div>
        )}
        {layer === "standing" && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            <li className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--bone-3)", border: "1px solid var(--hairline)" }} /> unopened</li>
            {Object.keys(RANK).map((s) => (
              <li key={s} className="inline-flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STAGE_FILL[s] }} /> {STAGE_LABEL[s]} {counts[s] ? `· ${counts[s]}` : ""}
              </li>
            ))}
            <li className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: "var(--gold-deep)" }} /> frontier</li>
            <li className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5" style={{ background: "var(--crimson)" }} /> assigned</li>
          </ul>
        )}
        {layer === "class" && <span>Darker gold: more of your learners hold the node at Understanding or above.</span>}
        <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
          {SOURCES.map((src) => (
            <button
              key={src}
              type="button"
              aria-pressed={show.has(src)}
              onClick={() =>
                setShow((prev) => {
                  const next = new Set(prev);
                  if (next.has(src)) next.delete(src);
                  else next.add(src);
                  return next;
                })
              }
              className={"small-caps tracking-[0.14em] px-2 py-1 border rounded-sm inline-flex items-center gap-1 " + (show.has(src) ? "border-[color:var(--basalt-3)] text-[color:var(--basalt)]" : "border-[color:var(--hairline)] text-[color:var(--basalt-3)] opacity-60")}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ border: `2px solid ${SOURCE_STROKE[src]}` }} />
              {src}
              {data ? ` · ${data.nodes.filter((n) => sourceOf(n) === src).length}` : ""}
            </button>
          ))}
        </div>
        {data && <span className="ml-auto [font-variant-numeric:tabular-nums]">{shown.length} of {data.nodes.length} nodes · {data.edges.length} edges</span>}
      </div>

      {status === null ? (
        <LoadingState label="Laying out the branch" />
      ) : isTransientOutage(status, code) ? (
        <ErrorState title={OUTAGE_COPY.title} body={OUTAGE_COPY.body} retry={() => location.reload()} />
      ) : status === 503 ? (
        <ErrorState title={UNCONFIGURED_COPY.title} body={UNCONFIGURED_COPY.body} />
      ) : !data || !layout ? (
        <ErrorState body="Could not load the branch." />
      ) : (
        <div className="relative overflow-auto border border-[color:var(--hairline)] bg-[color:var(--bone)]/60 rounded-sm" style={{ maxHeight: "calc(100vh - 20rem)", minHeight: 360 }}>
          <svg width={layout.width} height={layout.height} role="img" aria-label={`${branch} graph`} style={{ display: "block", fontFamily: "inherit" }}>
            {layout.columns.map((t, i) => (
              <text key={t} x={40 + i * 220} y={16} fontSize="10" fill="var(--basalt-3)" letterSpacing="0.15em">
                TIER {t}
              </text>
            ))}
            <g stroke="var(--hairline)" strokeWidth="1" fill="none">
              {data.edges
                .filter((e) => shownIds.has(e.fromId) && shownIds.has(e.toId))
                .map((e) => {
                  const a = pos.get(e.fromId);
                  const b = pos.get(e.toId);
                  if (!a || !b) return null;
                  const lit = hover === e.fromId || hover === e.toId;
                  const mx = (a.x + b.x) / 2;
                  const canon = e.kind !== "prerequisite";
                  return (
                    <path
                      key={`${e.fromId}-${e.toId}-${e.kind}`}
                      d={`M${a.x + R},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x - R},${b.y}`}
                      stroke={lit ? "var(--gold-deep)" : canon ? "var(--aegean-deep)" : "var(--hairline)"}
                      strokeOpacity={lit ? 1 : canon ? 0.35 : 1}
                      strokeDasharray={canon ? "3 3" : undefined}
                      strokeWidth={lit ? 1.5 : 1}
                    />
                  );
                })}
            </g>
            {shown.map((n) => {
              const p = pos.get(n.id);
              if (!p) return null;
              const f = fillFor(n);
              const stroke = n.frontierFlag ? "var(--gold-deep)" : SOURCE_STROKE[sourceOf(n)];
              const dim = matches && !matches.has(n.id);
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.18 : 1} style={{ cursor: "pointer" }} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/research-os/n/${encodeURIComponent(n.slug)}`)}>
                  {assignedIds.has(n.id) && <rect x={-R - 3} y={-R - 3} width={2 * R + 6} height={2 * R + 6} fill="none" stroke="var(--crimson)" strokeWidth="1.5" />}
                  <circle r={R} fill={f.fill} fillOpacity={f.opacity} stroke={stroke} strokeWidth={n.frontierFlag ? 2.5 : 1.25} />
                  <text x={R + 5} y={4} fontSize="11" fill="var(--basalt)" style={{ pointerEvents: "none" }}>
                    {n.title.length > 30 ? n.title.slice(0, 29) + "…" : n.title}
                  </text>
                </g>
              );
            })}
          </svg>
          {hovered && hoveredPos && (
            <div className="pointer-events-none absolute z-10 max-w-[280px] bg-[color:var(--bone)] border border-[color:var(--hairline)] shadow-[0_4px_16px_-4px_rgba(31,28,22,0.3)] px-3 py-2 text-[12px]" style={{ left: Math.min(hoveredPos.x + 16, layout.width - 290), top: hoveredPos.y + ROW_H / 2 }}>
              <div className="text-[color:var(--basalt)]">{hovered.title}</div>
              <div className="text-[color:var(--basalt-3)]">
                {hovered.kind.replace("_", " ")} · tier {hovered.tier}
                {data.standing[hovered.id] ? ` · ${STAGE_LABEL[data.standing[hovered.id]]}` : data.signedIn ? " · unopened" : ""}
                {hovered.frontierFlag ? ` · ${hovered.frontierFlag.replace("_", " ")}` : ""}
              </div>
              {layer === "class" && data.holders?.[hovered.id] && (
                <div className="text-[color:var(--basalt-3)]">
                  {Object.entries(data.holders[hovered.id]).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${STAGE_LABEL[k] ?? k}`).join(" · ")}
                </div>
              )}
              {data.assignments.filter((a) => a.nodeId === hovered.id).map((a) => (
                <div key={a.title} className="text-[color:var(--crimson)]">assigned: {a.title} · {a.className}</div>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-[12px] text-[color:var(--basalt-3)]">
        Click a node to open it. The globe view keeps the canon&rsquo;s figures, sites, and years:{" "}
        <Link href="/research-os/map?view=globe" className="underline underline-offset-4">open the globe</Link>.
      </p>
    </div>
  );
}
