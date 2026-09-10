---
title: "Guidelines for Human-AI Interaction"
authors:
  - "Amershi, Saleema"
  - "Weld, Daniel"
  - "Vorvoreanu, Mihaela"
  - "Fourney, Adam"
  - "Nushi, Besmira"
  - "Collisson, Penny"
  - "Suh, Jina"
  - "Iqbal, Shamsi"
  - "Bennett, Paul N."
  - "Inkpen, Kori"
  - "Teevan, Jaime"
  - "Kikin-Gil, Ruth"
  - "Horvitz, Eric"
year: 2019
venue: "Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems"
doi: "10.1145/3290605.3300233"
url: "https://doi.org/10.1145/3290605.3300233"
openalex_id: "https://openalex.org/W2916904544"
branch: "hci-human-ai-collaboration"
tier: "canon"
why_it_matters: >
  Distills eighteen validated guidelines for AI-infused interfaces, drawn from decades
  of design guidance and tested against real products, into single-sentence rules.
  Several map directly onto what the four-tool workspace should do, or should be
  checked against, at each stage of a student's interaction with it.
key_claims:
  - "The guidelines were derived by consolidating over one hundred design recommendations from existing HCI literature and industry sources, then filtering the set against usability heuristics and testing candidate guidelines with practicing designers."
  - "Several guidelines target the moment an AI system is wrong: make clear how well the system can do what it can do, support efficient dismissal or correction, and scope services when in doubt rather than presenting an overconfident result."
  - "Guidelines are organized by when they apply, at first interaction, during ongoing use, when the system is wrong, and over time, rather than as one undifferentiated checklist."
research_questions_it_leaves_open:
  - "Which of the eighteen guidelines the current Locate, Quote, Check, and Organize implementations already satisfy, and which remain unaudited."
  - "How a scope-services-when-in-doubt guideline should translate for Check's own abstain path, named in `RESEARCH-QUESTIONS.md` Q9, when retrieval evidence is weak."
how_it_bears_on_research_os: >
  Extends overlap map question 1: these are concrete, testable design rules for the
  same constrained-AI-surface question the testbed is built to answer, and the
  when-the-system-is-wrong guidelines bear directly on `RESEARCH-QUESTIONS.md` Q9's
  abstain-path question, giving Check's own abstain behavior a named design pattern,
  scope services when in doubt, to be checked against rather than designed from
  scratch.
---

# Guidelines for Human-AI Interaction

Distills eighteen validated, testable guidelines for AI-infused interfaces from
existing HCI literature and industry practice, organized by when in an interaction
each guideline applies.

## Key Claims

- The guidelines consolidate over one hundred existing recommendations, filtered
  against usability heuristics and tested with practicing designers.
- Several target the moment a system is wrong: show what the system can do, support
  efficient correction, and scope services down when in doubt.
- Guidelines are organized by interaction phase, first use, ongoing use, error, and
  over time, rather than as one flat checklist.

## Research Questions It Leaves Open

- Which of the eighteen guidelines the current four workspace tools already satisfy.
- How the scope-services-when-in-doubt guideline should translate for Check's own
  abstain path.

## How It Bears on Research OS

Extends overlap map question 1 with testable design rules for the same constrained-AI
question the testbed answers, and the error-handling guidelines bear directly on
`RESEARCH-QUESTIONS.md` Q9's abstain-path question.
