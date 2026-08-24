import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("materialsfeaturizer");
const _jsonld = toolJsonLd("materialsfeaturizer");
import MaterialsFeaturizerClient from "./MaterialsFeaturizerClient";

// MaterialsFeaturizer run page, server shell framing the interactive client island.
export default function Page() {
  const t = getTool("materialsfeaturizer");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-materialsfeaturizer"
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
          / {t?.name ?? "MaterialsFeaturizer"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          featurize a{" "}
          <span className="inlay-gold">material.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Enter a chemical formula. MaterialsFeaturizer parses the composition (subscripts, fractional stoichiometry, nested parentheses) and computes real Magpie-style elemental-property descriptors — composition-weighted mean, range, and average deviation of atomic weight, Pauling electronegativity, atomic radius, melting point, period/group, and valence-electron count — from a built-in periodic table, plus a flat, ready-to-model feature vector. The standard first step of any materials-property ML model, no GPU required.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <MaterialsFeaturizerClient />
        </div>
      </div>
    </main>
  );
}
