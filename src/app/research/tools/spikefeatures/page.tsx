import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("spikefeatures");
const _jsonld = toolJsonLd("spikefeatures");
import SpikeFeaturesClient from "./SpikeFeaturesClient";

// SpikeFeatures run page — spike detection + waveform feature extraction.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-spikefeatures"
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
          / SpikeFeatures
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          detect spikes,{" "}
          <span className="inlay-gold">measure waveforms.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a voltage trace. SpikeFeatures runs a real MAD-robust threshold
          detector (Quiroga-2004 noise estimate) with refractory enforcement and
          waveform alignment, then extracts genuine cell-type signatures:
          peak-to-trough amplitude, trough-to-peak width, half-width, firing rate
          and ISI statistics. Try the <strong>demo</strong> train — its spike
          count is known, so you can verify detection accuracy.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <SpikeFeaturesClient />
        </div>
      </div>
    </main>
  );
}
