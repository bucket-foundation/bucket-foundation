import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("powerplan");
const _jsonld = toolJsonLd("powerplan");
import PowerPlanClient from "./PowerPlanClient";

// PowerPlan run page — server shell framing the interactive client island.
export default function Page() {
  const t = getTool("powerplan");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-powerplan"
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
          / {t?.name ?? "PowerPlan"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          plan your{" "}
          <span className="inlay-gold">sample size.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Pick a test (two-sample / one-sample t-test, one-way ANOVA, two proportions, or Pearson correlation), give any three of effect size, alpha, power, and n, and PowerPlan solves for the fourth with real closed-form scipy power (noncentral t / F, the normal approximation for proportions, the Fisher-z transform for correlation — the same equations as G*Power). A priori power analysis is funder- and IRB-expected, and underpowered designs drive the reproducibility crisis.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <PowerPlanClient />
        </div>
      </div>
    </main>
  );
}
