import Link from "next/link";
import type { Metadata } from "next";
import Script from "next/script";
import { TOOLS, type Tool } from "@/lib/tools";

// Research-tools directory. Forty tools served through bucket.foundation
// (FastAPI gateway on Hetzner → /api/research/<tool> proxy → this UI). See
// docs/research-tools/04-implementation-architecture.md. The TOOLS registry
// lives in src/lib/tools.ts (one source of truth, also drives per-tool
// metadata, per-tool JSON-LD, and the sitemap).

export const metadata: Metadata = {
  title: "Research tools · run real instruments",
  description:
    "Forty free research instruments on bucket.foundation: protein stability (ΔΔG), ADMET screening, RNA folding, ephys fits, imaging, plus per-field tools — causal-study design (DAG + adjustment set), materials featurization, statistical power & sample size, geospatial/time-series summary, ML reproducibility cards — and literature/agent tools over the live OpenAlex index and a real awarded-grant corpus. Run on your input, publish to canon — the reader pays nothing.",
  alternates: { canonical: "/research/tools" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research/tools",
    title: "Forty free research tools · bucket.foundation",
    description:
      "Real research instruments across fields — protein/RNA/ephys/imaging, causal design, materials featurization, power analysis, geospatial summary, ML reproducibility, and live-literature agents — free to run, citeable forever.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forty free research tools · bucket.foundation",
    description:
      "Real research instruments across fields — biophysics, econ-social causal design, materials, stats power, earth-climate, cs-ml — free to run.",
  },
};

// ItemList JSON-LD: the catalog of SoftwareApplication tools, so search engines
// and agents can enumerate the directory.
const TOOLS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": "https://www.bucket.foundation/research/tools#list",
  name: "bucket.foundation research tools",
  description:
    "Free research instruments served through bucket.foundation.",
  numberOfItems: TOOLS.length,
  itemListElement: TOOLS.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `https://www.bucket.foundation/research/tools/${t.slug}`,
    name: t.name,
  })),
};


export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <Script
        id="ld-tools"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TOOLS_JSON_LD) }}
      />
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · tools
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          run real{" "}
          <span className="inlay-gold">instruments.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Forty tools, each running real logic on your input — protein
          stability, ADMET screening, trajectory mining, ephys, and cryo-EM
          triage; five literature/agent tools over the live OpenAlex index and a
          real awarded-grant corpus (PaperRadar, GrantDraft, MethodsMatcher,
          ReviewGuard, QuantumBioRAG); a DNA/RNA cluster (RNAStructure folding via
          ViennaRNA, gRNA-Optimizer, RNA-FM-Embeds, ChromatinAccess); a
          neuroscience cluster (HH-FitML membrane fits, SpikeFeatures detection,
          ChannelDwell idealization); an imaging / mechanobiology cluster
          (CalciumTraceML ΔF/F, CellSegTrack segmentation, AFM-CurveML modulus,
          TractionForceML PIV); a gap-research cluster (ProtocolGPT,
          ToxinChannelFinder, CitationGraph, FigureMiner, AggregatePredict);
          all-field metascience tools (FAIRCheck, RepliCheck); a per-field
          set for the biggest non-bio fields — CausalDesigner (econ/social
          do-calculus), MaterialsFeaturizer (Magpie descriptors), PowerPlan
          (power &amp; sample size), GeoSummary (earth-climate trend/seasonality),
          and MLReproCard (cs-ml reproducibility); and a classical-algorithm set
          — SeqAlign (Needleman-Wunsch / Smith-Waterman), StoichBalance (equation
          balancing), UnitDimCheck (SI dimensional analysis), SurvivalFit
          (Kaplan-Meier + log-rank), and TimeSeriesForecast (Holt-Winters). Run
          one, read the result, and publish it to canon as a citeable, paid-once
          artifact.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        {/* Hosting legend: distinguish always-on (Hetzner CPU, up 24/7) from
 founder-GPU tools (local LLM / GPU jobs on the founder's laptop,
 offline when it's closed). */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.13em] text-[color:var(--basalt-3)]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--laurel-deep,var(--aegean-deep))]" />
            always-on · Hetzner CPU, 24/7
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--gold-deep,var(--basalt-3))]" />
            founder GPU · offline when the laptop is closed
          </span>
          <Link
            href="/support"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            fund always-on hosting →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
          {TOOLS.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      </div>
    </main>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const inner = (
    <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[200px] h-full shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="flex items-center justify-between">
        <div className="font-display uppercase text-[20px] tracking-[0.04em] text-[color:var(--basalt)]">
          {tool.name}
        </div>
        <span className="text-[10px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          {tool.klass}
          {tool.status === "live" ? " · live" : " · demo"}
        </span>
      </div>
      <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
      <div>
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] small-caps tracking-[0.12em] border px-2 py-0.5 ${
            tool.hosting === "founder-gpu"
              ? "border-[color:var(--gold-deep,var(--basalt-3))] text-[color:var(--gold-deep,var(--basalt-3))]"
              : "border-[color:var(--hairline)] text-[color:var(--basalt-3)]"
          }`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              tool.hosting === "founder-gpu"
                ? "bg-[color:var(--gold-deep,var(--basalt-3))]"
                : "bg-[color:var(--laurel-deep,var(--aegean-deep))]"
            }`}
          />
          {tool.hosting === "founder-gpu" ? "founder GPU" : "always-on"}
        </span>
      </div>
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
        {tool.blurb}
      </p>
      <div className="mt-auto pt-3 text-[11px] small-caps tracking-[0.14em]">
        <span className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
          {tool.status === "demo" ? "open tool · demo →" : "open tool →"}
        </span>
      </div>
    </div>
  );

  // Every tool is wired and openable; demo tools just label themselves as such.
  return (
    <Link href={`/research/tools/${tool.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
