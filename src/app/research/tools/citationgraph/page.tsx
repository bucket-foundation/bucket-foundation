import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("citationgraph");
const _jsonld = toolJsonLd("citationgraph");
import CitationGraphClient from "./CitationGraphClient";

// CitationGraph run page, local citation neighborhood from the OpenAlex graph.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-citationgraph"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(_jsonld) }}
        />
      )}
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link
            href="/research/tools"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]"
          >
            § Research · tools
          </Link>{" "}
          / CitationGraph
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          who sits around{" "}
          <span className="inlay-gold">this paper?</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Give a DOI, an OpenAlex ID, or a title. CitationGraph builds the paper&apos;s
          local citation neighborhood from the live OpenAlex graph — its references
          and the works that cite it — then ranks the key related works by degree
          centrality, so the most-connected neighbors surface first.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <CitationGraphClient />
        </div>
      </div>
    </main>
  );
}
