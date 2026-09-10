---
title: "OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts"
authors:
  - "Priem, Jason"
  - "Piwowar, Heather"
  - "Orr, Richard"
year: 2022
venue: "arXiv preprint"
doi: "10.48550/arXiv.2205.01833"
url: "https://doi.org/10.48550/arXiv.2205.01833"
openalex_id: "https://openalex.org/W4229010617"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  This paper documents OpenAlex, a free, fully open replacement for Microsoft Academic Graph that
  models scholarly output as a linked graph of works, authors, venues, institutions, and
  automatically classified concepts. It is the kind of open scholarly knowledge graph a
  citation-graph platform like Bucket can query, extend, and check claims against instead of
  building the same infrastructure from scratch.
key_claims:
  - "OpenAlex models the scholarly record as a graph of typed, disambiguated entities (works, authors, institutions, venues, concepts) connected by typed relationships (authorship, citation, affiliation)."
  - "The full dataset carries an open license and is served through a public REST API and a bulk data dump, removing the access restrictions that limited options once Microsoft Academic Graph was retired."
  - "Concepts are assigned to works by an automated classifier trained on a hierarchical taxonomy, giving the graph a machine-generated topic layer alongside its author and citation structure."
research_questions_it_leaves_open:
  - "The paper reports the classifier's concept assignment as a design choice and leaves open how accurate that automated tagging is at the level of a narrow subfield, which matters for anyone using OpenAlex concepts to route work rather than only to browse it."
  - "Author and institution disambiguation is named as an ongoing, unsolved problem, so a system built on OpenAlex identities inherits whatever disambiguation error the underlying graph carries at query time."
how_it_bears_on_research_os: >
  OpenAlex is a candidate backbone or cross-check layer for Bucket's own citation graph: a live,
  queryable, open reference for whether a work exists, who wrote it, and what already cites it,
  useful as an independent check on provenance claims flowing through the x402
  pay-once-cite-forever rail before a citation triggers a payment. Its concept taxonomy is also a
  plausible seed vocabulary for the hypothesis engine's ACTOR, ACTION, OBJECT, PLACE, MECHANISM,
  TIME concept slots, since OpenAlex already keeps a versioned classification of scientific
  concepts the engine would otherwise have to build and keep current on its own.
---

# OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts

OpenAlex matters to Bucket Foundation as an off-the-shelf scholarly knowledge graph the citation
graph and hypothesis engine can check against rather than rebuild. It models the record as typed
entities, works, authors, institutions, venues, concepts, connected by typed relationships,
served free through an API and a full data dump. That structure is close to a public reference
copy of the provenance graph Bucket's own x402 pay-once-cite-forever rail needs to settle
citations against: does the cited work exist, who wrote it, what already cites it. Its automated
concept taxonomy is also a candidate seed vocabulary for the hypothesis engine's concept slots,
since it is a maintained classification the engine would otherwise have to build on its own. This
work is a preprint rather than a peer-reviewed paper, so it carries a candidate tier here rather
than canon.

Key claims:
- Models scholarly output as typed, disambiguated entities connected by typed relationships instead of a flat bibliography.
- Open license, public API, and bulk data dump remove the access limits that followed once Microsoft Academic Graph was retired.
- An automated classifier assigns concepts to works from a hierarchical taxonomy, adding a machine-generated topic layer to the graph.

Open questions:
- How accurate the automated concept classifier is at the level of a narrow subfield.
- How much disambiguation error in author and institution identity a downstream system inherits from the underlying graph.
