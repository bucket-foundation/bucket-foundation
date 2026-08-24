import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("survivalfit");
const _jsonld = toolJsonLd("survivalfit");
import SurvivalFitClient from "./SurvivalFitClient";

// SurvivalFit run page, server shell framing the interactive client island.
export default function Page() {
  const t = getTool("survivalfit");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-survivalfit"
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
          / {t?.name ?? "SurvivalFit"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          estimate <span className="inlay-gold">survival.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Enter event times and a 1/0 event indicator (1 = event, 0 = censored).
          SurvivalFit computes the exact Kaplan-Meier product-limit estimator with
          Greenwood standard errors and the median survival time, handling
          right-censoring correctly. Add a group label per subject and, for two
          groups, it runs the Mantel-Cox log-rank test (χ² on 1 df) to ask whether
          the survival curves differ. The workhorse of clinical trials,
          epidemiology, and event-history analysis — real, reproducible, no GPU.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <SurvivalFitClient />
        </div>
      </div>
    </main>
  );
}
