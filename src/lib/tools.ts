/**
 * bucket.foundation — research-tools registry
 * -------------------------------------------
 * Single source of truth for the 28 research tools served through
 * bucket.foundation (FastAPI gateway on Hetzner → /api/research/<tool> proxy →
 * the per-tool UI). This was previously inlined in
 * src/app/research/tools/page.tsx; it now lives here so the same data drives:
 *   - the /research/tools directory page
 *   - per-tool <generateMetadata> (title + description + canonical + OG)
 *   - per-tool SoftwareApplication / WebApplication JSON-LD
 *   - the sitemap (one URL per tool)
 *
 * See docs/research-tools/04-implementation-architecture.md.
 */

import type { ToolHosting } from "@/lib/support";

export type ToolClass = "CPU" | "GPU" | "RAG" | "DNA" | "NEURO" | "GAP" | "IMG";
export type ToolStatus = "live" | "demo";

export type Tool = {
  slug: string;
  name: string;
  blurb: string;
  // CPU = inline biophysics tool; GPU = synthetic until compute lands;
  // RAG = live data/agent tool (OpenAlex + grant corpus, real logic);
  // DNA = DNA/RNA cluster (ViennaRNA + numpy, real algorithms);
  // NEURO = neuroscience cluster (scipy fits + spike detection, real logic);
  // GAP = gap-research cluster (rule extraction / curated KB / OpenAlex graph);
  // IMG = imaging/mechanobiology cluster (scipy + scikit-image signal/image
  //       processing: calcium ΔF/F, cell segmentation, AFM modulus, PIV).
  klass: ToolClass;
  // "live" = inline CPU/RAG/DNA/NEURO/GAP tool; "demo" = GPU/long tool (synthetic).
  status: ToolStatus;
  // "always-on" = runs on the Hetzner CPU gateway, up 24/7.
  // "founder-gpu" = runs on the founder's personal laptop GPU over a tunnel —
  // unreachable when the laptop is closed.
  hosting: ToolHosting;
};

export const TOOLS: Tool[] = [
  {
    slug: "labbrain",
    name: "LabBrain",
    blurb:
      "Grounded literature assistant over a research PI's corpus. Resolves the lab on OpenAlex, ingests open-access full text, hybrid dense+BM25 retrieval, answers with citations.",
    klass: "CPU",
    status: "live",
    hosting: "founder-gpu",
  },
  {
    slug: "stabilitydesigner",
    name: "StabilityDesigner",
    blurb: "Predict ΔΔG of point mutations; deep-mutational scan a position.",
    klass: "CPU",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "proteinscout",
    name: "ProteinScout",
    blurb: "ML structural / disorder / feature analysis from a sequence or UniProt accession.",
    klass: "CPU",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "screenserver",
    name: "ScreenServer",
    blurb: "13 ADMET models over a SMILES library; ranked drug-likeness report.",
    klass: "CPU",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "trajmine",
    name: "TrajMine",
    blurb: "Mine molecular-dynamics trajectories for conformational structure (demo trajectory until GPU compute lands).",
    klass: "GPU",
    status: "demo",
    hosting: "founder-gpu",
  },
  {
    slug: "patchseqml",
    name: "PatchSeqML",
    blurb: "ML over patch-clamp electrophysiology recordings; cell-type signatures.",
    klass: "CPU",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "cryotriage",
    name: "CryoTriage",
    blurb: "Triage cryo-EM micrographs for quality (synthetic session until GPU compute lands).",
    klass: "GPU",
    status: "demo",
    hosting: "founder-gpu",
  },
  // --- T1 ship-now tools: RAG / agent / data, real logic over live data ---
  {
    slug: "paperradar",
    name: "PaperRadar",
    blurb:
      "Personalized recent-paper feed. Queries the live OpenAlex index for your topics, ranks by relevance + recency + citation velocity, and explains why each matters to you.",
    klass: "RAG",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "grantdraft",
    name: "GrantDraft",
    blurb:
      "Funder finder + specific-aims drafter, grounded in real awarded NSF grants (research-atlas corpus). Shows who funds your area and drafts aims anchored to actual awards.",
    klass: "RAG",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "methodsmatcher",
    name: "MethodsMatcher",
    blurb:
      "Which method answers your question? Mines the recurring methods in the live OpenAlex literature and points you to the Bucket tool that runs it.",
    klass: "RAG",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "reviewguard",
    name: "ReviewGuard",
    blurb:
      "Cross-paper consistency check. State a claim; ReviewGuard sorts the OpenAlex literature into supporting vs contradicting, quoting the deciding sentence.",
    klass: "RAG",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "quantumbiorag",
    name: "QuantumBioRAG",
    blurb:
      "Evidence, not hype. State a quantum-biology claim; QuantumBioRAG scores how strongly the live OpenAlex literature supports it — weighting each paper by overlap, citations, and recency — with a consensus score and the deciding sentences.",
    klass: "RAG",
    status: "live",
    hosting: "always-on",
  },
  // --- DNA/RNA cluster: real algorithms over ViennaRNA + numpy (1,105-PI cohort) ---
  {
    slug: "rnastructure",
    name: "RNAStructure",
    blurb:
      "RNA secondary-structure prediction via ViennaRNA: MFE dot-bracket structure, free energy, partition-function base-pair probabilities, and a readable helix/loop summary. Fully real thermodynamics.",
    klass: "DNA",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "grnaoptimizer",
    name: "gRNA-Optimizer",
    blurb:
      "CRISPR SpCas9 guide design: PAM scan on both strands, transparent on-target efficiency scoring, and a local seed-region off-target risk flag. Ranked, defensible guide table.",
    klass: "DNA",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "rnafmembeds",
    name: "RNA-FM-Embeds",
    blurb:
      "RNA → ML embedding. Real RNA-FM language-model representation when its weights are installed; otherwise an honest, reproducible k-mer + structural-feature embedding (mode reported).",
    klass: "DNA",
    status: "live",
    hosting: "always-on",
  },
  // --- Neuroscience cluster: real scipy fits + spike detection (938-PI cohort) ---
  {
    slug: "hhfit",
    name: "HH-FitML",
    blurb:
      "Fit passive-membrane (RC) parameters — R, C, τ, V₀ — to a current-clamp trace via scipy least-squares, with fit quality (R²/RMSE). A demo trace with known params verifies recovery.",
    klass: "NEURO",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "spikefeatures",
    name: "SpikeFeatures",
    blurb:
      "Detect spikes in a voltage trace (MAD-robust threshold + refractory + alignment) and extract real waveform features — amplitude, width, half-width, firing rate, ISI stats. Demo train has a known spike count.",
    klass: "NEURO",
    status: "live",
    hosting: "always-on",
  },
  // --- gap-research cluster: rule extraction / curated KB / OpenAlex graph ---
  {
    slug: "protocolgpt",
    name: "ProtocolGPT",
    blurb:
      "Methods prose → a structured, runnable protocol. Deterministic rule extraction over a methods knowledge base: ordered steps with timings/temps/volumes, a reagent table, and safety flags. No network, no GPU.",
    klass: "GAP",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "toxinchannelfinder",
    name: "ToxinChannelFinder",
    blurb:
      "Map a toxin/peptide (name or sequence) to its likely ion-channel targets. Fuses a curated venom-peptide pharmacology KB with live OpenAlex co-occurrence; sequences classified by cysteine framework. Ranked targets, honest confidence, cited exemplars.",
    klass: "GAP",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "citationgraph",
    name: "CitationGraph",
    blurb:
      "Build a paper's local citation neighborhood from the live OpenAlex graph (DOI / OpenAlex ID / title). Surfaces the key related works and ranks them by degree centrality — the most-connected neighbors first.",
    klass: "GAP",
    status: "live",
    hosting: "always-on",
  },
  // --- imaging / mechanobiology cluster: real scipy + scikit-image (311M-funding cohort) ---
  {
    slug: "calciumtraceml",
    name: "CalciumTraceML",
    blurb:
      "Calcium-imaging ΔF/F + event detection. Real rolling-percentile F0 baseline, ΔF/F, MAD-robust transient detection with single-exponential decay-τ fits, and firing-rate stats. Demo trace has a known event count.",
    klass: "IMG",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "cellsegtrack",
    name: "CellSegTrack",
    blurb:
      "Cell / nuclei segmentation. Cellpose on CPU when installed; otherwise a real classical pipeline — Otsu threshold + distance-transform seeded watershed — with per-object area, centroid, and bounding box. Demo image has a known cell count.",
    klass: "IMG",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "afmcurveml",
    name: "AFM-CurveML",
    blurb:
      "AFM force-curve analysis. Real contact-point detection + Hertz (sphere) / Sneddon (cone) least-squares fit for Young's modulus in SI units, plus adhesion from the retract minimum. Demo curve has a known modulus.",
    klass: "IMG",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "tractionforceml",
    name: "TractionForceML",
    blurb:
      "Traction-force / PIV displacement field. Real block-matching (normalized cross-correlation) between a relaxed and a deformed bead image → per-window vectors + a strain-energy proxy. Classical, honestly labelled. Demo recovers a known shift.",
    klass: "IMG",
    status: "live",
    hosting: "always-on",
  },
  // --- FigureMiner: real text-layer caption + statistics mining (no GPU) ---
  {
    slug: "figureminer",
    name: "FigureMiner",
    blurb:
      "Mine a paper's figures + stats. Real text-layer extraction of figure/table captions, reported statistics (p-values, n=, CIs, R²/r, mean±SD, fold-change), and unit-bearing measurements, linked per-figure. PDF or pasted text; pixel-level plot digitization is a documented GPU/vision extension.",
    klass: "GAP",
    status: "live",
    hosting: "always-on",
  },
  // --- genomics / sequence cluster: real interpretable algorithms (no GPU) ---
  {
    slug: "chromatinaccess",
    name: "ChromatinAccess",
    blurb:
      "DNA accessibility / regulatory-potential from sequence. Real interpretable feature model — GC content, Gardiner-Garden CpG islands, core-promoter motif scan (TATA / GC-box / CAAT / Initiator) — into a 0–1 accessibility score. A deep DNA-LM (Enformer/Evo) is the documented GPU path.",
    klass: "DNA",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "aggregatepredict",
    name: "AggregatePredict",
    blurb:
      "Amyloid / aggregation propensity from a protein sequence. Real windowed model — Chou-Fasman β-sheet propensity + Kyte-Doolittle hydrophobicity − net charge — flagging contiguous aggregation hot-spots. Interpretable and deterministic.",
    klass: "GAP",
    status: "live",
    hosting: "always-on",
  },
  {
    slug: "channeldwell",
    name: "ChannelDwell",
    blurb:
      "Single-channel idealization. Real half-amplitude threshold idealization of a single-channel current record into open/closed states, with open probability, dwell-time histograms, and ML single-exponential dwell constants. Demo recovers a known open probability.",
    klass: "GAP",
    status: "live",
    hosting: "always-on",
  },
];

export function listTools(): Tool[] {
  return TOOLS;
}

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

const SITE = "https://www.bucket.foundation";

/**
 * Per-tool metadata for a tool page. Drop into a tool page as:
 *   export const metadata = toolMetadata("labbrain");
 * Returns a unique title + description + canonical + OpenGraph/Twitter block.
 */
export function toolMetadata(slug: string) {
  const t = getTool(slug);
  if (!t) {
    return { title: "Research tool · bucket.foundation" };
  }
  const url = `${SITE}/research/tools/${t.slug}`;
  const title = `${t.name} · research tool`;
  // Trim the blurb to a clean meta-description length.
  const description =
    t.blurb.length > 200 ? `${t.blurb.slice(0, 197)}…` : t.blurb;
  return {
    title,
    description,
    alternates: { canonical: `/research/tools/${t.slug}` },
    openGraph: {
      type: "website" as const,
      url,
      title: `${t.name} · bucket.foundation research tool`,
      description,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${t.name} · bucket.foundation research tool`,
      description,
    },
  };
}

/**
 * SoftwareApplication / WebApplication JSON-LD for a tool page.
 * Free to use; runs in the browser against the Bucket research gateway.
 */
export function toolJsonLd(slug: string): Record<string, unknown> | null {
  const t = getTool(slug);
  if (!t) return null;
  const url = `${SITE}/research/tools/${t.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "WebApplication"],
    "@id": `${url}#app`,
    name: t.name,
    url,
    applicationCategory: "ScienceApplication",
    operatingSystem: "Web",
    description: t.blurb,
    isAccessibleForFree: true,
    browserRequirements: "Requires JavaScript. Runs in any modern browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to run. The reader pays nothing.",
    },
    provider: {
      "@type": ["NGO", "Organization"],
      name: "bucket.foundation",
      url: SITE,
    },
    softwareHelp: { "@type": "CreativeWork", url: `${SITE}/support` },
  };
}
