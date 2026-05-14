/**
 * Canon branch metadata. Source of truth for /canon, /canon/<slug>, footer,
 * and landing grid.
 *
 * Artifact counts reflect the initial seed in
 * github.com/bucket-foundation/bucket-research (2026-04-23):
 *   - OpenAlex landmark works (25 per branch)
 *   - arXiv recent papers (30 per, where relevant)
 *   - PubMed (biophysics, mind)
 *   - PubChem compounds, GBIF species, USGS earthquakes (earth/chem)
 *   - Kruse corpus — 460 posts in 05-biophysics
 *   - Einstein figure — 1,372 works + 11-lang bios in 02-physics
 */

export type Branch = {
  num: string;
  slug: string;
  name: string;
  note: string;
  thesis: string;
  sources: { label: string; count: number; note?: string }[];
  figures: { slug: string; name: string; note: string; works: number }[];
};

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
];

export function getBranch(slug: string): Branch | undefined {
  return BRANCHES.find((b) => b.slug === slug);
}

export function getFigure(branchSlug: string, figureSlug: string) {
  const b = getBranch(branchSlug);
  return b?.figures.find((f) => f.slug === figureSlug);
}

export const REPO_TREE = "https://github.com/bucket-foundation/bucket-research/tree/main/branches";
export const DRIVE_URL = "https://drive.google.com/open?id=12QjkHYFqzVNm30kvkW-upi0kqa_Kri2B";
