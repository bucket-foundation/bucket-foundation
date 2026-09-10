---
title: "Autonomous chemical research with large language models"
authors:
  - "Boiko, Daniil A."
  - "MacKnight, Robert"
  - "Kline, Ben"
  - "Gomes, Gabe"
year: 2023
venue: "Nature"
doi: "10.1038/s41586-023-06792-0"
url: "https://doi.org/10.1038/s41586-023-06792-0"
openalex_id: null
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  A demonstrated closed-loop system where an LLM plans, executes through robotic lab
  automation and web tool use, and interprets a real chemistry experiment, the clearest
  existing case of an AI system running the generate-test-revise loop the hypothesis
  engine only runs on textual and numeric evidence.
key_claims:
  - "Coscientist, built on GPT-4 with tool access including internet search, code execution, robotic lab hardware control, and access to other AI models as sub-tools, planned and executed real chemical syntheses, including optimizing a palladium-catalyzed cross-coupling reaction through autonomous experimentation."
  - "The system's errors were dominated by tool-use and planning failures rather than chemistry knowledge gaps, a finding that reframes reliability as an agentic-tool-use problem more than a domain-knowledge problem."
  - "Human oversight was present throughout, safety review and hardware supervision, and the paper is explicit that full autonomy was not demonstrated."
research_questions_it_leaves_open:
  - "Whether the tool-use failure modes documented here are the same class of failure the hypothesis engine's own Quote tool's span-anchoring is built to prevent for textual evidence, or a distinct hardware-and-procedure failure mode."
  - "How to price the safety review and human-oversight cost this system still required against the throughput gain claimed, an accounting the paper does not fully provide."
how_it_bears_on_research_os: >
  Is the physical-lab counterpart to the constrained find/quote/check/organize tool
  surface: Coscientist's dominant failure mode, tool-use and planning error rather than
  domain-knowledge error, is the same class of risk the Research OS design addresses by
  keeping Locate and Quote as retrieval-only, no-model-call operations and by never
  letting Check or Organize initiate an action outside the sandboxed workspace.
---

# Autonomous chemical research with large language models

A demonstrated closed-loop system where an LLM plans, executes through robotic lab automation and web tool use, and interprets a real chemistry experiment, the clearest existing case of an AI system running the generate-test-revise loop the hypothesis engine only runs on textual and numeric evidence.

## Key Claims

- Coscientist, built on GPT-4 with tool access including internet search, code execution, robotic lab hardware control, and access to other AI models as sub-tools, planned and executed real chemical syntheses, including optimizing a palladium-catalyzed cross-coupling reaction through autonomous experimentation.
- The system's errors were dominated by tool-use and planning failures rather than chemistry knowledge gaps, a finding that reframes reliability as an agentic-tool-use problem more than a domain-knowledge problem.
- Human oversight was present throughout, safety review and hardware supervision, and the paper is explicit that full autonomy was not demonstrated.

## Research Questions It Leaves Open

- Whether the tool-use failure modes documented here are the same class of failure the hypothesis engine's own Quote tool's span-anchoring is built to prevent for textual evidence, or a distinct hardware-and-procedure failure mode.
- How to price the safety review and human-oversight cost this system still required against the throughput gain claimed, an accounting the paper does not fully provide.

## How It Bears on Research OS

Is the physical-lab counterpart to the constrained find/quote/check/organize tool surface: Coscientist's dominant failure mode, tool-use and planning error rather than domain-knowledge error, is the same class of risk the Research OS design addresses by keeping Locate and Quote as retrieval-only, no-model-call operations and by never letting Check or Organize initiate an action outside the sandboxed workspace.
