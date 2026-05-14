// /canon — the seven-branch grid + interactive armillary globe.
// Build-time render. The repo IS the CMS.

import Link from "next/link";
import { getBranches } from "@/lib/canon-fs";
import { BRANCHES as STATIC_BRANCHES, REPO_TREE, DRIVE_URL } from "@/lib/canon";
import { GlobeBranch } from "@/components/CanonGlobe";
import CanonGlobeMount from "./CanonGlobeMount";

export const metadata = { title: "Canon · bucket.foundation" };
export const dynamic = "force-static";

const STATUS_BADGE: Record<string, string> = {
  "not yet opened": "text-[color:var(--parchment-dim)] border-[color:var(--hairline)]",
  "intake":         "text-[color:var(--ochre)] border-[color:var(--ochre)]",
  "scaffolded":     "text-[color:var(--gold-deep)] border-[color:var(--gold-deep)]",
  "in progress":    "text-[color:var(--gold)] border-[color:var(--gold)]",
  "complete":       "text-[color:var(--laurel-deep)] border-[color:var(--laurel-deep)]",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

export default function Page() {
  const branches = getBranches();
  const totalEntries = branches.reduce((n, b) => n + b.entryCount, 0);
  const opened = branches.filter((b) => b.exists).length;

  const globeBranches: GlobeBranch[] = branches.map((b) => ({
    slug: b.slug,
    numeral: b.numeral,
    name: b.name,
    status: b.status,
    entryCount: b.entryCount,
  }));

  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-24 pb-10 md:pb-16">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">§ canon</div>
          <h1 className="font-serif-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05] text-[color:var(--basalt)]">
            Build the past.<br />Build history.
          </h1>
          <p className="mt-6 max-w-2xl text-[color:var(--parchment-dim)] text-pretty">
            The canon holds only foundations — axioms, real math, rules, laws, principles, primary derivations.
            Outcomes (longevity, disease, cognition) are downstream applications, not canon.
          </p>

          <nav className="mt-10 flex flex-wrap gap-2 small-caps text-[11px]">
            <Link
              href="/canon/search"
              className="border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2 transition"
            >
              ⌕  search canon
            </Link>
            <Link
              href="/canon/claims"
              className="border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2 transition"
            >
              ◯  599 claim cards
            </Link>
            <Link
              href="/canon/bridges"
              className="border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2 transition"
            >
              ⤺⤻  17 bridges (multi-branch primitives)
            </Link>
            <Link
              href="/canon/graph"
              className="border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2 transition"
            >
              ⌬  knowledge graph
            </Link>
            <a
              href="/api/canon/search?q=consciousness&top_k=5"
              target="_blank"
              rel="noreferrer"
              className="border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-2 transition"
            >
              ⚙  api · for ai agents
            </a>
          </nav>

          <div className="mt-12 mb-10 w-full">
            <CanonGlobeMount branches={globeBranches} />
            <div className="mt-8 text-center small-caps text-[10px] text-[color:var(--parchment-dim)] tracking-[0.15em]">
              hover a marker · click to enter the canon
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 max-w-2xl gap-6">
            <Stat label="branches" value={String(branches.length)} />
            <Stat label="opened" value={String(opened)} />
            <Stat label="canon entries" value={String(totalEntries)} />
          </div>

          {/* Gap-analysis bar — per-branch claim-count visualisation.
              Coverage relative to the deepest branch (currently 05-biophysics
              at 198 cards). Bars dim when a branch is sparse, full when
              dense. Lets visitors see exactly where the canon is thin
              without clicking each branch. */}
          <div className="mt-10 max-w-3xl">
            <div className="small-caps text-[10px] text-[color:var(--parchment-dim)] mb-3 tracking-[0.2em]">
              live coverage · click any branch for detail
            </div>
            <CoverageBar branches={branches} />
          </div>

          <div className="mt-10 flex flex-wrap gap-4 small-caps text-[11px]">
            <a href={REPO_TREE} className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]">bucket-research repo ↗</a>
            <a href={DRIVE_URL} className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]">BucketDrive ↗</a>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--hairline)]">
          {branches.map((b) => {
            const staticMeta = STATIC_BRANCHES.find((s) => s.slug === b.slug);
            const badgeClass = STATUS_BADGE[b.status] || "";
            return (
              <Link
                key={b.dir}
                href={`/canon/${b.slug}`}
                className="group bg-[color:var(--bone-2)] p-6 hover:bg-[color:var(--bone-3)] transition flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="font-mono-mark text-xs text-[color:var(--gold-dim)] group-hover:text-[color:var(--gold)]">
                    {b.numeral} · {b.num}
                  </div>
                  <span className={`small-caps text-[9px] tracking-[0.1em] border px-2 py-[2px] ${badgeClass}`}>
                    {b.status}
                  </span>
                </div>
                <div className="font-serif-display text-2xl text-[color:var(--basalt)] capitalize">
                  {b.name}
                </div>
                {staticMeta?.note && (
                  <div className="text-xs text-[color:var(--parchment-dim)] mt-1">
                    {staticMeta.note}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3 small-caps text-[10px] text-[color:var(--parchment-dim)]">
                  <span>{b.entryCount.toLocaleString()} entries</span>
                  <span>·</span>
                  <span>updated {fmtDate(b.lastUpdated)}</span>
                </div>

                {b.topEntries.length > 0 && (
                  <ul className="mt-4 pt-4 border-t hairline space-y-1 text-[12px] text-[color:var(--basalt-2)]">
                    {b.topEntries.map((e, i) => (
                      <li key={i} className="truncate">
                        <span className="text-[color:var(--gold-deep)] mr-2">·</span>{e.title}
                      </li>
                    ))}
                  </ul>
                )}

                {b.topEntries.length === 0 && b.status === "not yet opened" && (
                  <div className="mt-4 pt-4 border-t hairline text-[12px] text-[color:var(--parchment-dim)] italic">
                    Branch not yet opened. Research in motion.
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif-display text-4xl text-[color:var(--gold)]">{value}</div>
      <div className="small-caps text-[10px] text-[color:var(--parchment-dim)] mt-1">{label}</div>
    </div>
  );
}

// Branch coverage bar — per-branch claim-count viz. Reads claim cards
// directly off disk at build time. Bars dim when sparse, gold when dense.
import fs from "fs";
import path from "path";

function countClaims(branchDir: string): number {
  const sub = path.join(process.cwd(), "bucket-canon", branchDir, "sub-claims");
  if (!fs.existsSync(sub)) return 0;
  let n = 0;
  for (const concept of fs.readdirSync(sub)) {
    const cd = path.join(sub, concept);
    try {
      if (!fs.statSync(cd).isDirectory()) continue;
      for (const f of fs.readdirSync(cd)) {
        if (f.endsWith(".md") && f !== "INDEX.md") n++;
      }
    } catch {
      continue;
    }
  }
  return n;
}

const BRANCH_COLOR: Record<string, string> = {
  mathematics:  "#D9A43A",
  physics:      "#3E6FA8",
  chemistry:    "#9B5A2C",
  information:  "#557B66",
  biophysics:   "#8E3E3E",
  cosmology:    "#5B4882",
  mind:         "#C2873E",
  "deep-history": "#7A5D3E",
  "sacred-texts": "#A0863F",
  art:          "#A45A4C",
  earth:        "#4A6E5E",
};

type BranchLike = { dir: string; slug: string; name: string; numeral: string };

function CoverageBar({ branches }: { branches: BranchLike[] }) {
  const counts = branches.map((b) => ({
    ...b,
    count: countClaims(b.dir),
    color: BRANCH_COLOR[b.slug] || "#D9A43A",
  }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div>
      <div className="space-y-2">
        {counts.map((c) => {
          const pct = (c.count / max) * 100;
          return (
            <a
              key={c.slug}
              href={`/canon/${c.slug}`}
              className="block group"
              title={`${c.count} claim cards in ${c.name}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="font-mono-mark text-[10px] w-16 flex-shrink-0 tracking-[0.05em]"
                  style={{ color: c.color }}
                >
                  {c.numeral} {c.name.toLowerCase()}
                </div>
                <div className="flex-1 h-2 rounded-full bg-[color:var(--bone-3)] overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 group-hover:opacity-80"
                    style={{
                      width: `${Math.max(pct, 1.5)}%`,
                      background: c.color,
                      opacity: c.count === 0 ? 0.15 : 0.85,
                    }}
                  />
                </div>
                <div
                  className="text-[11px] w-16 text-right flex-shrink-0 tabular-nums"
                  style={{ color: c.count === 0 ? "var(--parchment-dim)" : "var(--basalt)" }}
                >
                  {c.count === 0 ? "—" : c.count}
                </div>
              </div>
            </a>
          );
        })}
      </div>
      <div className="mt-3 small-caps text-[10px] text-[color:var(--parchment-dim)] tracking-[0.18em]">
        {total} claim cards · {counts.filter((c) => c.count > 0).length} of {counts.length} branches active
      </div>
    </div>
  );
}
