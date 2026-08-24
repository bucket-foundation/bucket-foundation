/**
 * bucket.foundation, research papers index
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
      "The structure of public research funding, 2015-2025: concentration, cross-funder co-funding, and the funding→output relationship in a reconciled NIH/NSF/EC/UKRI grant graph",
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
      "research-atlas v0.1.0, 887,016 grants / 69 funders / 226,785 linked works",
    abstract: [
      "We assemble a reconciled graph of the global public-research economy, 887,016 grants from the U.S. National Institutes of Health (NIH), the U.S. National Science Foundation (NSF), the European Commission (EC, via CORDIS), and UK Research and Innovation (UKRI), 2015-2025, in which recipient organizations are merged on ROR identifiers, investigators on ORCID, and 156,877 research outputs are linked to the grants that funded them through 285,604 OpenAlex acknowledgement edges.",
      "Working only from statistics insensitive to known entity-resolution noise (grant and work counts, country- and funder-level aggregates, the ROR-resolved subset), we characterize three structural features of the funding system. (1) Concentration. Across 4,840 ROR-resolved recipient institutions the distribution of grants is extreme: Gini = 0.929 (95% bootstrap CI [0.919, 0.936]); the top 1% of institutions hold 53.6% of all grants and the top 10% hold 92.0%. (2) Cross-funder structure. Of 156,877 funded works, 26.3% acknowledge two or more distinct funders; the dominant co-funding pair is intra-European (ERC↔EC, 17,502 shared works), with EC↔NSF (3,430) and NIGMS↔NSF (2,944) the leading trans-Atlantic and cross-agency ties. (3) The funding→output relationship. Restricting to the three funders with output linkage (NIH, NSF, EC), the count-based productivity rate ranges from 0.94 linked works per $1M (NIBIB) to 0.05 (NCATS), with NSF at 0.72 and the ERC at 0.67; these differences track each funder's mission (basic-science vs. translational/infrastructure) rather than efficiency.",
      "We state the corpus and entity-resolution limitations plainly: the country distribution reflects the NIH-heavy composition of the corpus, not a measurement of global funding, and we release all code, data references, and a Zenodo-ready metadata record.",
    ],
    highlights: [
      "Institutional grant concentration is extreme: Gini = 0.929; the top 1% of institutions hold 53.6% of all grants.",
      "A quarter of funded works (26.3%) are co-funded by two or more funders, led by intra-European ERC↔EC ties.",
      "Funding→output rates span ~20× across funders and track mission (basic vs. translational), not efficiency: NSF 0.72 and ERC 0.67 land close.",
      "Every headline number is emitted by analysis/run.py and pinned by a test suite, fully reproducible.",
    ],
    figures: [
      {
        src: "/papers/01-funding-landscape/fig1_lorenz_orgs.png",
        alt: "Lorenz curve of grant counts across recipient institutions",
        caption:
          "Figure 1. Lorenz curve of grant counts across 4,840 ROR-resolved recipient institutions, 2015-2025. The observed curve departs maximally from the equality line; Gini = 0.929.",
      },
      {
        src: "/papers/01-funding-landscape/fig2_geography.png",
        alt: "Recipient grants by organization country",
        caption:
          "Figure 2. Recipient grants by organization country (thousands), top 12, 2015-2025. The U.S. bar dwarfs the EU tail; this reflects the NIH-heavy composition of the corpus, not global funding.",
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
          "Figure 5. Fastest-rising and fastest-declining topics by funded-output growth ratio (2021-24 / 2016-19). COVID-19 and AI rise; virology niches and classical signaling fall.",
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
  {
    slug: "paper-ranking",
    title:
      "The transformer paper-recommendation advantage is real at the head of the impact distribution and decays to null across the broad literature: a 4-checkpoint, all-26-field convergence study of SPECTER vs TF-IDF",
    authors: "Bucket Foundation · research-atlas working group",
    affiliation: "Bucket Foundation",
    date: "2026-06-23",
    version: "2.1 (final cross-field preprint)",
    venue: "preprint",
    doi: "10.5281/zenodo.20808201",
    doiUrl: "https://doi.org/10.5281/zenodo.20808201",
    pdfUrl: "/papers/paper-ranking/paper.pdf",
    githubUrl: "https://github.com/bucket-foundation/research-atlas",
    license: "CC-BY-4.0",
    corpusLine:
      "research-atlas v0.3.0, OpenAlex, all 26 fields, impact-ranked 2015-2024, 78,000 → 361,800 works over 4 checkpoints (concept DOI 10.5281/zenodo.20774322)",
    abstract: [
      "A companion single-subfield study showed that SPECTER (a transformer pre-trained on the scientific-paper citation graph) beats a TF-IDF baseline at held-out citation prediction in High-Energy Physics (+15.4% relative MAP, p = 0.0005), a large win, measured on the citation-dense top-cited slice of one subfield. The natural question, the one a practitioner faces when reaching for a neural paper-recommender, is whether that advantage generalizes.",
      "We answer it with a checkpointed, resumable, producer/consumer pipeline that pulls an impact-ranked corpus (most-cited papers first) across all 26 OpenAlex top-level fields, builds a complete in-corpus citation graph and PageRank per field, embeds title+abstract on a local AMD GPU (ROCm) at a measured 9.1 docs/s, and runs the identical held-out citation-prediction evaluation, SPECTER vs TF-IDF vs word2vec vs a text-free graph recommender, with bootstrap CIs and a paired test, in every field, then grows the corpus and re-measures. The result is a clean convergence finding. At checkpoint 1 (top ~3k works/field, 78,000 works), SPECTER beats TF-IDF in 16 of 26 fields and the across-field edge is large and nearly significant: combined mean ΔMAP +0.0095 (95% CI [−0.0005, +0.0195], bootstrap p = 0.062). As the impact-ranked corpus broadens, checkpoint 2 (130,000), checkpoint 3 (361,800), the edge decays monotonically toward null: 12/26 then 11/26 wins; combined ΔMAP −0.0008 (p = 0.80) then −0.0019 (95% CI [−0.0075, +0.0034], p = 0.49). Checkpoint 4 found the impact-ranked corpus had plateaued at 361,800 works and reproduced checkpoint 3 exactly, so the result is converged.",
      "The headline: neural paper-recommendation's edge is concentrated in the head of the impact distribution; across the broad literature it is not a general win. The advantage survives where fine-grained phrase meaning carries relevance (Computer Science, Social Sciences, Neuroscience, Biochemistry) and reverses in physical-science / pharmacology fields (Pharmacology −0.040 p < 0.001; Chemistry −0.025 p < 0.001; Earth & Planetary −0.020 p < 0.001) where exact-term matching wins. Citation concentration (Gini 0.243-0.501) and interdisciplinarity (cross-field reference fraction 0.169-0.558) vary by field but do not predict the split.",
    ],
    highlights: [
      "SPECTER's across-field edge over TF-IDF is large and nearly significant on the most-cited core (+0.0095 ΔMAP, 16/26 wins, p = 0.062 at checkpoint 1) and decays monotonically to null as the corpus broadens (−0.0019, p = 0.49 at checkpoint 3).",
      "The result is converged: checkpoint 4 hit the corpus availability + rate-limit ceiling at 361,800 works and reproduced checkpoint 3 to the digit (11/26, −0.0019, p = 0.49).",
      "SPECTER wins where fine-grained meaning carries relevance (Social Sciences +0.022, Computer Science +0.021 p < 0.001) and loses in lexical/physical-science fields (Pharmacology −0.040, Chemistry −0.025, both p < 0.001).",
      "The +15.4% HEP win did not survive aggregation: Physics & Astronomy flips to a significant loss (−0.0098, p = 0.034) at the converged checkpoint.",
      "Every number is emitted by scripts/crossfield_run.py and pinned by tests/test_crossfield.py, fully reproducible.",
    ],
    figures: [
      {
        src: "/papers/paper-ranking/convergence.png",
        alt: "Cross-field convergence across 4 checkpoints",
        caption:
          "Cross-field convergence across 4 checkpoints (78k to 362k works): the combined mean ΔMAP and its 95% CI decay to null, and the win fraction crosses below the 0.5 coin-flip line, then plateaus at checkpoint 4.",
      },
    ],
    bibtex: `@misc{bucket2026paperranking,
  title        = {The transformer paper-recommendation advantage is real at the
                  head of the impact distribution and decays to null across the
                  broad literature: a 4-checkpoint, all-26-field convergence
                  study of SPECTER vs TF-IDF},
  author       = {{Bucket Foundation research-atlas working group}},
  year         = {2026},
  howpublished = {Bucket Foundation preprint},
  doi          = {10.5281/zenodo.20808201},
  url          = {https://doi.org/10.5281/zenodo.20808201},
  note         = {research-atlas v0.3.0}
}`,
  },
  {
    slug: "funder-specialization",
    title:
      "What each funder funds: specialization, complementarity, and the surprising temporal stability of funder field-portfolios in a reconciled NIH/NSF/EC grant→output graph",
    authors: "Bucket Foundation · research-atlas working group",
    affiliation: "Bucket Foundation",
    date: "2026-06-24",
    version: "1.0 (preprint draft)",
    venue: "preprint",
    doi: "10.5281/zenodo.20836205",
    doiUrl: "https://doi.org/10.5281/zenodo.20836205",
    pdfUrl: "/papers/funder-specialization/paper.pdf",
    githubUrl: "https://github.com/bucket-foundation/research-atlas",
    license: "CC-BY-4.0",
    corpusLine:
      "research-atlas v0.4.0, 1,670,434 grants / 75 funders / 470,269 grant→work edges (concept DOI 10.5281/zenodo.20774322)",
    abstract: [
      "Paper 01 in this series characterized who gets research grants (institutional concentration), who shares the resulting papers (co-funding), and how much output accompanies a dollar (the funding→output rate). It did not ask what is, structurally, a prior question: what does each funder actually fund, and how distinctively?",
      "Here we answer that on the same reconciled graph by mapping every funder's linked output to the 26 OpenAlex top-level fields, purely on distinct-work counts, with no dollar column anywhere, and measuring three things. (1) A specialization gradient. Across the 23 funders with enough linked output to estimate a portfolio, the field-concentration of that portfolio (an HHI over the 26 fields) spans a clean 5× range, from the two pure generalists, the EC (HHI 0.092) and NSF (0.095), to the hyper-specialist NHGRI (HHI 0.466), which puts 66% of its linked output in a single field. (2) Complementarity, recovered from data. Cosine similarity of funder field-share vectors recovers the agency map with no labels: the NIH Institutes form a tight cluster (internal mean cosine 0.819), NSF is the maximal outlier (mean cosine to the NIH cluster 0.385; most-distinct pair NIDCD↔NSF at 0.217), and the EC sits in between as a partial bridge (0.621). (3) Specialization is a stable fingerprint. Comparing each funder's portfolio HHI in 2016-2019 versus 2021-2024, the rank order is almost perfectly preserved (Spearman ρ = 0.973) and the mean absolute change in HHI is only 0.011.",
      "The one aggregate compositional move we detect, Physical Sciences' share of funded output rising +3.83pp (95% CI [+2.87, +4.85]) from 2016 to 2024, vanishes under mix control: within NSF alone the Physical-Sciences share fell 0.88pp, so the aggregate wobble is a composition/coverage-endpoint artifact, not a secular shift. We state the scope limit plainly throughout, field assignment requires output edges, which exist for NIH/NSF/EC only, and release all code and a Zenodo-ready metadata record.",
    ],
    highlights: [
      "Funders span a clean 5× specialization gradient: generalists EC (HHI 0.092) and NSF (0.095) at one end, the hyper-specialist NHGRI (0.466, 66% in one field) at the other.",
      "Cosine similarity of field-share vectors recovers the agency map with no labels: a tight NIH cluster (internal cosine 0.819), NSF as the maximal outlier (0.385 to NIH), the EC as a partial bridge (0.621).",
      "Specialization is a stable fingerprint, not a fad: early-vs-late HHI rank order is preserved at Spearman ρ = 0.973, mean |ΔHHI| just 0.011.",
      "The apparent +3.83pp swing toward the physical sciences is a coverage-endpoint composition artifact, within NSF the share actually fell 0.88pp.",
      "Touches no dollar column, so the graph's known dollar-noise sources cannot reach any reported number; every constant is pinned by tests/test_funder_specialization.py.",
    ],
    figures: [
      {
        src: "/papers/funder-specialization/fig1_specialization_gradient.png",
        alt: "Funder specialization gradient",
        caption:
          "Figure 1. Funder specialization gradient: portfolio HHI over the 26 OpenAlex fields, generalist (top) to specialist (bottom). Navy = US (NSF + NIH ICs), red = EC/supranational. Each bar is labelled with that funder's dominant field and its share. Distinct linked works, 2016-2024.",
      },
      {
        src: "/papers/funder-specialization/fig2_similarity.png",
        alt: "Funder portfolio similarity matrix",
        caption:
          "Figure 2. Funder portfolio similarity: cosine between 26-field share vectors. The bright NIH×NIH block (internal mean cosine 0.819) and the dark NSF column (mean 0.385 to NIH) are the complementarity structure.",
      },
      {
        src: "/papers/funder-specialization/fig3_stability.png",
        alt: "Specialization stability scatter",
        caption:
          "Figure 3. Specialization stability: each funder's portfolio HHI in 2016-2019 (x) vs 2021-2024 (y). Points hug the y = x line (Spearman ρ = 0.973; mean |ΔHHI| = 0.011), funders do not re-specialize.",
      },
      {
        src: "/papers/funder-specialization/fig4_composition.png",
        alt: "Aggregate vs within-NSF domain composition",
        caption:
          "Figure 4. Left: aggregate domain composition of funded output by year, Physical Sciences (navy) appears to rise at the 2024 endpoint. Right: within NSF alone (mix-controlled) the Physical-Sciences share is flat-to-falling, showing the aggregate move is a composition/coverage artifact.",
      },
    ],
    bibtex: `@misc{bucket2026funderspecialization,
  title        = {What each funder funds: specialization, complementarity, and
                  the surprising temporal stability of funder field-portfolios
                  in a reconciled NIH/NSF/EC grant-to-output graph},
  author       = {{Bucket Foundation research-atlas working group}},
  year         = {2026},
  howpublished = {Bucket Foundation preprint},
  doi          = {10.5281/zenodo.20836205},
  url          = {https://doi.org/10.5281/zenodo.20836205},
  note         = {research-atlas v0.4.0}
}`,
  },
  {
    slug: "funding-careers",
    title:
      "Public funding and researcher careers: funder portfolios, career-stage composition, and why the funded-vs-unfunded productivity gap is mostly selection, not effect",
    authors: "Bucket Foundation · research-atlas working group",
    affiliation: "Bucket Foundation",
    date: "2026-06-24",
    version: "1.0 (preprint draft)",
    venue: "preprint",
    doi: "10.5281/zenodo.20836727",
    doiUrl: "https://doi.org/10.5281/zenodo.20836727",
    pdfUrl: "/papers/funding-careers/paper.pdf",
    githubUrl: "https://github.com/bucket-foundation/research-atlas",
    license: "CC-BY-4.0",
    corpusLine:
      "research-atlas v0.5.0, 1,740,326 grant-PI edges; a grant_pi_person bridge resolving 528,570 (30.4%) to 59,180 canonical researchers (concept DOI 10.5281/zenodo.20774322)",
    abstract: [
      "Papers 01-03 in this series studied the funding graph without ever touching the people side: a grant's principal investigator (PI) was a name-only node with no ORCID, so funding could not be joined to careers at all. A new conservative resolver closes that gap, producing a grant_pi_person bridge that links 528,570 of the 1,740,326 PI edges (30.4%) to 59,180 distinct canonical researchers (490,839 edges carry an ORCID).",
      "This paper asks how public funding maps onto researcher careers, and its central methodological move is to refuse a tempting false claim. The resolver succeeds precisely on ORCID-era, OpenAlex-indexed, more-productive researchers: the resolved \"funded\" population is 89.9% ORCID'd vs 69.1% for the canonical researcher pool it is drawn from (a +20.8pp gap), with 2.12× the mean publications. So a naive \"funded researchers publish 2× more\" is confounded by resolution/selection bias, not a funding effect, and we state that up front and quantify it.",
      "We then make three descriptive claims that survive the bias. (1) Who each funder funds: Sloan funds the most eminence-skewed portfolio (9.5% eminent, median 451.5 citations), DFG and Wellcome the most early-career-skewed (DFG 69.0% rising-stars); NIH's grant-holders are 88.0% biomedical, NSF's span the disciplines with no field above 28%. (2) Career-stage composition: across the funded population, 58.8% are rising-stars, 19.2% established, 4.6% eminent; grant-holding is concentrated (median 4 grants/researcher, max 394). (3) Funded vs comparison, stated plainly: restricting to the resolvable population and matching on field × career-stage × entry-era, the naive 2.11× publication ratio collapses to a matched residual of 1.23× works (95% CI [1.18, 1.28]), 1.23× h-index, and only 1.06× citations, roughly 80% of the apparent gap is selection. We make no causal claim; the selection-bias treatment is itself the contribution.",
    ],
    highlights: [
      "The headline is a refusal: the naive 2.1× funded-vs-unfunded publication gap is mostly selection, matching on field × career-stage × entry-era collapses it to 1.23× works [1.18, 1.28], 1.23× h-index, and just 1.06× citations.",
      "The resolution bias is measured, not assumed: funded PIs are 89.9% ORCID'd vs 69.1% for the pool (+20.8pp) with 2.12× the mean publications, the confound, not a finding.",
      "Within-funder portfolios differ in kind: Sloan is the most eminence-skewed (9.5% eminent), DFG/Wellcome the most rising-star-skewed (DFG 69.0%); NIH grant-holders are 88.0% biomedical, NSF's top field is only 28%.",
      "The matched residual is largest for rising-stars (1.375× works) and smallest for established researchers (1.156×), reported as descriptive structure, explicitly not a causal return to funding.",
      "No dollar column anywhere; the grant_pi_person bridge carries no PII; every constant is pinned by a seeded test (tests/test_funding_careers.py).",
    ],
    figures: [
      {
        src: "/papers/funding-careers/fig1_selection_vs_matched.png",
        alt: "Selection bias vs matched residual",
        caption:
          "Figure 1. (A) The selection, not an effect: resolved/funded PIs are far more ORCID'd and more productive than the canonical researcher pool, the confound, not a finding. (B) Restricting to the resolvable population and matching on field × career-stage × entry-era collapses the naive 2.1× publication gap to ~1.2× (works, h-index) and ~1.06× (citations); error bars are 2,000-sample bootstrap 95% CIs.",
      },
      {
        src: "/papers/funding-careers/fig2_funder_stage_portfolios.png",
        alt: "Funder career-stage portfolios",
        caption:
          "Figure 2. Who each funder funds, by career stage: the career-stage composition of each funder's distinct resolved grant-holders. Sloan is the most eminence-skewed; DFG and Wellcome the most rising-star-skewed. Within-funder structure, the resolution bias inflates every funder alike.",
      },
      {
        src: "/papers/funding-careers/fig3_funder_eminence_productivity.png",
        alt: "Funder eminence vs productivity",
        caption:
          "Figure 3. Funder researcher-portfolios differ on eminence (% of grant-holders who are high-impact) versus median grant-holder citations; marker area ∝ √(number of grant-holders). Sloan occupies the high-eminence/high-impact corner, DFG the low/low corner, NIH the high-volume centroid.",
      },
      {
        src: "/papers/funding-careers/fig4_matched_by_stage.png",
        alt: "Matched residual by career stage",
        caption:
          "Figure 4. Matched residual works-gap by career stage (same field × entry-era matching within each seniority). The residual is largest for rising-stars (1.38×) and smallest for established researchers (1.16×); the dashed line is parity. Descriptive, not causal.",
      },
    ],
    bibtex: `@misc{bucket2026fundingcareers,
  title        = {Public funding and researcher careers: funder portfolios,
                  career-stage composition, and why the funded-vs-unfunded
                  productivity gap is mostly selection, not effect},
  author       = {{Bucket Foundation research-atlas working group}},
  year         = {2026},
  howpublished = {Bucket Foundation preprint},
  doi          = {10.5281/zenodo.20836727},
  url          = {https://doi.org/10.5281/zenodo.20836727},
  note         = {research-atlas v0.5.0}
}`,
  },
];

export function listPapers(): Paper[] {
  return PAPERS;
}

export function getPaper(slug: string): Paper | undefined {
  return PAPERS.find((p) => p.slug === slug);
}
