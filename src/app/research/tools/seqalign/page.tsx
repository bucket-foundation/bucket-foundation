import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("seqalign");
const _jsonld = toolJsonLd("seqalign");
import SeqAlignClient from "./SeqAlignClient";

// SeqAlign run page — server shell framing the interactive client island.
export default function Page() {
  const t = getTool("seqalign");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-seqalign"
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
          / {t?.name ?? "SeqAlign"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          align two <span className="inlay-gold">sequences.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste two protein or nucleotide sequences. SeqAlign runs the exact
          dynamic-programming alignment — Needleman-Wunsch for global, end-to-end
          alignment, or Smith-Waterman for the best local sub-segment — scored
          with the real BLOSUM62 substitution matrix (proteins) or an identity
          matrix (nucleotides) and a linear gap penalty. You get the aligned
          strings, the optimal score, match/mismatch/gap counts, and percent
          identity. No heuristic, no GPU — the true optimum.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <SeqAlignClient />
        </div>
      </div>
    </main>
  );
}
