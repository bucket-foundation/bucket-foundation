/**
 * bucket.foundation — research papers index
 * -----------------------------------------
 * The first Bucket-published paper is the research-atlas funding-landscape
 * preprint. Its content (abstract, figures, PDF) is vendored into
 * public/papers/<slug>/ so the site is self-contained. Add future papers by
 * appending to PAPERS.
 *
 * Source of truth for paper 01: ~/agfarms/research-atlas/docs/papers/
 * 01-funding-landscape/{paper.md, paper.pdf} + analysis/figures/*.png,
 * DOI 10.5281/zenodo.20774322 (concept).
 */

export type Figure = {
  src: string; // path under /public
  alt: string;
  caption: string;
};

export type Paper = {
  slug: string;
  title: string;
  authors: string;
  affiliation: string;
  date: string; // ISO-ish display date
  version: string;
  venue: string; // e.g. "preprint"
  doi: string; // bare DOI, e.g. "10.5281/zenodo.20774322"
  doiUrl: string;
  pdfUrl: string; // under /public
  githubUrl: string;
  license: string;
  corpusLine: string;
  abstract: string[]; // paragraphs
  highlights: string[]; // headline findings
  figures: Figure[];
  /** A BibTeX citation block. */
  bibtex: string;
};

export const PAPERS: Paper[] = [
  {
    slug: "funding-landscape",
    title:
      "The structure of public research funding, 2015–2025: concentration, cross-funder co-funding, and the funding→output relationship in a reconciled NIH/NSF/EC/UKRI grant graph",
    authors: "Gianangelo Dichio · research-atlas working group",
    affiliation: "Bucket Foundation",
    date: "2026-06-19",
    version: "1.0 (preprint draft)",
    venue: "preprint",
    doi: "10.5281/zenodo.20774322",
    doiUrl: "https://doi.org/10.5281/zenodo.20774322",
    pdfUrl: "/papers/01-funding-landscape/paper.pdf",
    githubUrl: "https://github.com/bucket-foundation/research-atlas",
    license: "CC-BY-4.0",
    corpusLine:
      "research-atlas v0.1.0 — 887,016 grants / 69 funders / 226,785 linked works",
    abstract: [
      "We assemble a reconciled graph of the global public-research economy — 887,016 grants from the U.S. National Institutes of Health (NIH), the U.S. National Science Foundation (NSF), the European Commission (EC, via CORDIS), and UK Research and Innovation (UKRI), 2015–2025 — in which recipient organizations are merged on ROR identifiers, investigators on ORCID, and 156,877 research outputs are linked to the grants that funded them through 285,604 OpenAlex acknowledgement edges.",
      "Working only from statistics that are robust to known entity-resolution noise (grant and work counts, country- and funder-level aggregates, the ROR-resolved subset), we characterize three structural features of the funding system. (1) Concentration. Across 4,840 ROR-resolved recipient institutions the distribution of grants is extreme: Gini = 0.929 (95% bootstrap CI [0.919, 0.936]); the top 1% of institutions hold 53.6% of all grants and the top 10% hold 92.0%. (2) Cross-funder structure. Of 156,877 funded works, 26.3% acknowledge two or more distinct funders; the dominant co-funding pair is intra-European (ERC↔EC, 17,502 shared works), with EC↔NSF (3,430) and NIGMS↔NSF (2,944) the leading trans-Atlantic and cross-agency ties. (3) The funding→output relationship. Restricting to the three funders with output linkage (NIH, NSF, EC), the count-based productivity rate ranges from 0.94 linked works per $1M (NIBIB) to 0.05 (NCATS), with NSF at 0.72 and the ERC at 0.67; these differences track each funder's mission (basic-science vs. translational/infrastructure) rather than efficiency.",
      "We state the corpus and entity-resolution limitations plainly — most importantly that the country distribution reflects the NIH-heavy composition of the corpus, not a measurement of global funding — and we release all code, data references, and a Zenodo-ready metadata record.",
    ],
    highlights: [
      "Institutional grant concentration is extreme: Gini = 0.929; the top 1% of institutions hold 53.6% of all grants.",
      "A quarter of funded works (26.3%) are co-funded by two or more funders, led by intra-European ERC↔EC ties.",
      "Funding→output rates span ~20× across funders and track mission (basic vs. translational), not efficiency: NSF 0.72 and ERC 0.67 land remarkably close.",
      "Every headline number is emitted by analysis/run.py and pinned by a test suite — fully reproducible.",
    ],
    figures: [
      {
        src: "/papers/01-funding-landscape/fig1_lorenz_orgs.png",
        alt: "Lorenz curve of grant counts across recipient institutions",
        caption:
          "Figure 1. Lorenz curve of grant counts across 4,840 ROR-resolved recipient institutions, 2015–2025. The observed curve departs maximally from the equality line; Gini = 0.929.",
      },
      {
        src: "/papers/01-funding-landscape/fig2_geography.png",
        alt: "Recipient grants by organization country",
        caption:
          "Figure 2. Recipient grants by organization country (thousands), top 12, 2015–2025. The U.S. bar dwarfs the EU tail; this reflects the NIH-heavy composition of the corpus, not global funding.",
      },
      {
        src: "/papers/01-funding-landscape/fig3_cofunding.png",
        alt: "Cross-funder co-funding heatmap",
        caption:
          "Figure 3. Cross-funder co-funding: cell (i,j) is the number of works acknowledging both funder i and funder j. Two communities (US agencies, European funders) joined by NSF↔EC/ERC bridges.",
      },
      {
        src: "/papers/01-funding-landscape/fig4_output_rate.png",
        alt: "Linked works per $1M awarded by funder",
        caption:
          "Figure 4. Linked works per $1M awarded, by funder (NIH/NSF/EC only). Basic-science funders cluster high; translational/infrastructure funders cluster low.",
      },
      {
        src: "/papers/01-funding-landscape/fig5_field_dynamics.png",
        alt: "Fastest-rising and fastest-declining research topics",
        caption:
          "Figure 5. Fastest-rising and fastest-declining topics by funded-output growth ratio (2021–24 / 2016–19). COVID-19 and AI rise; virology niches and classical signaling fall.",
      },
    ],
    bibtex: `@misc{dichio2026funding,
  title        = {The structure of public research funding, 2015--2025:
                  concentration, cross-funder co-funding, and the
                  funding-to-output relationship in a reconciled
                  NIH/NSF/EC/UKRI grant graph},
  author       = {Dichio, Gianangelo},
  year         = {2026},
  howpublished = {Bucket Foundation preprint},
  doi          = {10.5281/zenodo.20774322},
  url          = {https://doi.org/10.5281/zenodo.20774322},
  note         = {research-atlas v0.1.0}
}`,
  },
];

export function listPapers(): Paper[] {
  return PAPERS;
}

export function getPaper(slug: string): Paper | undefined {
  return PAPERS.find((p) => p.slug === slug);
}
