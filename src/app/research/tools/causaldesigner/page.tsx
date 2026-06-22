import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("causaldesigner");
const _jsonld = toolJsonLd("causaldesigner");
import CausalDesignerClient from "./CausalDesignerClient";

// CausalDesigner run page — server shell framing the interactive client island.
export default function Page() {
  const t = getTool("causaldesigner");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-causaldesigner"
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
          / {t?.name ?? "CausalDesigner"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          design a{" "}
          <span className="inlay-gold">causal study.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Describe a study — treatment, outcome, confounders, and the assumed causal graph. CausalDesigner builds the DAG, enumerates the backdoor paths, and finds a valid minimal adjustment set with real do-calculus (Pearl's back-door criterion via networkx d-separation — it never conditions on a collider or a mediator), then recommends an estimator (difference-in-differences, regression discontinuity, instrumental variables, matching, or covariate-adjusted regression) with its identifying assumptions and the concrete threats to validity. A field tool for the social/economic sciences, where causal-inference best practice is most under-tooled.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <CausalDesignerClient />
        </div>
      </div>
    </main>
  );
}
