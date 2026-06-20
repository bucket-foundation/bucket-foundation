import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("toxinchannelfinder");
const _jsonld = toolJsonLd("toxinchannelfinder");
import ToxinChannelFinderClient from "./ToxinChannelFinderClient";

// ToxinChannelFinder run page — toxin/peptide → ranked ion-channel targets.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-toxinchannelfinder"
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
          / ToxinChannelFinder
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          map a toxin to its{" "}
          <span className="inlay-gold">channel target.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Enter a toxin/peptide by name (e.g. ω-conotoxin MVIIA, apamin,
          tetrodotoxin) or by amino-acid sequence. ToxinChannelFinder fuses a
          curated venom-peptide pharmacology knowledge base with live OpenAlex
          literature co-occurrence to return a ranked ion-channel target table
          with honest confidence and citeable exemplar papers. Sequences are
          classified by their cysteine framework.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <ToxinChannelFinderClient />
        </div>
      </div>
    </main>
  );
}
