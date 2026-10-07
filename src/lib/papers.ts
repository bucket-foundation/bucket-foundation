export type Figure = {
  src: string;
  alt: string;
  caption: string;
};

export type DataLink = {
  label: string;
  href: string;
};

export type Paper = {
  slug: string;
  title: string;
  authors: string;
  affiliation: string;
  date: string;
  version: string;
  venue: string;
  doi?: string;
  doiUrl?: string;
  pdfUrl: string;
  githubUrl: string;
  license: string;
  corpusLine: string;
  abstract: string[];
  highlights: string[];
  figures: Figure[];
  dataLinks?: DataLink[];
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
  {
    slug: "solvability-frontier",
    title:
      "Machine learning for scientific discovery: the solvability frontier",
    authors: "Gianangelo Dichio",
    affiliation: "Bucket Foundation",
    date: "2026-10-07",
    version: "1.0 (full report)",
    venue: "Bucket Foundation report",
    pdfUrl: "/papers/solvability-frontier/paper.pdf",
    githubUrl:
      "https://github.com/gianyrox/bucket-foundation/tree/dev/papers/solvability-frontier",
    license: "CC-BY-4.0 text; figures and data per file below",
    corpusLine:
      "solvability atlas, 5,080 problem statements across seven branches, bge-small-en-v1.5 embeddings, 50 stored neighbours per row",
    abstract: [
      "A first pass, the Solver Gap Engine of 2026-09-30, ranked 1,364 open problems from the formal-conjectures repository by their nearest solved problem in another file and found 31 at cosine similarity 0.8 or above. The frontier is the second pass. We embed 5,080 problem statements across seven canon branches with a small sentence encoder, call a problem's reach its highest similarity to a solved problem, and draw a frontier at the 10th percentile of solved problems' reach, 0.781 on this set. Open problems are sorted into a reach class: 251 close to known results, 764 borderline, 911 that need a new idea and 103 in a branch with too few solved rows to judge.",
      "A backtest at cutoffs 2005 and 2021 scores the rule on the questions posed by those years under two outcome codings, and the backtest is inconclusive. Settled only: at 2005 the inside rows settle at 21% against 6% outside (112 and 71 rows, permutation p = 0.006, AUC 0.800) and at 2021 at 12% against 1% (238 and 126 rows, p < 0.001, AUC 0.883), but 11 and 21 of the scored rows are solved rows with no resolved year, and without them the gaps are 13% against 6% (p = 0.131) and 3% against 1% (p = 0.269). Settled or advanced: 46% inside against 61% outside at 2005 (183 rows, p = 0.051, AUC 0.479) and 43% against 39% at 2021 (364 rows, p = 0.503, AUC 0.523). The verdict depends on how partial is coded, and the embeddings and stored neighbours come from the 2026 corpus, so the test is a check against known outcomes under that leak and no forecast.",
    ],
    highlights: [
      "Solver Gap Engine, 2026-09-30: 3,599 formal-conjectures problems mapped, 1,364 open problems ranked, 31 at cross-file similarity 0.8 or above, median 0.586 against 0.167 for a random pair.",
      "Frontier at reach 0.781 on 5,080 rows: 1,621 solved, 2,225 reachable, 1,131 beyond, 103 unsampled; 3,644 of the 3,846 inside rows are mathematics.",
      "The backtest is inconclusive: the settled-only gap (21% against 6% at 2005, 12% against 1% at 2021, p = 0.006 and p < 0.001) is carried by solved rows with no resolved year and drops to p = 0.131 and p = 0.269 without them; the settled-or-advanced AUC sits within 0.03 of chance at both cutoffs.",
      "Predictions by class for 2,029 open top-level problems, with the three nearest solved problems and starting works per row, published as predictions.csv.",
    ],
    figures: [
      {
        src: "/papers/solvability-frontier/fig_frontier.webp",
        alt: "The solvability frontier drawn as a disc: solved rows inside, open rows inside the circle at reach 0.781, outside rows beyond it, unsampled rows as grey crosses",
        caption:
          "Figure 2. The frontier on 5,080 rows. Solved rows fill the inner disc by reach, open rows inside fill the ring up to the circle at 0.781, outside rows sit beyond it by how far their reach falls short, and unsampled rows are grey crosses. Angle is the row's rank along the first two principal components of the embeddings.",
      },
      {
        src: "/papers/solvability-frontier/fig_makeup.webp",
        alt: "Bar charts of the 5,080 rows by branch, status, form, source, licence, resolution evidence, posed and resolved years, zone, class, level, text kind and length",
        caption:
          "Figure 1. Make-up of the 5,080 rows under every label the pipeline reads: mathematics holds 4,112 rows, formal-conjectures supplies 3,567, Apache-2.0 covers 3,557, 588 rows carry a posed year, 236 a resolved year, and 2,194 are variants of another row.",
      },
      {
        src: "/papers/solvability-frontier/fig_backtest.webp",
        alt: "Resolved rate by 2026 inside and outside the cutoff frontier at 2005 and 2021 under both codings and by length band",
        caption:
          "Figure 3. Resolved rate by 2026 inside and outside the cutoff frontier under both codings, over all scored rows, with the undated solved rows removed, and by length band.",
      },
      {
        src: "/papers/solvability-frontier/fig_classes.webp",
        alt: "Stacked bars of open problems per reach class, coloured by branch",
        caption:
          "Figure 4. Reach classes by branch: 251 close to known results, 764 borderline, 911 that need a new idea and 103 unsampled. Mathematics holds 247 of the 251 and 737 of the 764.",
      },
    ],
    dataLinks: [
      { label: "predictions.csv, 2,029 ranked open problems; CC BY-SA 4.0, carries Wikipedia and formal-conjectures statements, attributed per row", href: "/papers/solvability-frontier/data/predictions.csv" },
      { label: "backtest.json, both cutoffs and codings; CC BY-SA 4.0, carries row statements", href: "/papers/solvability-frontier/data/backtest.json" },
      { label: "makeup.json, counts per label; CC0", href: "/papers/solvability-frontier/data/makeup.json" },
      { label: "frontier.svg, the drawing; MIT code output over CC BY-SA 4.0 and Apache-2.0 data, attributed", href: "/papers/solvability-frontier/data/frontier.svg" },
      { label: "fig_frontier, fig_makeup, fig_backtest, fig_classes (webp); MIT code output over CC BY-SA 4.0 and Apache-2.0 data, attributed", href: "https://github.com/gianyrox/bucket-foundation/tree/dev/papers/solvability-frontier/figures" },
      { label: "formal-conjectures, Apache-2.0", href: "https://github.com/google-deepmind/formal-conjectures" },
    ],
    bibtex: `@techreport{dichio2026solvabilityfrontier,
  title        = {Machine learning for scientific discovery: the solvability frontier},
  author       = {Dichio, Gianangelo},
  institution  = {Bucket Foundation},
  year         = {2026},
  month        = {10},
  url          = {https://www.bucket.foundation/research/papers/solvability-frontier},
  note         = {Full report, version 1.0, 2026-10-07}
}`,
  },
  {
    slug: "human-ai-multiplier",
    title:
      "Human-AI-computer interaction: measuring whether AI strengthens unaided judgment",
    authors: "Gianangelo Dichio",
    affiliation: "Bucket Foundation",
    date: "2026-10-07",
    version: "1.1 (protocol report with the learning system, no results on a person)",
    venue: "Bucket Foundation report",
    pdfUrl: "/papers/human-ai-multiplier/paper.pdf",
    githubUrl:
      "https://github.com/gianyrox/bucket-foundation/tree/dev/packages/bkt/src/hai",
    license: "CC-BY-4.0 text; figures MIT code output over the repository's own synthetic metrics; code MIT",
    corpusLine:
      "hai probe in packages/bkt: 998 frozen four-choice items across the seven canon branches, 68 held out by review, no retested probes yet; learning system in learning/research-os/learning-system: 57,060 enumerated planning cases, Lean 4 contract, synthetic prediction experiment",
    abstract: [
      "A tool that helps a person answer today and leaves them no better at answering alone next week has made them dependent on it. We state a measurement protocol that separates the two outcomes. On one task set, three scores are taken: the person's unaided score Hp, the model's score A, and the person's joint score Jp with the model's answer in view. The multiplier is mp = Jp / max(Hp, A), the gain is D = Jp - max(Hp, A), and the unaided test is repeated after seven days to give retention Rp = Hp(t + 7 days) - Hp(t) and learning L = Jp(t + 7 days) - Hp(t + 7 days). A tool that raises Jp while L stays at or below zero across its interval marks dependence.",
      "The learning side of the measurement is the minimum prerequisite learning problem: the catalog is a directed acyclic graph of concepts, a learner's state is a closed set of mastered concepts, and the least a learner must add to reach a target is the required set R(t, M), the target's prerequisite closure minus their mastery, a count proved minimal in Lean 4 under stated assumptions. Per-concept mastery is M = P^alpha R^beta with FSRS-5 retrievability as R and alpha = beta = 1 as implemented. The protocol draws probe items at the learner's frontier, the ready concepts of that graph, and reads Rp against the FSRS prediction.",
      "The instrument is the hai probe in Bucket's bkt package: a frozen bank of 998 four-choice items, sessions of 40 items in 20 pairs matched on tier and on whether the model got the pair's items right, a 20 second think window before the model's answer appears, no feedback until the retest, guess-corrected scores and a bootstrap over pairs for every interval. The instrument is built and no probe has been retested, so this report carries no result on a person; the learning system's own evaluation, 57,060 enumerated planning cases with zero errors and a synthetic prediction experiment, is reported with its source. The report states the planned analysis, paired comparisons stratified by education level, a divergence hypothesis on how reliance on one model narrows the range of answers across a group, and the rule by which the scores decide which tasks Research OS hands to the model and which it keeps with the person.",
    ],
    highlights: [
      "Four scores on the same items: Hp, A, Jp at day 0 and Hp again at day 7; mp = Jp / max(Hp, A), Rp = Hp(t + 7) - Hp(t), L = Jp(t + 7) - Hp(t + 7).",
      "Dependence flag: the 95% interval of Jp - Hp above zero and the interval of L at or below zero.",
      "Status 2026-10-07: bank frozen at 998 items, 68 flagged by review, no AI scores collected, no probe run, no retest. No numbers are reported.",
      "A half-width of 0.10 on Jp - Hp needs about 342 items per condition, 17 probes; no trend before 5 retested probes.",
      "Learning side: the minimum number of concepts to reach a target is |R(t, M)|, proved in Lean 4 (minimum_unit_distance, minimum_weighted_effort) under five stated assumptions; 57,060 enumerated planning cases on every DAG up to five nodes with zero errors.",
      "Mastery as shipped: M = P^alpha R^beta with alpha = beta = 1, P = sigmoid(theta + 0.2), R = FSRS-5 retrievability at 90 days, mastered at M >= 0.7. Probe items are drawn at the learner's frontier; the day 7 retest is reported against the FSRS prediction.",
    ],
    figures: [
      {
        src: "/papers/human-ai-multiplier/fig_timeline.webp",
        alt: "Timeline of probe sessions: day 0 probe with solo and pair items, day 7 unaided retest, day 14 next probe",
        caption:
          "Figure 1. The session timeline. Each probe splits 40 unseen items into solo and pair conditions on day 0, is retested unaided in full on day 7, and unlocks its scores only then; the next probe draws 40 new items.",
      },
      {
        src: "/papers/human-ai-multiplier/fig_scores.webp",
        alt: "Diagram of the four scores Hp, A, Jp and Hp at day 7 and the statistics derived from them",
        caption:
          "Figure 2. The four scores and the statistics derived from them: the multiplier and the gain from Hp, A and Jp; retention on the solo items and learning on the pair items from the day 7 scores; dependence where the gain is positive and learning is not.",
      },
      {
        src: "/papers/human-ai-multiplier/fig_prereq_chart.webp",
        alt: "Prerequisite chart with a verified foundation, two ready concepts and a blocked target, and the shortest knowledge-state path through the diamond",
        caption:
          "Figure 3. The prerequisite chart for a target T with one verified foundation, two ready concepts and a blocked target, and the shortest knowledge-state path from empty mastery through the same diamond: four transitions, equal to the required set.",
      },
      {
        src: "/papers/human-ai-multiplier/fig_knowledge_region.webp",
        alt: "Path of confirmed coordinates on two axes for a three-concept fixture, with coverage G and radial extent r at each milestone",
        caption:
          "Figure 4. The knowledge region on the three-concept fixture: the path of confirmed coordinates as a, then b, then t are confirmed, and the catalog coverage G with the radial extent r at each milestone, from analysis/results/metrics.json.",
      },
      {
        src: "/papers/human-ai-multiplier/fig_mastery.webp",
        alt: "FSRS-5 retrievability curves over 120 days for four stabilities, and the mastery surface M = P R with the 0.7 contour",
        caption:
          "Figure 5. FSRS-5 retrievability over 120 days for four stabilities with the day 7 retest and the 90-day horizon marked, and the mastery surface M = P R over proficiency and retention with the 0.7 mastered contour, as implemented in src/lib/academy.",
      },
      {
        src: "/papers/human-ai-multiplier/fig_protocol_region.webp",
        alt: "A layered catalog with known, frontier and blocked concepts and four probe items at the frontier, beside a one-probe timeline with FSRS predicted recall",
        caption:
          "Figure 6. The protocol over a learner's knowledge region: probe items drawn at the frontier, the day 0 scores, the day 7 retest and the FSRS-5 predicted recall for a solo and a pair item. The points show the pattern and carry no measured value.",
      },
      {
        src: "/papers/human-ai-multiplier/fig_validation.webp",
        alt: "Brier scores of three models on synthetic data and two residual correlations with bootstrap intervals",
        caption:
          "Figure 7. The synthetic statistical experiment: Brier scores of the three models on 4,800 test responses, and the two prespecified residual correlations with their 97.5% bootstrap intervals and Holm-adjusted p-values, from analysis/results/metrics.json.",
      },
    ],
    dataLinks: [
      { label: "probe source, packages/bkt/src/hai", href: "https://github.com/gianyrox/bucket-foundation/tree/dev/packages/bkt/src/hai" },
      { label: "bkt package README, hai commands", href: "https://github.com/gianyrox/bucket-foundation/blob/dev/packages/bkt/README.md" },
      { label: "learning system brief, Lean contract and metrics.json; CC-BY-4.0 text, MIT code", href: "https://github.com/gianyrox/bucket-foundation/tree/dev/learning/research-os/learning-system" },
      { label: "mastery and FSRS-5 as implemented, src/lib/academy; MIT", href: "https://github.com/gianyrox/bucket-foundation/tree/dev/src/lib/academy" },
      { label: "paper figures, seven webp; MIT code output over the repository's synthetic metrics, no person data", href: "https://github.com/gianyrox/bucket-foundation/tree/dev/papers/human-ai-multiplier/figures" },
    ],
    bibtex: `@techreport{dichio2026humanaimultiplier,
  title        = {Human-AI-computer interaction: measuring whether AI strengthens unaided judgment},
  author       = {Dichio, Gianangelo},
  institution  = {Bucket Foundation},
  year         = {2026},
  month        = {10},
  url          = {https://www.bucket.foundation/research/papers/human-ai-multiplier},
  note         = {Protocol report, version 1.1, 2026-10-07, no results on a person}
}`,
  },
];

export function listPapers(): Paper[] {
  return PAPERS;
}

export function getPaper(slug: string): Paper | undefined {
  return PAPERS.find((p) => p.slug === slug);
}
