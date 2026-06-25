/**
 * bucket.foundation — education-atlas corpus
 * ------------------------------------------
 * The education-atlas is Bucket Foundation's founding research for its
 * education-reform mission (see /mission and REFORM_THESIS). It is the newest
 * and largest body of Bucket research and is surfaced here as a browsable,
 * on-site corpus of working papers.
 *
 * Source repo: ~/agfarms/education-atlas (github.com/bucket-foundation/education-atlas).
 * The flagship "The Knowledge-Access Gradient" PDF + the 16 landscape figures are
 * vendored into public/education/; the 19 markdown docs are vendored into
 * src/content/education/ and rendered on-site with the shared long-form renderer.
 *
 * NOTE ON DOI: education-atlas has NO minted Zenodo DOI yet (.zenodo.json is
 * staged but unminted). We therefore mark its DOI as "pending" and never
 * fabricate one — the only real DOIs on the site are the four research-atlas
 * Zenodo records.
 */
import fs from "fs";
import path from "path";

export const EDUCATION_GITHUB =
  "https://github.com/bucket-foundation/education-atlas";

/** The flagship synthesis, presented as a first-class paper-like page. */
export const FLAGSHIP = {
  slug: "knowledge-access-gradient",
  /** the vendored markdown, relative to src/content/education/ */
  doc: "THE-KNOWLEDGE-ACCESS-GRADIENT.md",
  title: "The Knowledge-Access Gradient",
  subtitle:
    "Who can reach how deep into human knowledge, at what age, at what cost — and what that means for reforming education",
  authors: "Gianangelo Dichio · Bucket Foundation",
  affiliation: "Bucket Foundation",
  date: "2026-06-25",
  version: "v1.1",
  venue: "working paper",
  doi: "pending" as const, // education-atlas has no minted Zenodo DOI yet
  pdfUrl: "/education/THE-KNOWLEDGE-ACCESS-GRADIENT.pdf",
  githubUrl:
    "https://github.com/bucket-foundation/education-atlas/blob/main/docs/THE-KNOWLEDGE-ACCESS-GRADIENT.md",
  license: "CC-BY-4.0 (data) / MIT (code)",
  corpusLine:
    "education-atlas v1.1 — 78,326 observations / 219 countries / 30 indicators, vs UN SDG 4",
  abstract: [
    "For five thousand years, every knowledge technology widened access to consume knowledge — to read, learn, and reach what others already discovered — and none widened access to produce it. That arc is the organizing finding of this document, and the present-day access cliff is its cross-section.",
    "Measured against UN Sustainable Development Goal 4, today's record shows three stacked crises: a learning crisis (48.3% of 10-year-olds worldwide cannot read a simple text; 86.5% in Sub-Saharan Africa), an access crisis that has shrunk but moved up a level (51M primary-age and 61M lower-secondary-age children out of school), and a financing crisis underwriting both (world education spend is 3.6% of GDP, below the agreed 4% floor). But the deepest inequity is on the depth axis: access falls from 82.5% at basic literacy (L0) to 0.14% at the research frontier (L4) — a ~270× drop from undergraduate to the frontier. About 99.86% of humanity only ever consumes knowledge; ~0.14% ever reaches where it is produced.",
    "Seven dimensions describe the gradient's shape and converge: the historical arc (consume-access an unbroken staircase up, produce-access flat at every step), cost (bimodal — a free path to read but none to produce), field coverage (biomedicine has ~133× more researchers than mathematics), the temporal trend, the leaky pipeline, the geographic near-monopoly (top-10 countries hold 69.3% of researcher capacity, 35% of countries have no researcher datapoint, women out-enroll men into university yet hold only ~33% of research posts), and the modality axis (every scalable channel ceilings out below the frontier; the one production-reaching channel does not scale). AI is the first technology in the entire 5,000-year arc for which the consume-versus-produce verdict is not yet written.",
  ],
  highlights: [
    "A ~270× depth cliff: world access to knowledge falls from 82.5% at basic literacy (L0) to 0.14% at reading the research frontier (L4); the rich-poor gap widens from under 2× at literacy to ~75× at the frontier.",
    "~99.86% of humanity only ever consumes knowledge; only ~0.14% ever reaches where it is produced.",
    "Three stacked, SDG-4-measured crises: learning (48.3% global learning poverty), access (51M + 61M children out of school), financing (3.6% of GDP, below the 4% floor; 92 of ~200 countries beneath it).",
    "The frontier is a near-monopoly: top-10 countries hold 69.3% of estimated researcher capacity, 35% of countries (75/217) have no researcher datapoint, researcher-intensity Gini 0.646.",
    "The 5,000-year arc: every knowledge technology widened access to consume, none widened access to produce — AI is the first open question.",
  ],
  /** Figures shown on the flagship landing (subset of the 16 vendored). */
  figures: [
    {
      src: "/education/figures/fig_access_vs_age.png",
      alt: "World access by depth — the access cliff (log scale)",
      caption:
        "The access cliff: world access by depth, from basic literacy (L0) to producing new knowledge (L5), on a log scale. Access falls ~270× from undergraduate to the research frontier.",
    },
    {
      src: "/education/figures/fig_access_arc.png",
      alt: "The 5,000-year access arc",
      caption:
        "The 5,000-year access arc — every prior technology widened access to consume knowledge; produce-access stayed flat at every step; AI is the open question.",
    },
    {
      src: "/education/figures/fig_frontier_bar.png",
      alt: "Frontier participation",
      caption:
        "Frontier participation: ~0.14% of humanity reaches the place where knowledge is produced; the rest only consume.",
    },
    {
      src: "/education/figures/fig_geo_concentration.png",
      alt: "The geography of the frontier",
      caption:
        "The frontier has a geography: a near-monopoly of researcher capacity (top-10 countries hold 69.3%), with 75 countries off the map entirely.",
    },
    {
      src: "/education/figures/fig_modality_reach.png",
      alt: "Modality × depth-reach",
      caption:
        "Modality × depth-reach: the channels that scale ceiling out before production; the one channel that reaches production (apprenticeship, the lab) does not scale. That empty cell is the consume-vs-produce gap.",
    },
  ],
};

/** A corpus document rendered on-site from vendored markdown. */
export type EducationDoc = {
  slug: string; // route segment under /research/education/
  doc: string; // path relative to src/content/education/
  title: string;
  group: "flagship" | "atlas" | "thesis" | "foundations" | "deep" | "landscape";
  groupLabel: string;
  blurb: string;
  /** optional source markdown link on GitHub */
  githubUrl?: string;
};

const GH =
  "https://github.com/bucket-foundation/education-atlas/blob/main/docs";

export const EDUCATION_DOCS: EducationDoc[] = [
  {
    slug: "education-problems",
    doc: "EDUCATION_PROBLEMS.md",
    title: "The Global Education Problem Landscape",
    group: "atlas",
    groupLabel: "Quantitative atlas",
    blurb:
      "Bucket's founding problem statement, grounded in authoritative data: what the educational problems actually are, by country and level, measured against UN SDG 4. 78,326 observations across 219 countries.",
    githubUrl: `${GH}/EDUCATION_PROBLEMS.md`,
  },
  {
    slug: "reform-thesis",
    doc: "REFORM_THESIS.md",
    title: "The Reform Thesis",
    group: "thesis",
    groupLabel: "Reform thesis",
    blurb:
      "The bridge from diagnosis to mission: given the actual problems, where does Bucket's open-knowledge thesis measurably move the needle — and where does it not? Honesty about the second half makes the first half credible.",
    githubUrl: `${GH}/REFORM_THESIS.md`,
  },
  // foundations 01–04
  {
    slug: "foundations-01-what-it-means-to-be-educated",
    doc: "foundations/01-what-it-means-to-be-educated.md",
    title: "What it means to be educated",
    group: "foundations",
    groupLabel: "Foundations",
    blurb:
      "The irreducible, contested value question underneath every reform: there is no single cross-civilizational definition of an educated person.",
    githubUrl: `${GH}/foundations/01-what-it-means-to-be-educated.md`,
  },
  {
    slug: "foundations-02-goals-of-education",
    doc: "foundations/02-goals-of-education-and-their-evolution.md",
    title: "Goals of education and their evolution",
    group: "foundations",
    groupLabel: "Foundations",
    blurb:
      "How the stated aims of education have shifted — and why sorting, credentialing, and socialization are legitimate functions, not merely pathologies.",
    githubUrl: `${GH}/foundations/02-goals-of-education-and-their-evolution.md`,
  },
  {
    slug: "foundations-03-cheating-and-academic-integrity",
    doc: "foundations/03-cheating-and-academic-integrity.md",
    title: "Cheating and academic integrity",
    group: "foundations",
    groupLabel: "Foundations",
    blurb:
      "What integrity means when the goal is learning rather than sorting, and how AI reframes the question.",
    githubUrl: `${GH}/foundations/03-cheating-and-academic-integrity.md`,
  },
  {
    slug: "foundations-04-ai-and-the-future-of-education",
    doc: "foundations/04-ai-and-the-future-of-education.md",
    title: "AI and the future of education",
    group: "foundations",
    groupLabel: "Foundations",
    blurb:
      "AI as the first technology in the 5,000-year arc for which the consume-versus-produce verdict is not yet written.",
    githubUrl: `${GH}/foundations/04-ai-and-the-future-of-education.md`,
  },
  // deep 01–04
  {
    slug: "deep-01-us-education-and-innovation",
    doc: "deep/01-us-education-and-innovation.md",
    title: "US education and innovation",
    group: "deep",
    groupLabel: "Structural deep-dives",
    blurb:
      "The industrial schooling model optimized for sorting, compliance, and credentialing — not learning.",
    githubUrl: `${GH}/deep/01-us-education-and-innovation.md`,
  },
  {
    slug: "deep-02-world-tiers-and-the-industrial-model",
    doc: "deep/02-world-tiers-and-the-industrial-model.md",
    title: "World tiers and the industrial model",
    group: "deep",
    groupLabel: "Structural deep-dives",
    blurb:
      "One age-batched, bell-timed, standardized machine, exported to every tier regardless of context.",
    githubUrl: `${GH}/deep/02-world-tiers-and-the-industrial-model.md`,
  },
  {
    slug: "deep-03-what-systems-lack-learning-to-learn",
    doc: "deep/03-what-systems-lack-learning-to-learn.md",
    title: "What systems lack: learning to learn",
    group: "deep",
    groupLabel: "Structural deep-dives",
    blurb:
      "The cognitive science of how to learn is settled, yet 84% of students reread and 72% wrongly believe massing beats spacing.",
    githubUrl: `${GH}/deep/03-what-systems-lack-learning-to-learn.md`,
  },
  {
    slug: "deep-04-health-learning-and-the-ceiling",
    doc: "deep/04-health-learning-and-the-ceiling.md",
    title: "Health, learning, and the ceiling",
    group: "deep",
    groupLabel: "Structural deep-dives",
    blurb:
      "Sleep, light, movement, and nutrition are large, well-evidenced levers on cognition the factory schedule structurally violates — and the system caps the top while failing the bottom.",
    githubUrl: `${GH}/deep/04-health-learning-and-the-ceiling.md`,
  },
  // landscape 01–07
  {
    slug: "landscape-01-solution-landscape",
    doc: "landscape/01-solution-landscape.md",
    title: "The solution landscape",
    group: "landscape",
    groupLabel: "Landscape",
    blurb: "What is being tried, and what the evidence says works.",
    githubUrl: `${GH}/landscape/01-solution-landscape.md`,
  },
  {
    slug: "landscape-02-access-data-science",
    doc: "landscape/02-access-data-science.md",
    title: "Access: the data science",
    group: "landscape",
    groupLabel: "Landscape",
    blurb:
      "The access cliff, the income surface, and frontier participation, with the figures behind them.",
    githubUrl: `${GH}/landscape/02-access-data-science.md`,
  },
  {
    slug: "landscape-03-map-expansion",
    doc: "landscape/03-map-expansion.md",
    title: "Map expansion: cost, depth × field, trend, funnel, gates",
    group: "landscape",
    groupLabel: "Landscape",
    blurb:
      "The cost-to-access surface, depth × field, the temporal trend, the continuity funnel, and the gatekeeper latency.",
    githubUrl: `${GH}/landscape/03-map-expansion.md`,
  },
  {
    slug: "landscape-04-knowledge-gatekeeping-and-what-works",
    doc: "landscape/04-knowledge-gatekeeping-and-what-works.md",
    title: "Knowledge gatekeeping, and what works",
    group: "landscape",
    groupLabel: "Landscape",
    blurb:
      "The publisher political economy, and the human-mediated levers the evidence supports (Teaching at the Right Level, tutoring, metacognition).",
    githubUrl: `${GH}/landscape/04-knowledge-gatekeeping-and-what-works.md`,
  },
  {
    slug: "landscape-05-geographic-access",
    doc: "landscape/05-geographic-access.md",
    title: "Geographic access to the frontier",
    group: "landscape",
    groupLabel: "Landscape",
    blurb:
      "The frontier near-monopoly: top-10 countries hold 69.3% of researcher capacity; women out-enroll men yet hold ~33% of research posts.",
    githubUrl: `${GH}/landscape/05-geographic-access.md`,
  },
  {
    slug: "landscape-06-historical-access-arc",
    doc: "landscape/06-historical-access-arc.md",
    title: "The historical access arc",
    group: "landscape",
    groupLabel: "Landscape",
    blurb:
      "5,000 years of knowledge technologies: every one widened access to consume; none widened access to produce.",
    githubUrl: `${GH}/landscape/06-historical-access-arc.md`,
  },
  {
    slug: "landscape-07-modality",
    doc: "landscape/07-modality.md",
    title: "Modality: how knowledge is acquired",
    group: "landscape",
    groupLabel: "Landscape",
    blurb:
      "The mechanism: scalable channels ceiling out below production; the one production-reaching channel does not scale. The empty cell is the gap.",
    githubUrl: `${GH}/landscape/07-modality.md`,
  },
];

export function listEducationDocs(): EducationDoc[] {
  return EDUCATION_DOCS;
}

export function getEducationDoc(slug: string): EducationDoc | undefined {
  return EDUCATION_DOCS.find((d) => d.slug === slug);
}

const CONTENT_ROOT = path.join(process.cwd(), "src", "content", "education");

/**
 * Read a vendored education-corpus markdown doc by its relative path.
 * Path traversal is blocked: only `[a-z0-9-]/...md` under the content root.
 */
export function readEducationDoc(relPath: string): string {
  // allow subdir segments + .md; strip anything dangerous
  const safe = relPath
    .split("/")
    .map((seg) => seg.replace(/[^A-Za-z0-9._-]/g, ""))
    .filter(Boolean)
    .join("/");
  const full = path.join(CONTENT_ROOT, safe);
  if (!full.startsWith(CONTENT_ROOT)) {
    return `# Document not found\n\n_Invalid path._`;
  }
  try {
    return fs.readFileSync(full, "utf-8");
  } catch {
    return `# ${safe}\n\n_Document not found._`;
  }
}
