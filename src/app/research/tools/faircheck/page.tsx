import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("faircheck");
const _jsonld = toolJsonLd("faircheck");
import FAIRCheckClient from "./FAIRCheckClient";

// FAIRCheck run page.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-faircheck"
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
          / FAIRCheck
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          score your data{" "}
          <span className="inlay-gold">FAIR.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a dataset&apos;s metadata. FAIRCheck scores it against the 15 FAIR
          sub-principles (Findable, Accessible, Interoperable, Reusable; Wilkinson 2016) with
          concrete, deterministic checks — persistent identifier, open license, machine-readable
          formats, community vocabularies, provenance — and returns per-principle subscores, an
          overall 0–100 FAIR score, and a prioritized fix list. An all-field tool: FAIR data
          management is funder-mandated across NIH, NSF, Horizon Europe, Wellcome, and Gates.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <FAIRCheckClient />
        </div>
      </div>
    </main>
  );
}
