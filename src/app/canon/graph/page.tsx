// /canon/graph — the canon collaboration network.
// Renders as a sortable table at build time + the raw graph JSON as a download.
// (No client JS dep; an interactive force-directed view can be added later
// if we pull in d3-force.)

import Link from "next/link";
import { getCanonGraph } from "@/lib/canon-graph";
import {
  getKGSummary,
  getCentralityTopAuthors,
  getCentralityTopConcepts,
} from "@/lib/canon-kg";

export const metadata = { title: "Canon graph · bucket.foundation" };
export const dynamic = "force-static";

export default function Page() {
  const g = getCanonGraph();
  const kg = getKGSummary();
  const topAuthors = getCentralityTopAuthors();
  const topConcepts = getCentralityTopConcepts();
  const sortedNodes = [...g.nodes].sort((a, b) => b.centrality - a.centrality);

  // Build cluster map: each connected component
  const clusters = computeClusters(g);

  return (
    <main className="mx-auto max-w-5xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <header className="mb-12">
        <p
          className="mb-4 text-xs uppercase tracking-[0.22em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Meta · canon graph
        </p>
        <h1
          className="text-[2.4rem] leading-[1.05] md:text-[3.4rem]"
          style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
        >
          The Canon Network
        </h1>
        <p
          className="mt-4 max-w-2xl text-lg md:text-xl"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
        >
          {kg.n_nodes > 0 ? (
            <>
              {kg.n_nodes.toLocaleString()} nodes ·{" "}
              {kg.by_kind.claim || 0} claims ·{" "}
              {kg.by_kind.concept || 0} concepts ·{" "}
              {kg.by_kind.bridge || 0} bridges ·{" "}
              {kg.by_kind.author || 0} authors. The full canon knowledge
              graph — built from OpenAlex citation data + UMAP→HDBSCAN
              cluster detection + canon-tuned embedding similarity.
            </>
          ) : (
            <>
              {g.nodes.length} canon-target authors · {g.edges.length} direct
              collaboration edges (shared works in OpenAlex).
            </>
          )}
        </p>
        <p
          className="mt-2 max-w-2xl text-sm"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
        >
          The raw graph (1,133 nodes, 2,001 edges, 128-d node2vec
          embeddings) ships in this repo at{" "}
          <code>_intake/training/kg.gpickle</code> +{" "}
          <code>kg-embeddings.npy</code>. See{" "}
          <Link href="https://github.com/bucket-foundation/bucket-foundation/blob/main/REPRODUCE.md" className="underline">
            REPRODUCE.md
          </Link>{" "}
          for collaborator access.
        </p>
      </header>

      {topConcepts.length > 0 && (
        <section className="mb-16">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Most central concepts (PageRank on full KG)
          </h2>
          <p
            className="mb-4 text-sm"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
          >
            Concepts that anchor the most cross-branch connections.
            These are the conceptual hubs around which canon density
            organizes.
          </p>
          <div className="space-y-1 text-base" style={{ fontFamily: "var(--font-fraunces)" }}>
            {topConcepts.slice(0, 15).map((c, i) => (
              <div key={`${c.branch}/${c.concept}`} className="flex items-baseline justify-between gap-4">
                <span>
                  <span
                    className="mr-3 inline-block w-6 text-right"
                    style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/canon/claims/${c.concept}`}
                    className="hover:text-[color:var(--gold)]"
                  >
                    {c.concept.replace(/-/g, " ")}
                  </Link>
                  <span
                    className="ml-2 text-xs uppercase tracking-[0.14em]"
                    style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                  >
                    {c.branch}
                  </span>
                </span>
                <span
                  className="text-xs uppercase tracking-[0.16em]"
                  style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                >
                  pr {c.pagerank.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {topAuthors.length > 0 && (
        <section className="mb-16">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Most central authors (PageRank, canon-graph-internal)
          </h2>
          <p
            className="mb-4 text-sm"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
          >
            Not global h-index ranking — these are the people most
            central to <em>this corpus's</em> intellectual lineage,
            measured by PageRank on the canon knowledge graph.
          </p>
          <div className="space-y-1 text-base" style={{ fontFamily: "var(--font-fraunces)" }}>
            {topAuthors.slice(0, 15).map((a, i) => (
              <div key={a.name} className="flex items-baseline justify-between gap-4">
                <span>
                  <span
                    className="mr-3 inline-block w-6 text-right"
                    style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontWeight: 500 }}>{a.name}</span>
                </span>
                <span
                  className="text-xs uppercase tracking-[0.16em]"
                  style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                >
                  pr {a.pagerank.toFixed(4)} · h{a.hIndex} · {a.citedBy.toLocaleString()} cites
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-16">
        <h2
          className="mb-4 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Most-central authors (weighted-degree)
        </h2>
        <div className="space-y-1 text-base" style={{ fontFamily: "var(--font-fraunces)" }}>
          {sortedNodes.slice(0, 25).map((n, i) => (
            <div key={n.id} className="flex items-baseline justify-between gap-4">
              <span>
                <span
                  className="mr-3 inline-block w-6 text-right"
                  style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontWeight: 500 }}>{n.name}</span>
              </span>
              <span
                className="text-xs uppercase tracking-[0.16em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
              >
                {n.centrality} weighted · {n.edges} edges
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2
          className="mb-4 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Connected clusters
        </h2>
        <p
          className="mb-4 text-sm"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
        >
          Authors grouped by direct-collaboration components.
        </p>
        <div className="space-y-4">
          {clusters.map((cluster, i) => (
            <div
              key={i}
              className="rounded-md border border-[color:var(--hairline)] p-4"
            >
              <div
                className="mb-2 text-xs uppercase tracking-[0.18em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
              >
                Cluster {i + 1} · {cluster.length} authors
              </div>
              <div style={{ fontFamily: "var(--font-fraunces)" }}>
                {cluster.map((name) => name).join(" · ")}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2
          className="mb-4 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Top collaboration pairs
        </h2>
        <div className="space-y-1 text-base" style={{ fontFamily: "var(--font-fraunces)" }}>
          {[...g.edges]
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 25)
            .map((e, i) => {
              const aName = g.nodes.find((n) => n.id === e.source)?.name || e.source;
              const bName = g.nodes.find((n) => n.id === e.target)?.name || e.target;
              return (
                <div key={i} className="flex items-baseline justify-between gap-4">
                  <span>
                    <span style={{ fontWeight: 500 }}>{aName}</span>
                    <span style={{ color: "var(--parchment-dim)" }}> ↔ </span>
                    <span style={{ fontWeight: 500 }}>{bName}</span>
                  </span>
                  <span
                    className="text-xs uppercase tracking-[0.16em]"
                    style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                  >
                    {e.weight} shared works
                  </span>
                </div>
              );
            })}
        </div>
      </section>

      <footer
        className="mt-20 border-t border-[color:var(--hairline)] pt-8 text-sm"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
      >
        <p>
          Data:{" "}
          <Link href="/canon/bridges" className="underline">
            bridges
          </Link>{" "}
          ·{" "}
          <Link href="/canon/claims" className="underline">
            claims
          </Link>{" "}
          ·{" "}
          <Link href="/canon" className="underline">
            seven branches
          </Link>
        </p>
        <p className="mt-2">
          See <code>_intake/connections/COAUTHOR-MATRIX.md</code> for the
          complete pair list and per-author top-collaborator breakdown.
        </p>
      </footer>
    </main>
  );
}

// Connected components via union-find
function computeClusters(g: { nodes: { id: string; name: string }[]; edges: { source: string; target: string }[] }) {
  const parent = new Map<string, string>();
  for (const n of g.nodes) parent.set(n.id, n.id);
  const find = (x: string): string => {
    let r = parent.get(x)!;
    while (r !== parent.get(r)) {
      parent.set(r, parent.get(parent.get(r)!)!);
      r = parent.get(r)!;
    }
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const e of g.edges) union(e.source, e.target);

  const components = new Map<string, string[]>();
  for (const n of g.nodes) {
    const r = find(n.id);
    if (!components.has(r)) components.set(r, []);
    components.get(r)!.push(n.name);
  }
  return Array.from(components.values()).sort((a, b) => b.length - a.length);
}
