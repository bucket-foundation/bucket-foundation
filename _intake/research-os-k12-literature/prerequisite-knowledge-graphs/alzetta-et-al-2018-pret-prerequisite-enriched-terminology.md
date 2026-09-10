---
title: "PRET: Prerequisite-Enriched Terminology. A Case Study on Educational Texts"
authors:
  - "Alzetta, Chiara"
  - "Koceva, Forsina"
  - "Passalacqua, Samuele"
  - "Torre, Ilaria"
  - "Adorni, Giovanni"
year: 2018
venue: "Proceedings of the Fifth Italian Conference on Computational Linguistics (CLiC-it 2018)"
doi: "10.4000/books.aaccademia.3028"
url: "https://doi.org/10.4000/books.aaccademia.3028"
openalex_id: "https://openalex.org/W2907317483"
branch: "prerequisite-knowledge-graphs"
tier: "candidate"
why_it_matters: >
  Builds a gold-standard, human-annotated dataset of prerequisite relations between
  terms extracted from a computer science textbook, and reports the inter-annotator
  agreement rate the annotators reached. This is a labeling-level, rather than a
  state-classification-level, agreement baseline, extending the kind of comparison
  point `jonsson-svingby-2007-scoring-rubrics-reliability-validity.md` supplies for
  rubric scoring into the prerequisite-edge domain.
key_claims:
  - "The PRET dataset annotates prerequisite relations between terms extracted from an introductory computer science textbook, with each candidate pair independently labeled by multiple human annotators rather than a single rater."
  - "Inter-annotator agreement on whether one term is a prerequisite of another was moderate, lower than agreement rates reported for simpler labeling tasks, evidence prerequisite judgment carries real subjectivity even among trained annotators reading the same source text."
  - "Disagreement concentrated on term pairs from the same section of the source text, where a co-occurrence relation and a true prerequisite relation are easy to conflate, distinct from clearer disagreement patterns on pairs from distant sections."
research_questions_it_leaves_open:
  - "Whether the same-section conflation pattern this dataset documents also affects Research OS's own `inferred` edge proposals, which score lexical overlap within a single branch rather than across branches."
  - "What agreement rate a Research OS teacher-flag review of prerequisite edges should expect, given this dataset's moderate human-to-human agreement on comparable material."
how_it_bears_on_research_os: >
  Extends overlap map question 3 and `ROUTING.md`'s `inferred` confidence discussion
  with an edge-labeling agreement baseline: if trained human annotators reach only
  moderate agreement on prerequisite judgments, and disagreement concentrates on the
  same-section, co-occurrence-versus-prerequisite conflation `infer-edges.ts`'s own
  Jaccard-overlap method is most exposed to, a reviewer's own disagreement rate on a
  flagged `inferred` edge should not be read as evidence the edge is wrong.
---

# PRET: Prerequisite-Enriched Terminology

Builds a gold-standard, human-annotated dataset of prerequisite relations between
terms from a computer science textbook and finds moderate inter-annotator agreement,
concentrated disagreement on same-section term pairs where co-occurrence and true
prerequisite relations are easy to conflate.

## Key Claims

- The PRET dataset labels prerequisite relations with multiple independent human
  annotators per candidate pair.
- Inter-annotator agreement on prerequisite judgments was moderate, lower than
  typical simpler labeling tasks.
- Disagreement concentrated on same-section term pairs, where co-occurrence and true
  prerequisite relations are easy to conflate.

## Research Questions It Leaves Open

- Whether the same-section conflation pattern affects Research OS's own `inferred`
  edge proposals, which score overlap within a single branch.
- What agreement rate a teacher-flag review should expect given this dataset's
  moderate human-to-human agreement.

## How It Bears on Research OS

Extends overlap map question 3 and `ROUTING.md`'s `inferred` tier discussion with an
edge-labeling agreement baseline: moderate human agreement, concentrated on the same
conflation risk `infer-edges.ts`'s Jaccard method is exposed to.
