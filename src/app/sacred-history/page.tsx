// /sacred-history — the sacred-history corpus surface.
//
// A rights-aware, citeable index of cross-tradition sacred figures, a
// claim-backed sacred timeline, and AI-generated *contestable* cross-tradition
// correlations. Tier-A (public-domain / open / CC0) only. Local-model pipeline.
//
// Build-time static render. Filesystem is the CMS (src/data/sacred-history.json).

import type { Metadata } from "next";
import Link from "next/link";
import {
  getSacredHistory,
  traditionLabel,
  yearLabel,
  type SHCorrelation,
  type SHEvent,
  type SHFigure,
} from "@/lib/sacred-history";

export const metadata: Metadata = {
  title: "Sacred history · bucket.foundation",
  description:
    "A rights-aware, citeable index of the world's sacred figures, a claim-backed sacred timeline, and AI-generated contestable cross-tradition correlations. build the past. build history.",
  alternates: { canonical: "/sacred-history" },
  openGraph: {
    title: "Sacred history — bucket.foundation",
    description:
      "Cross-tradition figures, a claim-backed timeline, and contestable AI correlations across the world's sacred traditions.",
    url: "https://www.bucket.foundation/sacred-history",
    type: "website",
  },
};

export const dynamic = "force-static";

const LABEL =
  "text-xs uppercase tracking-[0.22em] text-[color:var(--parchment-dim)]";
const MONO = { fontFamily: "var(--font-jetbrains)" } as const;
const SERIF = { fontFamily: "var(--font-fraunces)" } as const;

function confidenceTone(c: number | null): string {
  if (c == null) return "var(--parchment-dim)";
  if (c >= 0.75) return "var(--gold-deep, var(--gold))";
  if (c >= 0.6) return "var(--gold)";
  return "var(--parchment-dim)";
}

export default function SacredHistoryPage() {
  const sh = getSacredHistory();
  const figureMappings = sh.correlations.filter(
    (c) => c.kind === "figure-mapping",
  );
  const motifParallels = sh.correlations.filter(
    (c) => c.kind !== "figure-mapping",
  );

  return (
    <main className="mx-auto max-w-5xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="mb-14">
        <p className={`mb-4 ${LABEL}`} style={MONO}>
          Sibling corpus · build the past
        </p>
        <h1
          className="text-[2.4rem] leading-[1.05] md:text-[3.6rem]"
          style={{ ...SERIF, fontWeight: 500 }}
        >
          Sacred history
        </h1>
        <p
          className="mt-5 max-w-2xl text-lg md:text-xl"
          style={{ ...SERIF, color: "var(--parchment-dim)" }}
        >
          A rights-aware index of the world&apos;s sacred figures, a claim-backed
          sacred timeline, and AI-generated <em>contestable</em> correlations
          across traditions. Every correlation is a claim with evidence and a
          confidence — never a fact. <em>Candidates, not settled history.</em>
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Figures", sh.summary.figures],
            ["Traditions", sh.summary.traditions],
            ["Correlations", sh.summary.correlations],
            ["Timeline events", sh.summary.timelineEvents],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-md border border-[color:var(--hairline)] px-4 py-3"
            >
              <dt className={LABEL} style={MONO}>
                {k}
              </dt>
              <dd
                className="mt-1 text-2xl"
                style={{ ...SERIF, fontWeight: 500 }}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <p
          className="mt-6 max-w-3xl text-sm"
          style={{ ...SERIF, color: "var(--parchment-dim)" }}
        >
          {sh.method}
        </p>
      </header>

      {/* ── Rights banner ────────────────────────────────────── */}
      <section
        className="mb-16 rounded-md border border-[color:var(--hairline)] bg-[color:var(--bone-2,transparent)] px-5 py-4"
        aria-label="rights policy"
      >
        <p className={`mb-1 ${LABEL}`} style={MONO}>
          Rights · Tier {sh.rights.tier}
        </p>
        <p className="text-sm" style={{ ...SERIF, color: "var(--parchment-dim)" }}>
          {sh.rights.policy}
        </p>
      </section>

      {/* ── Timeline ─────────────────────────────────────────── */}
      <section className="mb-20">
        <SectionHead
          kicker="Sacred timeline"
          title="A claim-backed chronology"
          blurb={`${sh.timeline.length} datable anchor points across the traditions, from ${sh.summary.earliestEvent} to ${sh.summary.latestEvent}. Dates are conventional scholarly placements, surfaced as claim-backed — disputed dates are flagged, not hidden.`}
        />
        <ol className="mt-8 space-y-0">
          {sh.timeline.map((e) => (
            <TimelineRow key={e.id} e={e} />
          ))}
        </ol>
      </section>

      {/* ── Cross-tradition figures ──────────────────────────── */}
      <section className="mb-20">
        <SectionHead
          kicker="Entity graph"
          title="Cross-tradition figures"
          blurb={`${sh.figures.length} figures across ${sh.summary.traditions} traditions, each carrying its motifs, the traditions that claim it, a historicity assessment, and a Wikidata locator. The shared motifs are what the correlation engine reasons over.`}
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sh.figures.map((f) => (
            <FigureCard key={f.id} f={f} />
          ))}
        </div>
      </section>

      {/* ── Figure-mapping correlations ──────────────────────── */}
      <section className="mb-20">
        <SectionHead
          kicker="Branch analysis · AI claims"
          title="Cross-tradition figure mappings"
          blurb={`${figureMappings.length} candidate figure-to-figure correspondences proposed by the local model from shared motifs and embedding similarity. Each is contestable — weigh the evidence and the counter-considerations.`}
        />
        <div className="mt-8 space-y-6">
          {figureMappings.map((c) => (
            <ClaimCard key={c.id} c={c} />
          ))}
        </div>
      </section>

      {/* ── Motif-parallel correlations ──────────────────────── */}
      <section className="mb-10">
        <SectionHead
          kicker="Branch analysis · AI claims"
          title="Motif parallels"
          blurb={`${motifParallels.length} candidate motif parallels across traditions (flood, ark, founding-patriarch, and others). Generated as contestable claims with a self-reported confidence and counter-considerations.`}
        />
        <div className="mt-8 space-y-6">
          {motifParallels.map((c) => (
            <ClaimCard key={c.id} c={c} />
          ))}
        </div>
      </section>

      <footer className="mt-20 border-t border-[color:var(--hairline)] pt-8">
        <p className="text-xs" style={{ ...MONO, color: "var(--parchment-dim)" }}>
          Sibling corpus to the foundations canon — peer of the longevity canon,
          not an eighth canon branch. Generated {sh.generatedAt.slice(0, 10)} ·
          local model · $0 paid AI spend ·{" "}
          <Link href="/canon" className="hover:text-[color:var(--gold)]">
            see the canon →
          </Link>
        </p>
      </footer>
    </main>
  );
}

/* ── components ─────────────────────────────────────────────── */

function SectionHead({
  kicker,
  title,
  blurb,
}: {
  kicker: string;
  title: string;
  blurb: string;
}) {
  return (
    <header>
      <p className={`mb-3 ${LABEL}`} style={MONO}>
        {kicker}
      </p>
      <h2
        className="text-[1.7rem] leading-tight md:text-[2.2rem]"
        style={{ ...SERIF, fontWeight: 500 }}
      >
        {title}
      </h2>
      <p
        className="mt-3 max-w-2xl text-base md:text-lg"
        style={{ ...SERIF, color: "var(--parchment-dim)" }}
      >
        {blurb}
      </p>
    </header>
  );
}

function TimelineRow({ e }: { e: SHEvent }) {
  return (
    <li className="flex gap-5 border-l-2 border-[color:var(--hairline)] py-3 pl-5 transition hover:border-[color:var(--gold)]">
      <span
        className="w-24 shrink-0 pt-0.5 text-sm tabular-nums"
        style={{ ...MONO, color: "var(--parchment-dim)" }}
      >
        {yearLabel(e.year)}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span style={{ ...SERIF, fontWeight: 500 }}>{e.label}</span>
          {e.disputed && (
            <span
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ ...MONO, color: "var(--gold)" }}
            >
              date disputed
            </span>
          )}
        </p>
        <p
          className="mt-1 text-xs uppercase tracking-[0.12em]"
          style={{ ...MONO, color: "var(--parchment-dim)" }}
        >
          {e.eventClass.replace(/-/g, " ")} ·{" "}
          {e.traditions.map(traditionLabel).join(" · ")}
        </p>
        {e.note && (
          <p
            className="mt-1 text-sm"
            style={{ ...SERIF, color: "var(--parchment-dim)" }}
          >
            {e.note}
          </p>
        )}
        {e.wikidataUrl && (
          <a
            href={e.wikidataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs hover:text-[color:var(--gold)]"
            style={{ ...MONO, color: "var(--parchment-dim)" }}
          >
            {e.wikidata} ↗
          </a>
        )}
      </div>
    </li>
  );
}

function FigureCard({ f }: { f: SHFigure }) {
  return (
    <article className="rounded-md border border-[color:var(--hairline)] px-5 py-4 transition hover:border-[color:var(--gold)]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg" style={{ ...SERIF, fontWeight: 500 }}>
          {f.label}
        </h3>
        {f.historicity && (
          <span
            className="shrink-0 text-[10px] uppercase tracking-[0.15em]"
            style={{ ...MONO, color: "var(--parchment-dim)" }}
          >
            {f.historicity}
          </span>
        )}
      </div>
      {f.aka.length > 0 && (
        <p
          className="mt-0.5 text-sm italic"
          style={{ ...SERIF, color: "var(--parchment-dim)" }}
        >
          {f.aka.join(" · ")}
        </p>
      )}
      <p
        className="mt-2 text-xs uppercase tracking-[0.12em]"
        style={{ ...MONO, color: "var(--parchment-dim)" }}
      >
        {f.traditions.map(traditionLabel).join(" · ")}
      </p>
      {f.motifs.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {f.motifs.map((m) => (
            <li
              key={m}
              className="rounded-full border border-[color:var(--hairline)] px-2.5 py-0.5 text-[11px]"
              style={{ ...MONO, color: "var(--parchment-dim)" }}
            >
              {m.replace(/-/g, " ")}
            </li>
          ))}
        </ul>
      )}
      {f.wikidataUrl && (
        <a
          href={f.wikidataUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs hover:text-[color:var(--gold)]"
          style={{ ...MONO, color: "var(--parchment-dim)" }}
        >
          {f.wikidata} ↗
        </a>
      )}
    </article>
  );
}

function ClaimCard({ c }: { c: SHCorrelation }) {
  const conf = c.confidence;
  return (
    <article className="rounded-md border border-[color:var(--hairline)] px-5 py-5 transition hover:border-[color:var(--gold)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ ...MONO, color: "var(--gold)" }}
        >
          {c.stance}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.12em]"
          style={{ ...MONO, color: "var(--parchment-dim)" }}
        >
          {c.kind.replace(/-/g, " ")}
        </span>
        {conf != null && (
          <span
            className="text-[11px] tabular-nums"
            style={{ ...MONO, color: confidenceTone(conf) }}
          >
            confidence {(conf * 100).toFixed(0)}%
          </span>
        )}
      </div>

      <p
        className="mt-3 text-base md:text-lg"
        style={{ ...SERIF, fontWeight: 450 }}
      >
        {c.statement || c.label}
      </p>

      {/* sides */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={MONO}>
        <SidePill
          tradition={c.sideA.tradition}
          node={c.sideA.node}
          wikidata={c.sideA.wikidata}
        />
        <span style={{ color: "var(--parchment-dim)" }}>↔</span>
        <SidePill
          tradition={c.sideB.tradition}
          node={c.sideB.node}
          wikidata={c.sideB.wikidata}
        />
      </div>

      {/* evidence */}
      {c.evidence.length > 0 && (
        <details className="mt-4 group">
          <summary
            className="cursor-pointer text-xs uppercase tracking-[0.15em] hover:text-[color:var(--gold)]"
            style={{ ...MONO, color: "var(--parchment-dim)" }}
          >
            Evidence ({c.evidence.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {c.evidence.map((ev, i) => (
              <li
                key={i}
                className="border-l-2 border-[color:var(--hairline)] pl-3 text-sm"
                style={{ ...SERIF, color: "var(--parchment-dim)" }}
              >
                <span
                  className="mr-2 text-[10px] uppercase tracking-[0.12em]"
                  style={{ ...MONO }}
                >
                  {ev.kind} · tier {ev.rightsTier}
                </span>
                {ev.summary}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* counter-considerations */}
      {c.counterConsiderations.length > 0 && (
        <div className="mt-4">
          <p className={`mb-1 ${LABEL}`} style={MONO}>
            Counter-considerations
          </p>
          <ul className="space-y-1">
            {c.counterConsiderations.map((cc, i) => (
              <li
                key={i}
                className="text-sm"
                style={{ ...SERIF, color: "var(--parchment-dim)" }}
              >
                — {cc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* provenance */}
      <p
        className="mt-4 border-t border-[color:var(--hairline)] pt-3 text-[11px]"
        style={{ ...MONO, color: "var(--parchment-dim)" }}
      >
        {c.provenance.assertedBy}
        {c.provenance.model ? ` · ${c.provenance.model}` : ""}
        {c.provenance.method ? ` · ${c.provenance.method}` : ""}
        {c.provenance.addedOn ? ` · ${c.provenance.addedOn}` : ""}
      </p>
    </article>
  );
}

function SidePill({
  tradition,
  node,
  wikidata,
}: {
  tradition: string | null;
  node: string | null;
  wikidata: string | null;
}) {
  const inner = (
    <span className="rounded-full border border-[color:var(--hairline)] px-3 py-1">
      <span style={{ color: "var(--basalt, inherit)" }}>
        {node ? node.replace(/-/g, " ") : "?"}
      </span>
      {tradition && (
        <span style={{ color: "var(--parchment-dim)" }}>
          {" "}
          · {traditionLabel(tradition)}
        </span>
      )}
    </span>
  );
  if (wikidata && /^Q\d+$/.test(wikidata)) {
    return (
      <a
        href={`https://www.wikidata.org/wiki/${wikidata}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-[color:var(--gold)]"
      >
        {inner}
      </a>
    );
  }
  return inner;
}
