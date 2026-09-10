---
title: "Collective credit allocation in science"
authors:
  - "Shen, Hua-Wei"
  - "Barabási, Albert-László"
year: 2014
venue: "Proceedings of the National Academy of Sciences"
doi: "10.1073/pnas.1401992111"
url: "https://doi.org/10.1073/pnas.1401992111"
openalex_id: "https://openalex.org/W2037997493"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Shen and Barabasi built an algorithm that infers how credit for a multi-author paper is
  distributed among its coauthors, using each coauthor's own citation pattern after publication
  as the signal. It gives Bucket's citation graph a tested, quantitative method for splitting
  credit on a jointly authored work instead of treating authorship as an equal or purely
  order-based split.
key_claims:
  - "The paper models how credit for a coauthored paper is distributed among coauthors, inferred from each coauthor's independent citation history instead of assumed from equal split or author order."
  - "The inferred credit-allocation algorithm, tested across several disciplines, predicts which coauthor is remembered as the paper's primary contributor better than raw author position does."
  - "Collective credit allocation follows regular, discipline-dependent patterns that can be modeled and predicted, rather than varying at random."
research_questions_it_leaves_open:
  - "The method infers credit from citation and co-citation patterns after the fact, and the paper leaves open how to allocate credit for a new work before it has accumulated enough citation history to run the same inference."
  - "It leaves open how the model should treat contributions not captured by co-authorship at all, such as a non-author's software, dataset, or prior public claim that a later paper builds on without listing them as an author."
how_it_bears_on_research_os: >
  This paper is a working precedent for the credit-splitting logic the x402
  pay-once-cite-forever rail needs whenever a citation traces back to more than one contributor: a
  jointly authored canon entry, an engine-generated hypothesis with multiple evidence sources, or
  a K-12 production with a teacher reviewer and a student author who should not receive an
  identical split by default. Its finding that a discipline's citation pattern predicts collective
  credit better than authorship order also argues for computing payment splits from the graph
  structure itself, which fits how Bucket already tracks provenance through cited evidence instead
  of through a flat author list.
---

# Collective credit allocation in science

This paper matters to Bucket Foundation because it works out, with real data, exactly the problem
the x402 pay-once-cite-forever rail has to solve every time a citation traces back to more than
one contributor. Shen and Barabasi infer each coauthor's real share of credit from how the wider
field cites that author's other work after the paper comes out, and show the resulting split
predicts who the field remembers as the paper's primary contributor better than author order does.
That is a template for splitting a citation payment across a jointly authored canon entry, a
multi-source engine hypothesis, or a K-12 production with both a student author and a teacher
reviewer, computed from graph structure rather than assumed from a fixed rule.

Key claims:
- Coauthor credit is inferred from each author's own citation pattern instead of assumed from equal split or byline order.
- The inferred split predicts perceived primary authorship better than author position across several disciplines tested.
- Credit allocation follows regular, discipline-dependent patterns rather than random variation.

Open questions:
- How to allocate credit for a new paper before it has built up enough citation history for the method to work.
- How to credit contributions, software, data, prior claims, that never appear as a byline at all.
