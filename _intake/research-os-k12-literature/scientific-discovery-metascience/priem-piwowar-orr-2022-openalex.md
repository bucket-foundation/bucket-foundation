---
title: "OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts"
authors:
  - "Priem, Jason"
  - "Piwowar, Heather"
  - "Orr, Richard"
year: 2022
venue: "arXiv preprint"
doi: "10.48550/arxiv.2205.01833"
url: "https://doi.org/10.48550/arxiv.2205.01833"
openalex_id: "https://openalex.org/W4229010617"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  Describes the scholarly knowledge graph this literature corpus's own papers were
  verified against, and the infrastructure a Research OS ingestion pipeline would draw on
  for citation, author, and venue metadata at scale.
key_claims:
  - "OpenAlex is a fully open, CC0, index of scholarly works, authors, institutions, venues, and concepts, built to replace the discontinued Microsoft Academic Graph as a comprehensively linked bibliographic dataset."
  - "The dataset is built from an aggregation of Crossref, PubMed, ORCID, ROR, and other sources, deduplicated and cross-referenced, rather than a single publisher feed."
  - "Full-dataset snapshots are downloadable and self-hostable, distinguishing OpenAlex from bibliographic databases that only expose a metered API."
research_questions_it_leaves_open:
  - "How to keep a locally ingested slice of OpenAlex current against the live, continuously updated upstream dataset without re-downloading the full snapshot on every refresh."
  - "How OpenAlex's own concept-tagging, used loosely in this corpus's own tier-eligibility gate, compares in precision to a domain-specific taxonomy for a narrow research area."
how_it_bears_on_research_os: >
  Is the metadata backbone the canon-intake pipeline's own quality rubric already depends
  on: OpenAlex concepts, citation counts, and open-access status feed directly into the
  canon_score the Bucket Canon rubric computes, and the same infrastructure a
  production-tier ingestion pipeline for K-12 standards and textbooks would need to
  resolve a citation's own DOI, venue, and open-access status before it can enter a
  student's evidence chain.
---

# OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts

Describes the scholarly knowledge graph this literature corpus's own papers were verified against, and the infrastructure a Research OS ingestion pipeline would draw on for citation, author, and venue metadata at scale.

## Key Claims

- OpenAlex is a fully open, CC0, index of scholarly works, authors, institutions, venues, and concepts, built to replace the discontinued Microsoft Academic Graph as a comprehensively linked bibliographic dataset.
- The dataset is built from an aggregation of Crossref, PubMed, ORCID, ROR, and other sources, deduplicated and cross-referenced, rather than a single publisher feed.
- Full-dataset snapshots are downloadable and self-hostable, distinguishing OpenAlex from bibliographic databases that only expose a metered API.

## Research Questions It Leaves Open

- How to keep a locally ingested slice of OpenAlex current against the live, continuously updated upstream dataset without re-downloading the full snapshot on every refresh.
- How OpenAlex's own concept-tagging, used loosely in this corpus's own tier-eligibility gate, compares in precision to a domain-specific taxonomy for a narrow research area.

## How It Bears on Research OS

Is the metadata backbone the canon-intake pipeline's own quality rubric already depends on: OpenAlex concepts, citation counts, and open-access status feed directly into the canon_score the Bucket Canon rubric computes, and the same infrastructure a production-tier ingestion pipeline for K-12 standards and textbooks would need to resolve a citation's own DOI, venue, and open-access status before it can enter a student's evidence chain.
