import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("proteinscout");
const _jsonld = toolJsonLd("proteinscout");
import ProteinScoutClient from "./ProteinScoutClient";

// ProteinScout run page — server-component shell (matches /research styling).
// See docs/research-tools/04-implementation-architecture.md §2.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-proteinscout"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(_jsonld) }}
        />
      )}
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link href="/research/tools" className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]">
            § Research · tools
          </Link>{" "}
          / ProteinScout
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          read a sequence{" "}
          <span className="inlay-gold">residue by residue.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Give a protein sequence (raw or FASTA) or a UniProt accession.
          ProteinScout computes per-residue biophysics — transmembrane topology,
          aggregation-prone regions, disorder, coiled-coils, charge/pI — with an
          ML layer benchmarked against the single-scale baselines, and writes a
          self-contained report.
        </p>
        <div className="carved-rule max-w-xs mt-10" />
        <div className="mt-12">
          <ProteinScoutClient />
        </div>
      </div>
    </main>
  );
}
