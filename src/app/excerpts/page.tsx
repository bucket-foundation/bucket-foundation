import Link from "next/link";
import { getClaimsByConcept, getConcepts } from "@/lib/canon-claims";
import { ExcerptListV2 } from "./ExcerptListV2";
import { isFoundationTier, toExcerptItem } from "./qualify-v2";

export const metadata = {
  title: "Source excerpts · bucket.foundation",
  description: "Foundation-tier passages from talks and podcasts, each linked to its source recording.",
};
export const dynamic = "force-static";

export default function Page() {
  const concepts = getConcepts();
  const byConcept = getClaimsByConcept();
  const total = concepts.reduce((s, c) => s + c.count, 0);
  const allClaims = Object.values(byConcept).flat();
  const videos = new Set(allClaims.map((c) => c.videoSlug)).size;
  const foundationTotal = allClaims.filter(isFoundationTier).length;
  const foundationByConcept = (concept: string) => (byConcept[concept] ?? []).filter(isFoundationTier).length;
  const ranked = [...allClaims].sort((a, b) => b.score - a.score);
  const items = [
    ...ranked.filter(isFoundationTier).slice(0, 25),
    ...ranked.filter((c) => !isFoundationTier(c)).slice(0, 25),
  ]
    .sort((a, b) => b.score - a.score)
    .map(toExcerptItem);

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
          {foundationTotal} of {total} passages across {concepts.length} concepts
          reach the foundation tier, drawn from {videos} talks and podcasts. Each links to the recording at its timestamp, and foundation-tier
          excerpts carry a curation checklist. An excerpt joins the canon when
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
                {foundationByConcept(concept)}
                <span style={{ opacity: 0.6 }}> of {count}</span>
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
          Top-scored passages
        </h2>
        <ExcerptListV2 items={items} showConcept clip={280} foundationCount={foundationTotal} allCount={total} />
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
