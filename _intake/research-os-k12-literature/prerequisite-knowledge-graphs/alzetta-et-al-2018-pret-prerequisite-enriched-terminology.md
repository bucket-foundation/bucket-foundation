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
  rubric scoring into the prerequisite-edge domain. Closest verified match to a
  2019-dated Adorni-authored prerequisite paper named in the task brief, which had
  no resolvable DOI; this 2018 paper carries Adorni as a co-author and covers the
  same prerequisite-annotation ground.
key_claims:
  - "PRET annotates prerequisite relations between concepts extracted from chapter 4 of the textbook Computer Science: An Overview (Brookshear and Brylow, 2015), each pair labelled independently by four annotators of different competence, one of them a quasi-expert."
  - "Agreement was low: Fleiss' kappa across all four annotators was 38.50%, which the authors call fair on the Landis and Koch scale, and pairwise Cohen's kappa ran from 25.35% to 57.80%; many relations were marked by one annotator alone."
  - "Agreement rose with competence: pairs involving the quasi-expert agreed least, the more experienced pairs reached moderate agreement, and one pair reached substantial agreement (63.62%) once cycles were removed and transitive relations added, which raised Fleiss' kappa to 39.94%."
research_questions_it_leaves_open:
  - "Whether competence effects like PRET's apply to the reviewers of Research OS edge proposals, and how many reviewers a disputed pair needs."
  - "What agreement rate a Research OS review of prerequisite edges should expect, given this dataset's fair human-to-human agreement on comparable material."
how_it_bears_on_research_os: >
  Gives an edge-labelling agreement baseline for overlap map question 3,
  `ROUTING.md`'s `inferred` confidence discussion, and the decompose-further
  queue (learning/research-os/PRIMES.md): trained annotators reach only fair
  agreement on prerequisite judgments, so a model pair's agreement is read
  against that baseline, and a reviewer's disagreement with a proposed edge is
  one judgment among several.
---

# PRET: Prerequisite-Enriched Terminology

Builds a gold-standard, human-annotated dataset of prerequisite relations between
concepts from chapter 4 of a computer science textbook, labelled by four annotators
of different competence, and finds fair agreement between them.

## Key Claims

- PRET labels prerequisite relations between concepts extracted from chapter 4 of
  Computer Science: An Overview (Brookshear and Brylow, 2015), with four annotators
  labelling every pair independently.
- Fleiss' kappa across the four annotators was 38.50%, fair on the Landis and Koch
  scale; pairwise Cohen's kappa ran from 25.35% to 57.80%, and many relations were
  marked by one annotator alone.
- Agreement rose with competence: pairs with the quasi-expert annotator agreed least,
  the more experienced pairs reached moderate agreement, and one pair reached
  substantial agreement (63.62%) once cycles were removed and transitive relations added.

## Research Questions It Leaves Open

- Whether competence effects like PRET's apply to the reviewers of Research OS edge
  proposals, and how many reviewers a disputed pair needs.
- What agreement rate a Research OS review of prerequisite edges should expect,
  given fair human-to-human agreement on comparable material.

## How It Bears on Research OS

Gives an edge-labelling agreement baseline for overlap map question 3, `ROUTING.md`'s
`inferred` tier discussion, and the decompose-further queue
(learning/research-os/PRIMES.md): trained annotators reach fair agreement on
prerequisite judgments, so a model pair's agreement is read against that baseline,
and a reviewer's disagreement with a proposed edge is one judgment among several.

Corrected 2026-09-18: an earlier version of this card said agreement was moderate and
that disagreement concentrated on same-section pairs; the paper reports fair
agreement and has no same-section finding.
