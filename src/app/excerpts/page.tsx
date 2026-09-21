// /excerpts, source excerpts by concept: passages from talks and podcasts,
// each with its video and timestamp. They sat at /canon/claims until the
// founder's decision of 2026-09-21 moved them out of canon.
// Build-time render. Filesystem is the CMS.

import Link from "next/link";
import { getClaimsByConcept, getConcepts } from "@/lib/canon-claims";

export const metadata = { title: "Source excerpts · bucket.foundation" };
export const dynamic = "force-static";

export default function Page() {
  const concepts = getConcepts();
  const byConcept = getClaimsByConcept();
  const total = concepts.reduce((s, c) => s + c.count, 0);
  const videos = new Set(Object.values(byConcept).flat().map((c) => c.videoSlug)).size;

  return (
    <main className="mx-auto max-w-5xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <header className="mb-12">
        <p
          className="mb-4 text-xs uppercase tracking-[0.22em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Source excerpts · talks and podcasts
        </p>
        <h1
          className="text-[2.4rem] leading-[1.05] md:text-[3.4rem]"
          style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
        >
          Source excerpts
        </h1>
        <p
          className="mt-4 max-w-2xl text-lg md:text-xl"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
        >
          {total} passages across {concepts.length} concepts, from {videos} talks
          and podcasts. Each carries the verbatim transcript, a timestamped link
          to the video, and a curation checklist. An excerpt joins the canon when
          it names the foundation it rests on and a primary source backs it.
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
              href={`/excerpts/${concept}`}
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
                  href={`/excerpts/${c.concept}/${c.slug}`}
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
          Excerpts are found by pattern: assertion signals
          (&ldquo;the rule is&rdquo;, &ldquo;always&rdquo;, &ldquo;causes&rdquo;, &ldquo;must&rdquo;, &ldquo;only&rdquo;, &ldquo;I proved&rdquo;)
          in a transcript line that names a canon concept. A person checks each
          one against a primary source before it can join the canon.
        </p>
        <p className="mt-3">
          See <Link className="underline" href="/canon">canon overview</Link> for
          the branches.
        </p>
      </footer>
    </main>
  );
}
