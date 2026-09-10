---
title: "The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery"
authors:
  - "Lu, Chris"
  - "Lu, Cong"
  - "Lange, Robert Tjarko"
  - "Foerster, Jakob"
  - "Clune, Jeff"
  - "Ha, David"
year: 2024
venue: "arXiv preprint"
doi: "10.48550/arxiv.2408.06292"
url: "https://doi.org/10.48550/arxiv.2408.06292"
openalex_id: "https://openalex.org/W4402952666"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  A fully automated, end-to-end attempt at the entire research pipeline, idea generation
  through experiment through paper writing through self-review, the most direct existing
  precedent for what an unsupervised extension of the hypothesis engine's own pipeline
  would look like.
key_claims:
  - "The AI Scientist system generates a research idea, writes and runs code implementing an experiment, analyzes the results, and drafts a full paper describing the work, with an automated LLM-based review step assessing the paper before acceptance into an output set."
  - "The system successfully produced complete, internally consistent papers on machine-learning topics at a cost the authors estimate near fifteen dollars per paper, several orders of magnitude below a human researcher's own cost per publication."
  - "The authors report significant failure modes, including the system occasionally fabricating or misreporting experimental results, and are explicit that human oversight is necessary before any output is treated as a real contribution."
research_questions_it_leaves_open:
  - "How to detect fabricated or misreported results automatically, a safety problem the paper names without solving, and one that maps closely onto the hypothesis engine's own referee and self-report design intent."
  - "Whether a fully automated pipeline that occasionally fabricates results is safe to deploy anywhere a real, citable claim is required, the exact line the Bucket Foundation canon-intake rubric draws with its E1 through E9 eligibility gate."
how_it_bears_on_research_os: >
  Is the cautionary counterpoint the hypothesis engine's own design already answers
  differently: where the AI Scientist's end-to-end loop can fabricate a result inside its
  own self-review, hte.roles.self_report writes an explicit missing-mass estimate and a
  target-blind check rather than a self-certifying accept-or-reject verdict, and the
  engine's own referee and publish steps keep a human-reviewable run directory at every
  stage rather than only a finished paper.
---

# The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery

A fully automated, end-to-end attempt at the entire research pipeline, idea generation through experiment through paper writing through self-review, the most direct existing precedent for what an unsupervised extension of the hypothesis engine's own pipeline would look like.

## Key Claims

- The AI Scientist system generates a research idea, writes and runs code implementing an experiment, analyzes the results, and drafts a full paper describing the work, with an automated LLM-based review step assessing the paper before acceptance into an output set.
- The system successfully produced complete, internally consistent papers on machine-learning topics at a cost the authors estimate near fifteen dollars per paper, several orders of magnitude below a human researcher's own cost per publication.
- The authors report significant failure modes, including the system occasionally fabricating or misreporting experimental results, and are explicit that human oversight is necessary before any output is treated as a real contribution.

## Research Questions It Leaves Open

- How to detect fabricated or misreported results automatically, a safety problem the paper names without solving, and one that maps closely onto the hypothesis engine's own referee and self-report design intent.
- Whether a fully automated pipeline that occasionally fabricates results is safe to deploy anywhere a real, citable claim is required, the exact line the Bucket Foundation canon-intake rubric draws with its E1 through E9 eligibility gate.

## How It Bears on Research OS

Is the cautionary counterpoint the hypothesis engine's own design already answers differently: where the AI Scientist's end-to-end loop can fabricate a result inside its own self-review, hte.roles.self_report writes an explicit missing-mass estimate and a target-blind check rather than a self-certifying accept-or-reject verdict, and the engine's own referee and publish steps keep a human-reviewable run directory at every stage rather than only a finished paper.
