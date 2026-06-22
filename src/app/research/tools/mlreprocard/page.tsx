import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("mlreprocard");
const _jsonld = toolJsonLd("mlreprocard");
import MLReproCardClient from "./MLReproCardClient";

// MLReproCard run page — server shell framing the interactive client island.
export default function Page() {
  const t = getTool("mlreprocard");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-mlreprocard"
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
          / {t?.name ?? "MLReproCard"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          card your{" "}
          <span className="inlay-gold">ML experiment.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Describe an ML experiment — dataset, version, splits, seed, hyperparameters, training, framework, compute, evaluation, and what you released. MLReproCard scores a real weighted reproducibility rubric (grounded in the NeurIPS/ICML reproducibility checklists, Mitchell et al. 2019 Model Cards, and Gundersen's reproducibility taxonomy) across data, code, training, evaluation, compute, and sharing — flags exactly which repro elements are missing, assigns an R0–R3 level and an overall 0–100 score, and fills in a normalized model card. Deterministic; no LLM, no network.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <MLReproCardClient />
        </div>
      </div>
    </main>
  );
}
