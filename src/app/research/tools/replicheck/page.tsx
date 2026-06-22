import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("replicheck");
const _jsonld = toolJsonLd("replicheck");
import RepliCheckClient from "./RepliCheckClient";

// RepliCheck run page.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-replicheck"
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
          / RepliCheck
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          check the{" "}
          <span className="inlay-gold">statistics.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a Results section. RepliCheck recomputes every reported p-value from its test
          statistic and degrees of freedom (statcheck-style, Nuijten 2016, via scipy), runs the
          GRIM test (Brown &amp; Heathers 2017) to catch means that are mathematically impossible
          for the reported sample size, and flags missing multiple-comparison correction,
          confidence intervals, and effect sizes. An all-field tool: reproducible statistics are
          mandated by funders and journals across every discipline.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <RepliCheckClient />
        </div>
      </div>
    </main>
  );
}
