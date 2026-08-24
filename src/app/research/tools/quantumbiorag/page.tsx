import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("quantumbiorag");
const _jsonld = toolJsonLd("quantumbiorag");
import QuantumBioRAGClient from "./QuantumBioRAGClient";

// QuantumBioRAG run page, claim-strength RAG over the quantum-biology literature.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-quantumbiorag"
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
          / QuantumBioRAG
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          evidence, not{" "}
          <span className="inlay-gold">hype.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          State a quantum-biology or biophysics claim. QuantumBioRAG retrieves the
          live OpenAlex evidence and scores how strongly it is supported — weighting
          each paper by on-topic overlap, citation uptake, and recency — so a
          replicated, well-cited result outweighs a fringe mention. It reports a
          support strength, a consensus score, and the deciding sentences.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <QuantumBioRAGClient />
        </div>
      </div>
    </main>
  );
}
