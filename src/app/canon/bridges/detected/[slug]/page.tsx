// /canon/bridges/detected/[slug] — single detected primitive bridge page.
// Renders LLM-named multi-branch primitives discovered via embedding clustering.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDetectedBridges, getDetectedBridge } from "@/lib/canon-detected-bridges";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllDetectedBridges().map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const b = getDetectedBridge(params.slug);
  if (!b) return { title: "Bridge · bucket.foundation" };
  return { title: `${b.name} · canon bridge · bucket.foundation` };
}

export default function Page({ params }: { params: { slug: string } }) {
  const b = getDetectedBridge(params.slug);
  if (!b) return notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <header className="mb-12">
        <p
          className="mb-4 text-xs uppercase tracking-[0.22em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          <Link href="/canon/bridges" className="hover:underline">
            ← canon bridges
          </Link>
          {" · "}
          Detected primitive
        </p>
        <h1
          className="text-[2.4rem] leading-[1.05] md:text-[3.4rem]"
          style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
        >
          {b.name}
        </h1>
        <p
          className="mt-4 text-sm uppercase tracking-[0.18em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          {b.branchCount} branches · {b.size} claims · bridge score {b.bridgeScore.toFixed(2)}
        </p>
      </header>

      {b.canonicalForm && (
        <section className="mb-12">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Canonical form
          </h2>
          <blockquote
            className="border-l-4 border-[color:var(--gold)] pl-6 text-2xl italic"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {b.canonicalForm}
          </blockquote>
        </section>
      )}

      {b.description && (
        <section className="mb-12">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Description
          </h2>
          <p
            className="text-lg leading-relaxed"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {b.description}
          </p>
        </section>
      )}

      {b.branches.length > 0 && (
        <section className="mb-12">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Spans
          </h2>
          <div className="flex flex-wrap gap-2">
            {b.branches.map((br) => (
              <Link
                key={br}
                href={`/canon/${br}`}
                className="rounded-full border border-[color:var(--hairline)] px-3 py-1 text-xs uppercase tracking-[0.16em] hover:border-[color:var(--gold)]"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {br}
              </Link>
            ))}
          </div>
        </section>
      )}

      {b.vocabularyMap.length > 0 && (
        <section className="mb-12">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Vocabulary across branches
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
              <thead>
                <tr className="border-b border-[color:var(--hairline)] text-left text-xs uppercase tracking-[0.16em]" style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                  <th className="py-2 pr-4">Branch</th>
                  <th className="py-2 pr-4">Term</th>
                  <th className="py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {b.vocabularyMap.map((v, i) => (
                  <tr key={i} className="border-b border-[color:var(--hairline)]/50">
                    <td className="py-2 pr-4 text-xs uppercase tracking-[0.14em]" style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                      {v.branch}
                    </td>
                    <td className="py-2 pr-4 italic">{v.term}</td>
                    <td className="py-2">{v.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {b.testFalsifiability && (
        <section className="mb-12">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Test / falsifiability
          </h2>
          <p className="text-base" style={{ fontFamily: "var(--font-fraunces)" }}>
            {b.testFalsifiability}
          </p>
        </section>
      )}

      {b.memberClaims.length > 0 && (
        <section className="mb-12">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Source claims ({b.memberClaims.length})
          </h2>
          <ul className="space-y-2">
            {b.memberClaims.map((m, i) => (
              <li key={i} className="text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
                <span
                  className="mr-2 inline-block text-xs uppercase tracking-[0.14em]"
                  style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                >
                  [{m.branch}/{m.concept}]
                </span>
                {m.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer
        className="mt-20 border-t border-[color:var(--hairline)] pt-8 text-sm"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
      >
        <p>
          Method: claim-card embeddings (nomic-embed-text, 768d) → UMAP +
          HDBSCAN → multi-branch clusters → LLM-named via local llama3.2:3b.
          See <code>_intake/TRUTH-EXTRACTION-DESIGN.md</code> for the full pipeline.
        </p>
      </footer>
    </main>
  );
}
