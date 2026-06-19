import Link from "next/link";

// Research-tools directory. Sixteen tools served through bucket.foundation
// (FastAPI gateway on Hetzner → /api/research/<tool> proxy → this UI). See
// docs/research-tools/04-implementation-architecture.md.
//
// The 7 original biophysics tools (5 CPU inline + 2 GPU demo) + 4 RAG/agent
// tools (live OpenAlex + grant corpus) + the DNA/RNA cluster (RNAStructure,
// gRNA-Optimizer, RNA-FM-Embeds; ViennaRNA + numpy) + the neuroscience cluster
// (HH-FitML, SpikeFeatures; scipy fits + spike detection). All are wired UI →
// proxy → gateway. CPU/RAG/DNA/NEURO tools run inline; the two GPU/long tools
// (trajmine, cryotriage) run in demo/synthetic mode until a GPU compute plan
// lands (the async contract is built so flipping on a GPU worker is a deploy,
// not a redesign).

type Tool = {
  slug: string;
  name: string;
  blurb: string;
  // CPU = inline biophysics tool; GPU = synthetic until compute lands;
  // RAG = live data/agent tool (OpenAlex + grant corpus, real logic);
  // DNA = DNA/RNA cluster (ViennaRNA + numpy, real algorithms);
  // NEURO = neuroscience cluster (scipy fits + spike detection, real logic).
  klass: "CPU" | "GPU" | "RAG" | "DNA" | "NEURO";
  // "live" = inline CPU/RAG/DNA/NEURO tool; "demo" = GPU/long tool (synthetic).
  status: "live" | "demo";
};

const TOOLS: Tool[] = [
  {
    slug: "labbrain",
    name: "LabBrain",
    blurb:
      "Grounded literature assistant over a research PI's corpus. Resolves the lab on OpenAlex, ingests open-access full text, hybrid dense+BM25 retrieval, answers with citations.",
    klass: "CPU",
    status: "live",
  },
  {
    slug: "stabilitydesigner",
    name: "StabilityDesigner",
    blurb: "Predict ΔΔG of point mutations; deep-mutational scan a position.",
    klass: "CPU",
    status: "live",
  },
  {
    slug: "proteinscout",
    name: "ProteinScout",
    blurb: "ML structural / disorder / feature analysis from a sequence or UniProt accession.",
    klass: "CPU",
    status: "live",
  },
  {
    slug: "screenserver",
    name: "ScreenServer",
    blurb: "13 ADMET models over a SMILES library; ranked drug-likeness report.",
    klass: "CPU",
    status: "live",
  },
  {
    slug: "trajmine",
    name: "TrajMine",
    blurb: "Mine molecular-dynamics trajectories for conformational structure (demo trajectory until GPU compute lands).",
    klass: "GPU",
    status: "demo",
  },
  {
    slug: "patchseqml",
    name: "PatchSeqML",
    blurb: "ML over patch-clamp electrophysiology recordings; cell-type signatures.",
    klass: "CPU",
    status: "live",
  },
  {
    slug: "cryotriage",
    name: "CryoTriage",
    blurb: "Triage cryo-EM micrographs for quality (synthetic session until GPU compute lands).",
    klass: "GPU",
    status: "demo",
  },
  // --- T1 ship-now tools: RAG / agent / data, real logic over live data ---
  {
    slug: "paperradar",
    name: "PaperRadar",
    blurb:
      "Personalized recent-paper feed. Queries the live OpenAlex index for your topics, ranks by relevance + recency + citation velocity, and explains why each matters to you.",
    klass: "RAG",
    status: "live",
  },
  {
    slug: "grantdraft",
    name: "GrantDraft",
    blurb:
      "Funder finder + specific-aims drafter, grounded in real awarded NSF grants (research-atlas corpus). Shows who funds your area and drafts aims anchored to actual awards.",
    klass: "RAG",
    status: "live",
  },
  {
    slug: "methodsmatcher",
    name: "MethodsMatcher",
    blurb:
      "Which method answers your question? Mines the recurring methods in the live OpenAlex literature and points you to the Bucket tool that runs it.",
    klass: "RAG",
    status: "live",
  },
  {
    slug: "reviewguard",
    name: "ReviewGuard",
    blurb:
      "Cross-paper consistency check. State a claim; ReviewGuard sorts the OpenAlex literature into supporting vs contradicting, quoting the deciding sentence.",
    klass: "RAG",
    status: "live",
  },
  // --- DNA/RNA cluster: real algorithms over ViennaRNA + numpy (1,105-PI cohort) ---
  {
    slug: "rnastructure",
    name: "RNAStructure",
    blurb:
      "RNA secondary-structure prediction via ViennaRNA: MFE dot-bracket structure, free energy, partition-function base-pair probabilities, and a readable helix/loop summary. Fully real thermodynamics.",
    klass: "DNA",
    status: "live",
  },
  {
    slug: "grnaoptimizer",
    name: "gRNA-Optimizer",
    blurb:
      "CRISPR SpCas9 guide design: PAM scan on both strands, transparent on-target efficiency scoring, and a local seed-region off-target risk flag. Ranked, defensible guide table.",
    klass: "DNA",
    status: "live",
  },
  {
    slug: "rnafmembeds",
    name: "RNA-FM-Embeds",
    blurb:
      "RNA → ML embedding. Real RNA-FM language-model representation when its weights are installed; otherwise an honest, reproducible k-mer + structural-feature embedding (mode reported).",
    klass: "DNA",
    status: "live",
  },
  // --- Neuroscience cluster: real scipy fits + spike detection (938-PI cohort) ---
  {
    slug: "hhfit",
    name: "HH-FitML",
    blurb:
      "Fit passive-membrane (RC) parameters — R, C, τ, V₀ — to a current-clamp trace via scipy least-squares, with fit quality (R²/RMSE). A demo trace with known params verifies recovery.",
    klass: "NEURO",
    status: "live",
  },
  {
    slug: "spikefeatures",
    name: "SpikeFeatures",
    blurb:
      "Detect spikes in a voltage trace (MAD-robust threshold + refractory + alignment) and extract real waveform features — amplitude, width, half-width, firing rate, ISI stats. Demo train has a known spike count.",
    klass: "NEURO",
    status: "live",
  },
];

export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · tools
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          run real{" "}
          <span className="inlay-gold">instruments.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Sixteen tools, each running real logic on your input — protein
          stability, ADMET screening, trajectory mining, ephys, and cryo-EM
          triage; four literature/agent tools over the live OpenAlex index and a
          real awarded-grant corpus (PaperRadar, GrantDraft, MethodsMatcher,
          ReviewGuard); a DNA/RNA cluster (RNAStructure folding via ViennaRNA,
          gRNA-Optimizer, RNA-FM-Embeds); and a neuroscience cluster (HH-FitML
          membrane fits, SpikeFeatures detection). Run one, read the result, and
          publish it to canon as a citeable, paid-once artifact.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
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
