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
