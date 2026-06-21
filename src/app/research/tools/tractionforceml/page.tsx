import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("tractionforceml");
const _jsonld = toolJsonLd("tractionforceml");
import TractionForceClient from "./TractionForceClient";

// TractionForceML run page.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-tractionforceml"
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
          / TractionForceML
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          traction{" "}
          <span className="inlay-gold">fields.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Provide a relaxed reference and a deformed bead image. TractionForceML runs real block-matching PIV (normalized cross-correlation) to recover the per-window displacement field and a strain-energy proxy. The demo recovers a known imposed shift.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <TractionForceClient />
        </div>
      </div>
    </main>
  );
}
