---
title: "Fish Oil, Raynaud's Syndrome, and Undiscovered Public Knowledge"
authors:
  - "Swanson, Don R."
year: 1986
venue: "Perspectives in Biology and Medicine"
doi: "10.1353/pbm.1986.0087"
url: "https://doi.org/10.1353/pbm.1986.0087"
openalex_id: "https://openalex.org/W2011726136"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Swanson showed that two disconnected biomedical literatures, one on fish oil's effect on blood
  viscosity and platelet function, the other on Raynaud's syndrome, together implied a treatment
  hypothesis that no single paper stated and that neither literature's authors likely read the
  other to find. He named the phenomenon undiscovered public knowledge and gave literature-based
  discovery its founding case.
key_claims:
  - "Two literatures that never cite each other can jointly imply a testable claim, A affects B and B affects C, therefore C may affect A, that is present in the combined literature but absent from any single publication in it."
  - "The fish-oil and Raynaud's link was built by manual search across the two literatures, and Swanson proposed this A-B-C bridging structure as a general, repeatable search method."
  - "Knowledge that exists in principle, distributed across publications no one has jointly read, stays functionally undiscovered until someone or something performs the cross-literature search."
research_questions_it_leaves_open:
  - "Swanson's method finds candidate hypotheses but leaves the causal validity of the intermediate mechanism (B) for later experimental confirmation, outside the method itself."
  - "The paper leaves open how to scale manual bridging search to the full literature, a problem later literature-based discovery work and automated knowledge graphs took up directly."
how_it_bears_on_research_os: >
  Swanson's A-B-C structure reads as a plain-language description of what Bucket's gap-node
  detection is built to find by machine: a missing edge between two evidence-backed concept
  clusters that, if connected, would produce a testable hypothesis neither source literature
  states outright. It is also a precedent for treating undiscovered public knowledge as its own
  evidence status in the belief-fusion model: a claim whose supporting evidence already exists but
  has not been assembled into a single explicit connection, which matters for how the citation
  graph weighs a hypothesis built by connecting two already-cited sources as its own evidentiary
  path, separate from one resting on a single new evidence item.
---

# Fish Oil, Raynaud's Syndrome, and Undiscovered Public Knowledge

Swanson's paper matters to Bucket Foundation because it names the exact gap the hypothesis
engine's gap-node detection is built to close. He found that the fish-oil literature and the
Raynaud's syndrome literature each contained one half of a testable claim, connected through a
shared intermediate mechanism, without either literature's authors reading across to the other.
That A-B-C bridging structure, a affects b, b affects c, therefore c may affect a, is close to a
manual version of what an automated gap-node detector should surface from a citation graph. It
also gives the belief-fusion model a name for a distinct evidence status: knowledge that already
exists in the literature but has never been assembled into one explicit claim, separate from
knowledge that is missing outright.

Key claims:
- Two literatures with no shared citations can jointly imply a testable claim absent from either one alone.
- Swanson built the fish-oil and Raynaud's link by manual A-B-C bridging search and proposed it as a repeatable method.
- Distributed knowledge stays undiscovered until a cross-literature search assembles it.

Open questions:
- The method proposes a hypothesis; confirming the intermediate mechanism still requires separate experimental work.
- How to scale manual bridging search across the full literature, the problem later automated approaches took up.
