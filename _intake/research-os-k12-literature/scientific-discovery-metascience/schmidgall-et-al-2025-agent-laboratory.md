---
title: "Agent Laboratory: Using LLM Agents as Research Assistants"
authors:
  - "Schmidgall, Samuel"
  - "Su, Yusheng"
  - "Wang, Ze"
  - "Sun, Ximeng"
  - "Wu, Jialian"
  - "Yu, Xiaodong"
  - "Liu, Jiang"
  - "Moor, Michael"
  - "Liu, Zicheng"
  - "Barsoum, Emad"
year: 2025
venue: "Findings of the Association for Computational Linguistics: EMNLP 2025"
doi: "10.18653/v1/2025.findings-emnlp.320"
url: "https://doi.org/10.18653/v1/2025.findings-emnlp.320"
openalex_id: "https://openalex.org/W4416035220"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Frames its LLM-agent pipeline explicitly as a research assistant working alongside
  a human researcher who sets the direction, rather than an autonomous scientist, the
  same division of labor `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` question 10
  asks Research OS to hold constant across all five learner states.
key_claims:
  - "The system divides a research workflow into literature review, experimentation, and report-writing stages, with a human able to provide feedback at each stage rather than only at the end."
  - "Human feedback at intermediate stages, rather than only a final review, measurably improved the quality of the system's own output relative to a no-feedback condition, in the paper's own ablation."
  - "The paper reports a substantial reduction in research cost relative to an estimated human-only baseline, while stating explicitly that the system is designed to assist rather than replace a human researcher's judgment."
research_questions_it_leaves_open:
  - "What the minimum effective dose of human feedback is, how often and at which stages a human must intervene for the quality gain to hold."
  - "Whether the assistant framing holds under pressure to reduce human involvement further for cost reasons, a tension the paper names but does not resolve."
how_it_bears_on_research_os: >
  Is a working precedent for `PLAN.md` §5's own claim that the generator role never
  belongs in a student workspace: this system keeps a human in the loop at every
  stage by design, the same constraint Research OS's four-tool workspace enforces by
  construction rather than by policy. Its finding that intermediate-stage feedback
  beats end-only review supports Research OS's own teacher-review-at-Production
  design over a model where a teacher only sees a finished claim. Extends `OVERLAP-
  RESEARCH-OS-AND-AI-FOR-RESEARCH.md` question 10.
---

# Agent Laboratory

An LLM-agent pipeline for literature review, experimentation, and report writing,
explicitly framed as a research assistant taking human feedback at each stage rather
than an autonomous system, with feedback shown to improve output quality.

## Key Claims

- The workflow divides into literature review, experimentation, and report-writing
  stages, with human feedback available at each.
- Intermediate-stage human feedback measurably improved output quality relative to a
  no-feedback ablation.
- The system reduced research cost relative to an estimated human-only baseline while
  stated as an assistant, not a replacement for human judgment.

## Research Questions It Leaves Open

- What minimum dose of human feedback, how often and at which stages, sustains the
  quality gain.
- Whether the assistant framing holds under pressure to reduce human involvement
  further.

## How It Bears on Research OS

Is a working precedent for keeping the generator role out of a student workspace by
construction, the same choice `PLAN.md` §5 makes for Research OS's four-tool
workspace. Its finding that intermediate feedback beats end-only review supports
teacher review sited at Production rather than only at a finished claim. Extends the
overlap map's question 10.
