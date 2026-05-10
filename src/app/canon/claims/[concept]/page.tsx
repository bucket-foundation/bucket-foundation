// /canon/claims/[concept] — all curated claims for a concept.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaimsByConcept, getConcepts } from "@/lib/canon-claims";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getConcepts().map((c) => ({ concept: c.concept }));
}

export function generateMetadata({ params }: { params: { concept: string } }) {
  return { title: `${params.concept} · canon claims · bucket.foundation` };
}

export default function Page({ params }: { params: { concept: string } }) {
  const all = getClaimsByConcept();
  const claims = all[params.concept];
  if (!claims) notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <p
        className="mb-3 text-xs uppercase tracking-[0.22em]"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
      >
        <Link href="/canon/claims" className="hover:text-[color:var(--gold)]">
          ← canon claims
        </Link>
      </p>
      <h1
        className="text-[2.4rem] capitalize leading-[1.05] md:text-[3.4rem]"
        style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
      >
        {params.concept.replace(/-/g, " ")}
      </h1>
      <p
        className="mt-3 text-lg"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
      >
        {claims.length} candidate claims · branch V · biophysics
      </p>

      <ul className="mt-12 space-y-8">
        {claims.map((c) => (
          <li
            key={c.slug}
            className="border-l-2 border-[color:var(--hairline)] pl-5 transition hover:border-[color:var(--gold)]"
          >
            <div
              className="mb-2 flex items-baseline gap-3 text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
            >
              <span>score {c.score}</span>
              <span>·</span>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:text-[color:var(--gold)] hover:underline"
              >
                {c.timestamp} ↗
              </a>
              {c.crossConcepts.length > 0 && (
                <>
                  <span>·</span>
                  <span>{c.crossConcepts.join(" · ")}</span>
                </>
              )}
            </div>
            <Link
              href={`/canon/claims/${c.concept}/${c.slug}`}
              className="block text-lg md:text-xl"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {c.excerpt}
            </Link>
            <div
              className="mt-2 text-sm"
              style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
            >
              — {c.videoTitle}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
