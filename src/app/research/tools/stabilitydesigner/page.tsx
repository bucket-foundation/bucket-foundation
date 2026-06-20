import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("stabilitydesigner");
const _jsonld = toolJsonLd("stabilitydesigner");
import StabilityDesignerClient from "./StabilityDesignerClient";

// StabilityDesigner run page — server-component shell (matches /research styling).
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-stabilitydesigner"
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
          / StabilityDesigner
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          predict a mutation&apos;s{" "}
          <span className="inlay-gold">ΔΔG.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Give a sequence and a point mutation (e.g. A23V) to predict the folding
          free-energy change — or scan a whole position to find the most
          stabilizing substitution. Interpretable biophysical features,
          benchmarked on S669 / Ssym. Sign convention: ΔΔG &lt; 0 ⇒ stabilizing.
        </p>
        <div className="carved-rule max-w-xs mt-10" />
        <div className="mt-12">
          <StabilityDesignerClient />
        </div>
      </div>
    </main>
  );
}
