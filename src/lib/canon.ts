/**
 * Canon branch metadata. Source of truth for /canon, /canon/<slug>, footer,
 * and landing grid.
 *
 * **Figures are loaded at module-init time from `canon-figures/figures.json`**
 *, the canonical 99-figure index across 10 branches. Don't hand-edit the
 * `figures: []` arrays in BRANCHES below; edit `canon-figures/figures.json`
 * and the changes flow through on the next build. The hand-coded entries
 * below are leftover seeds that the loader overwrites.
 *
 * Artifact counts in `sources:` reflect the initial canon seed
 * (2026-04-23). The numbers were generated when there was a separate
 * `bucket-research` repo; that repo has since been retired and all canon
 * content was consolidated into `bucket-canon/` and `canon-figures/` in
 * *this* repo (2026-05-15).
 */

import canonFiguresJson from "../../canon-figures/figures.json";

export type FigureSummary = {
  slug: string;
  name: string;
  note: string;       // "lifespan · region · tradition" or similar
  works: number;      // OpenAlex authored-works count (0 until wired)
  lifespan?: string;
  era?: string;
  region?: string;
  tradition?: string;
  cross_branches?: string[];
  primary_works?: { title: string; year?: string; language?: string }[];
  tags?: string[];
};

export type Branch = {
  num: string;
  slug: string;
  name: string;
  note: string;
  thesis: string;
  sources: { label: string; count: number; note?: string }[];
  figures: FigureSummary[];
};

// ----------------------------------------------------------------- figures
// figures.json branches use the directory naming `01-mathematics`,
// `08-tradition`, `10-earth`. Our BRANCHES use slug `mathematics`,
// `deep-history`, etc. Map dir → slug:
const DIR_TO_SLUG: Record<string, string> = {
  "01-mathematics": "mathematics",
  "02-physics":     "physics",
  "03-chemistry":   "chemistry",
  "04-information": "information",
  "05-biophysics":  "biophysics",
  "06-cosmology":   "cosmology",
  "07-mind":        "mind",
  "08-tradition":   "deep-history",
  "09-art":         "art",
  "10-earth":       "earth",
  // "09b sacred-texts" has no figures in figures.json yet
};

type RawFigure = {
  id: string;
  name: string;
  lifespan?: string;
  era?: string;
  region?: string;
  tradition?: string;
  branches: string[];
  cross_branches?: string[];
  primary_works?: { title: string; year?: string; language?: string }[];
  tags?: string[];
  added_in_pass?: number;
};

function figuresFromJson(): Map<string, FigureSummary[]> {
  const data = canonFiguresJson as unknown as { figures: RawFigure[] };
  const out = new Map<string, FigureSummary[]>();
  for (const fig of data.figures) {
    // a figure belongs to its primary branch (first in `branches`) for routing
    const primaryDir = fig.branches[0];
    const slug = DIR_TO_SLUG[primaryDir];
    if (!slug) continue;
    if (!out.has(slug)) out.set(slug, []);
    const lifespan = fig.lifespan ? fig.lifespan : "";
    const region = fig.region || "";
    const tradition = fig.tradition || "";
    const note = [lifespan, region, tradition].filter(Boolean).join(" · ");
    out.get(slug)!.push({
      slug: fig.id,
      name: fig.name,
      note,
      works: 0,
      lifespan: fig.lifespan,
      era: fig.era,
      region: fig.region,
      tradition: fig.tradition,
      cross_branches: fig.cross_branches,
      primary_works: fig.primary_works,
      tags: fig.tags,
    });
  }
  return out;
}

const FIGURES_BY_SLUG = figuresFromJson();

export const BRANCHES: Branch[] = [
  {
    num: "01", slug: "mathematics", name: "mathematics", note: "axioms, real math",
    thesis: "Axioms, definitions, proofs. Canon holds only the primary derivations — the places a real proof was first written down — not commentary on them.",
    sources: [
      { label: "OpenAlex landmark works", count: 25 },
      { label: "arXiv recent (math.AG / NT / GT)", count: 30 },
    ],
    figures: [],
  },
  {
    num: "02", slug: "physics", name: "physics", note: "laws, first principles",
    thesis: "Laws, first principles, primary derivations. Einstein, Maxwell, Noether, Dirac — the places a law was first stated, not restated.",
    sources: [
      { label: "OpenAlex landmark works", count: 25 },
      { label: "arXiv recent (hep-th / gr-qc / quant-ph)", count: 30 },
    ],
    figures: [
      { slug: "einstein", name: "Albert Einstein", note: "1879–1955 · relativity, photoelectric, Bose-Einstein", works: 1372 },
    ],
  },
  {
    num: "03", slug: "chemistry", name: "chemistry", note: "periodic · quantum · thermo",
    thesis: "The periodic system, quantum chemistry, thermodynamics of transformation. Primary sources on the real rules of matter.",
    sources: [
      { label: "OpenAlex landmark works", count: 25 },
      { label: "PubChem compound dossiers", count: 20, note: "dopamine, serotonin, melatonin, psilocybin, DMT, caffeine, resveratrol, NAD, ATP, DHA, EPA, …" },
    ],
    figures: [],
  },
  {
    num: "04", slug: "information", name: "information", note: "computation · information",
    thesis: "Turing, Shannon, Gödel, Kolmogorov. The foundations of what can be computed, what can be known, and what information is.",
    sources: [
      { label: "OpenAlex landmark works", count: 25 },
      { label: "arXiv recent (cs.LG / AI / IT)", count: 30 },
    ],
    figures: [],
  },
  {
    num: "05", slug: "biophysics", name: "biophysics", note: "light · water · mitochondria",
    thesis: "The physics of the living cell — light, water, electrons, mitochondria, quantum biology. Kruse is one partial source, not the centre.",
    sources: [
      { label: "OpenAlex landmark works", count: 25 },
      { label: "PubMed reviews (quantum biology)", count: 17 },
      { label: "Jack Kruse corpus", count: 460, note: "citation-only, one partial source" },
    ],
    figures: [],
  },
  {
    num: "06", slug: "cosmology", name: "cosmology", note: "spacetime · structure",
    thesis: "Spacetime, large-scale structure, the evolution of the universe as a whole — from the first primary derivations forward.",
    sources: [
      { label: "OpenAlex landmark works", count: 25 },
      { label: "arXiv recent (astro-ph.CO / GA)", count: 30 },
    ],
    figures: [],
  },
  {
    num: "07", slug: "mind", name: "mind", note: "cognition · consciousness",
    thesis: "Neural correlates, cognition, consciousness. What a mind is, and how it arises — foundations, not outcomes.",
    sources: [
      { label: "OpenAlex landmark works", count: 25 },
      { label: "PubMed reviews (consciousness / NCC)", count: 25 },
    ],
    figures: [],
  },
  {
    num: "08", slug: "deep-history", name: "deep history", note: "civilizations · archaeology · catastrophe",
    thesis: "The deep past as primary record — geological strata, dated artifacts, monuments, the Younger Dryas boundary, the Neolithic revolution. Where text and stone disagree, the stone wins until proven otherwise.",
    sources: [
      { label: "Pleiades ancient places", count: 38000, note: "ancient settlements gazetteer" },
      { label: "Met CC0 ancient artifacts", count: 600 },
      { label: "Open Context archaeology", count: 0, note: "queued" },
    ],
    figures: [],
  },
  {
    num: "09", slug: "art", name: "art", note: "form · composition · craft",
    thesis: "The discipline of form. Composition, proportion, craft, the canonical works that define how images and sounds organize meaning.",
    sources: [
      { label: "Met CC0 collection", count: 600 },
      { label: "Wikidata art entities", count: 0, note: "queued" },
    ],
    figures: [],
  },
  {
    num: "09b", slug: "sacred-texts", name: "sacred texts", note: "scripture · revelation · liturgy",
    thesis: "World scripture as primary source. Vedas, Upanishads, Bible, Quran, Tao Te Ching, Gnostic codices, Hermetic corpus. Citation-only — full texts at their canonical sources.",
    sources: [
      { label: "Sacred-Texts.com mirror", count: 1000 },
      { label: "Nag Hammadi · Dead Sea Scrolls", count: 0, note: "queued" },
      { label: "Project Gutenberg dictionaries", count: 0, note: "queued" },
    ],
    figures: [],
  },
  {
    num: "10", slug: "earth", name: "earth", note: "planet · climate · life",
    thesis: "The planet as primary record — geology, climate, biogeochemistry, the living biosphere. Strata, ice cores, magnetic reversals, mass extinctions, the rules of how this rock organises matter and life.",
    sources: [
      { label: "USGS earthquakes (1900–)", count: 0, note: "queued" },
      { label: "GBIF species occurrences", count: 0, note: "queued" },
      { label: "NOAA climate", count: 0, note: "queued" },
    ],
    figures: [],
  },
];

// Overwrite the hand-coded `figures: []` arrays with the canonical
// 99-figure list loaded from `canon-figures/figures.json`. The previous
// Einstein-only seed is preserved by figures.json (it has an `einstein`
// figure with name "Albert Einstein"), so nothing is lost.
for (const b of BRANCHES) {
  const loaded = FIGURES_BY_SLUG.get(b.slug);
  if (loaded && loaded.length > 0) b.figures = loaded;
}

export function getBranch(slug: string): Branch | undefined {
  return BRANCHES.find((b) => b.slug === slug);
}

export function getFigure(branchSlug: string, figureSlug: string) {
  const b = getBranch(branchSlug);
  return b?.figures.find((f) => f.slug === figureSlug);
}

// Canonical repo tree URL, every link that says "open on GitHub" or
// "edit on GitHub" from /canon/* points here. Was previously the stale
// `bucket-research` repo (deleted 2026-05-15); everything that mattered
// already lives in this repo under `bucket-canon/` and `canon-figures/`.
export const REPO_TREE = "https://github.com/bucket-foundation/bucket-foundation/tree/main/bucket-canon";

// Where the canonical figure metadata + bios live in *this* repo.
export const FIGURES_TREE = "https://github.com/bucket-foundation/bucket-foundation/tree/main/canon-figures";
export const DRIVE_URL = "https://drive.google.com/open?id=12QjkHYFqzVNm30kvkW-upi0kqa_Kri2B";
