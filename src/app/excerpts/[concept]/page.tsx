import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaimsByConcept, getConcepts } from "@/lib/canon-claims";
import { ExcerptListV2 } from "../ExcerptListV2";
import { isFoundationTier, toExcerptItem } from "../qualify-v2";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getConcepts().map((c) => ({ concept: c.concept }));
}

export function generateMetadata({ params }: { params: { concept: string } }) {
  return { title: `${params.concept.replace(/-/g, " ")} · source excerpts · bucket.foundation` };
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
        <Link href="/excerpts" className="hover:text-[color:var(--gold)]">
          ← source excerpts
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
        {claims.filter(isFoundationTier).length} foundation-tier of {claims.length} {claims.length === 1 ? "excerpt" : "excerpts"} · {claims[0].branch}
      </p>

      <div className="mt-12">
        <ExcerptListV2 items={claims.map(toExcerptItem)} showConcept={false} />
      </div>
    </main>
  );
}
