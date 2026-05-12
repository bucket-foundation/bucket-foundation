// /canon/claims/[concept]/[slug] — single curated claim card.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaim, getClaimsByConcept } from "@/lib/canon-claims";
import { getEvidenceFor, prettySourcePath, sourceKind } from "@/lib/canon-evidence";

export const dynamic = "force-static";

export function generateStaticParams() {
  const all = getClaimsByConcept();
  const out: { concept: string; slug: string }[] = [];
  for (const [concept, claims] of Object.entries(all)) {
    for (const c of claims) out.push({ concept, slug: c.slug });
  }
  return out;
}

export function generateMetadata({ params }: { params: { concept: string; slug: string } }) {
  const c = getClaim(params.concept, params.slug);
  if (!c) return { title: "Claim · bucket.foundation" };
  return {
    title: `${c.excerpt.slice(0, 60)}… · ${c.concept} · bucket.foundation`,
    description: c.excerpt.slice(0, 160),
  };
}

export default function Page({ params }: { params: { concept: string; slug: string } }) {
  const c = getClaim(params.concept, params.slug);
  if (!c) notFound();
  const evidence = getEvidenceFor(params.concept, params.slug);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <p
        className="mb-3 text-xs uppercase tracking-[0.22em]"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
      >
        <Link href={`/canon/claims/${c.concept}`} className="hover:text-[color:var(--gold)]">
          ← {c.concept.replace(/-/g, " ")}
        </Link>
      </p>

      <article>
        <blockquote
          className="border-l-2 border-[color:var(--gold)] pl-6 text-2xl leading-[1.4] md:text-[1.7rem]"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {c.excerpt}
        </blockquote>

        <dl
          className="mt-12 space-y-4 text-base"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <dt className="text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
              Source
            </dt>
            <dd>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:text-[color:var(--gold)] hover:underline"
              >
                {c.videoTitle} · {c.timestamp} ↗
              </a>
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <dt className="text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
              Concept
            </dt>
            <dd className="capitalize">{c.concept.replace(/-/g, " ")}</dd>
          </div>
          {c.crossConcepts.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-3">
              <dt className="text-xs uppercase tracking-[0.2em]"
                  style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                Cross-concepts
              </dt>
              <dd className="capitalize">{c.crossConcepts.map((x) => x.replace(/-/g, " ")).join(" · ")}</dd>
            </div>
          )}
          <div className="flex flex-wrap items-baseline gap-3">
            <dt className="text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
              Score
            </dt>
            <dd>
              {c.score}
              {c.patternSignals.length > 0 && (
                <span style={{ color: "var(--parchment-dim)" }}>
                  {" "}
                  · {c.patternSignals.join(" · ")}
                </span>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <dt className="text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
              Status
            </dt>
            <dd style={{ color: "var(--ochre)" }}>
              candidate — not yet promoted to canon
            </dd>
          </div>
        </dl>

        {evidence && evidence.evidence.length > 0 && (
          <section className="mt-16">
            <h2
              className="mb-4 text-xs uppercase tracking-[0.22em]"
              style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
            >
              Corpus evidence — top {evidence.evidence.length} passages
            </h2>
            <p
              className="mb-6 text-sm"
              style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
            >
              Most-relevant passages from the entire indexed corpus
              ({Math.round(67286).toLocaleString()} paragraph chunks
              across YouTube transcripts, PubMed, arXiv, archive.org,
              Stanford Encyclopedia of Philosophy, OpenAlex, and more)
              ranked by semantic similarity (bge-small-en-v1.5).
            </p>
            <ol className="space-y-4">
              {evidence.evidence.map((e, i) => (
                <li
                  key={i}
                  className="rounded-md border border-[color:var(--hairline)] p-4"
                >
                  <div
                    className="mb-2 flex items-baseline justify-between gap-3 text-xs uppercase tracking-[0.14em]"
                    style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                  >
                    <span>
                      {String(i + 1).padStart(2, "0")} · {sourceKind(e.source_path)}
                    </span>
                    <span>{e.score.toFixed(3)}</span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {e.text.slice(0, 600)}
                    {e.text.length > 600 && "…"}
                  </p>
                  <p
                    className="mt-2 truncate text-xs"
                    style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                  >
                    {prettySourcePath(e.source_path)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section
          className="mt-16 rounded-md border border-[color:var(--hairline)] p-6 text-sm"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
        >
          <p className="mb-3 text-xs uppercase tracking-[0.22em]"
             style={{ fontFamily: "var(--font-jetbrains)" }}>
            Curation checklist
          </p>
          <ul className="space-y-2">
            <li>☐ Verify excerpt against source recording</li>
            <li>☐ Tag tier (axiom · law · principle · primary derivation · observation)</li>
            <li>☐ Cross-cite to ≥1 primary source (PubMed / arXiv / archive.org)</li>
            <li>☐ Promote to <code>bucket-canon/{c.branch}/</code></li>
          </ul>
        </section>
      </article>
    </main>
  );
}
