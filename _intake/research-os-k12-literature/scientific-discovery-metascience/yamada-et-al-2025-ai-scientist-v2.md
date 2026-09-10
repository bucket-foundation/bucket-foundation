---
title: "The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search"
authors:
  - "Yamada, Yutaro"
  - "Lange, Robert Tjarko"
  - "Lu, Cong"
  - "Hu, Shengran"
  - "Lu, Chris"
  - "Foerster, Jakob"
  - "Clune, Jeff"
  - "Ha, David"
year: 2025
venue: "arXiv preprint"
doi: "10.48550/arxiv.2504.08066"
url: "https://doi.org/10.48550/arxiv.2504.08066"
openalex_id: "https://openalex.org/W4414827381"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  The successor to Lu and colleagues (2024)'s AI Scientist, replacing a linear
  pipeline with an agentic tree search over experiment variations, and reporting the
  first fully AI-generated paper accepted at a peer-reviewed workshop. It sharpens the
  novelty-and-testability bar `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` question 4
  asks about, since acceptance by human reviewers is a harder bar than the original
  AI Scientist's own automated review step.
key_claims:
  - "The system replaces the original AI Scientist's fixed idea-to-paper pipeline with a tree search over experiment variations, exploring and pruning branches based on intermediate results rather than committing to one experimental path."
  - "One paper produced by the system was submitted to a peer-reviewed ICLR workshop and accepted, the paper's own headline result, though the authors disclose the paper was flagged for human co-author disclosure per workshop policy after acceptance."
  - "The paper reports the system still requires human-selected research topics and human-set experiment budgets, and does not claim end-to-end autonomy from open research question to publication."
research_questions_it_leaves_open:
  - "Whether workshop-level acceptance by human reviewers is evidence of research quality comparable to a full journal peer-review process, or a lower bar the paper's own design targeted."
  - "How the tree-search approach's exploration cost scales as the space of possible experiments grows beyond the machine-learning benchmarks the paper tests on."
how_it_bears_on_research_os: >
  Raises the bar `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` question 4 sets for a
  K-12 production's novelty and testability: passing a constrained AI Check tool is a
  weaker bar than passing human peer review, which is itself the bar this paper claims
  to have cleared once. A K-12 production reaching `accepted` status under a teacher's
  review sits closer to this paper's workshop-acceptance case than to the original
  AI Scientist's self-review case, useful context for calibrating how much weight
  `docs/PRODUCTION-SCHEMA.md`'s review ladder should carry. Extends `RESEARCH-
  QUESTIONS.md` Q21.
---

# The AI Scientist-v2

An agentic tree-search successor to the original AI Scientist, exploring and pruning
experiment variations rather than committing to a fixed pipeline, reporting one paper
accepted at a peer-reviewed ICLR workshop.

## Key Claims

- Replaces a fixed pipeline with tree search over experiment variations, pruning
  branches based on intermediate results.
- One system-produced paper was submitted to and accepted at a peer-reviewed
  workshop, disclosed for human co-author policy after acceptance.
- The system still requires human-selected topics and human-set experiment budgets,
  short of full end-to-end autonomy.

## Research Questions It Leaves Open

- Whether workshop acceptance is comparable evidence of quality to full journal peer
  review.
- How tree-search exploration cost scales beyond the machine-learning benchmarks
  tested.

## How It Bears on Research OS

Raises the novelty-and-testability bar named in the overlap map's question 4: passing
the Check tool is weaker than passing human peer review, the bar this paper claims to
clear once. A K-12 production accepted under teacher review sits closer to this
paper's workshop case than to the original AI Scientist's self-review case. Extends
`RESEARCH-QUESTIONS.md` Q21.
