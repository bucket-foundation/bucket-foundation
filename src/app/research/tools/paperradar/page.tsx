import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("paperradar");
const _jsonld = toolJsonLd("paperradar");
import PaperRadarClient from "./PaperRadarClient";

// PaperRadar run page, personalized recent-paper feed grounded in live OpenAlex.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-paperradar"
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
          / PaperRadar
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          today&apos;s papers that{" "}
          <span className="inlay-gold">matter to you.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Name your topics. PaperRadar queries the live OpenAlex index for recent
          work, ranks each paper by relevance to you, recency, and citation
          velocity, and explains in one line why it matters to your project — a
          citeable digest, not an inbox.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <PaperRadarClient />
        </div>
      </div>
    </main>
  );
}
