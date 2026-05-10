// /canon/claims — index of curated candidate canon claims by concept.
// Build-time render. Filesystem is the CMS.

import Link from "next/link";
import { getClaimsByConcept, getConcepts } from "@/lib/canon-claims";

export const metadata = { title: "Canon claims · bucket.foundation" };
export const dynamic = "force-static";

export default function Page() {
  const concepts = getConcepts();
  const byConcept = getClaimsByConcept();
  const total = concepts.reduce((s, c) => s + c.count, 0);

  return (
    <main className="mx-auto max-w-5xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <header className="mb-12">
        <p
          className="mb-4 text-xs uppercase tracking-[0.22em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Branch V · biophysics · candidate claims
        </p>
        <h1
          className="text-[2.4rem] leading-[1.05] md:text-[3.4rem]"
          style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
        >
          Canon claims
        </h1>
        <p
          className="mt-4 max-w-2xl text-lg md:text-xl"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
        >
          {total} curated candidate claims across {concepts.length} concepts,
          mined from {/* hardcoded for now */}126 long-form podcast transcripts.
          Each card carries the verbatim excerpt, a timestamped link to source,
          and a curation checklist. <em>Candidates, not yet canon</em>.
        </p>
      </header>

      <section className="mb-16">
        <h2
          className="mb-6 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          By concept
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {concepts.map(({ concept, count }) => (
            <Link
              key={concept}
              href={`/canon/claims/${concept}`}
              className="group flex items-baseline justify-between rounded-md border border-[color:var(--hairline)] px-4 py-3 transition hover:border-[color:var(--gold)]"
            >
              <span
                className="capitalize"
                style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
              >
                {concept.replace(/-/g, " ")}
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
              >
                {count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2
          className="mb-6 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Top-scored across all concepts
        </h2>
        <ul className="space-y-5">
          {Object.values(byConcept)
            .flat()
            .sort((a, b) => b.score - a.score)
            .slice(0, 25)
            .map((c) => (
              <li
                key={`${c.concept}/${c.slug}`}
                className="border-l-2 border-[color:var(--hairline)] pl-4 transition hover:border-[color:var(--gold)]"
              >
                <div className="mb-1 flex items-baseline gap-3 text-xs uppercase tracking-[0.18em]"
                     style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                  <span>{c.concept.replace(/-/g, " ")}</span>
                  <span>·</span>
                  <span>score {c.score}</span>
                  <span>·</span>
                  <span>{c.timestamp}</span>
                </div>
                <Link
                  href={`/canon/claims/${c.concept}/${c.slug}`}
                  className="block text-base md:text-lg"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  {c.excerpt.slice(0, 280)}
                  {c.excerpt.length > 280 ? "…" : ""}
                </Link>
                <div
                  className="mt-1 text-sm"
                  style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
                >
                  — {c.videoTitle}
                </div>
              </li>
            ))}
        </ul>
      </section>

      <footer
        className="mt-20 border-t border-[color:var(--hairline)] pt-8 text-sm"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
      >
        <p>
          Candidate claims are extracted heuristically — assertion-pattern signals
          (&ldquo;the rule is&rdquo;, &ldquo;always&rdquo;, &ldquo;causes&rdquo;, &ldquo;must&rdquo;, &ldquo;only&rdquo;, &ldquo;I proved&rdquo;)
          intersected with canon-tier concept terms. Each must be human-verified
          and cross-cited to a primary source before promotion to canon.
        </p>
        <p className="mt-3">
          See <Link className="underline" href="/canon">canon overview</Link> for
          the seven branches.
        </p>
      </footer>
    </main>
  );
}
