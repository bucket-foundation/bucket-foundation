import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("calciumtraceml");
const _jsonld = toolJsonLd("calciumtraceml");
import CalciumTraceClient from "./CalciumTraceClient";

// CalciumTraceML run page.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-calciumtraceml"
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
          / CalciumTraceML
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          ΔF/F &{" "}
          <span className="inlay-gold">detect events.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a calcium-imaging fluorescence trace. CalciumTraceML computes ΔF/F against a rolling-percentile F0 baseline, then detects transients (MAD-robust threshold) and fits a single-exponential decay-τ to each. Try the demo trace — its event count is known, so you can verify detection.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <CalciumTraceClient />
        </div>
      </div>
    </main>
  );
}
