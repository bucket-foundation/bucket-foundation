---
title: "Using Cognitive Psychology to Understand GPT-3"
authors:
  - "Binz, Marcel"
  - "Schulz, Eric"
year: 2023
venue: "Proceedings of the National Academy of Sciences"
doi: "10.1073/pnas.2218523120"
url: "https://doi.org/10.1073/pnas.2218523120"
openalex_id: "https://openalex.org/W4318919287"
branch: "ai-and-researchers"
tier: "canon"
why_it_matters: >
  Runs canonical cognitive-psychology experiments, decision-making, information
  search, reasoning, on GPT-3 itself, treating the model as a subject rather than a
  tool. It is a method precedent for asking whether an AI system's own behavior
  reflects understanding or pattern-matching, the same question `OVERLAP-RESEARCH-OS-
  AND-AI-FOR-RESEARCH.md` question 12 asks about a K-12 production.
key_claims:
  - "GPT-3 matched or exceeded human performance on a multi-armed bandit decision task, balancing exploration and exploitation in a way that tracked known human strategies."
  - "GPT-3 showed systematic reasoning errors on tasks requiring multi-step logical inference, with small changes in problem phrasing producing large changes in accuracy."
  - "The paper argues these results are best explained by GPT-3 having learned surface statistical regularities that mimic certain cognitive strategies without the underlying computational mechanism humans use, a partial match rather than a general one."
research_questions_it_leaves_open:
  - "Whether the same partial-match pattern, strong on some canonical tasks and fragile on others, holds for later, larger models trained differently from GPT-3."
  - "What test would distinguish a model that has learned the surface pattern of a cognitive strategy from one that has learned the strategy itself."
how_it_bears_on_research_os: >
  Supplies a method Research OS's own review layer could borrow: subjecting a
  student's accepted production, or the hypothesis engine's own generator role, to
  a battery of process-level probes rather than a single correctness check, the way
  this paper probes GPT-3 with canonical psychology tasks rather than a single
  benchmark score. Bears on `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` question 12's
  challenge of finding evidence for understanding beyond a pass or fail grade, and on
  `RESEARCH-QUESTIONS.md` Q9's concern about the Check tool abstaining under weak
  retrieval, itself a fragility this paper's phrasing-sensitivity result names as a
  general risk in any single-pass model check.
---

# Using Cognitive Psychology to Understand GPT-3

Runs canonical cognitive-psychology experiments on GPT-3 as a subject: strong,
human-like performance on a decision-making task paired with fragile, phrasing-
sensitive performance on multi-step reasoning.

## Key Claims

- GPT-3 matched or exceeded human performance on a multi-armed bandit decision task,
  tracking known human exploration-exploitation strategies.
- GPT-3 showed reasoning errors on multi-step logical inference, with small phrasing
  changes producing large accuracy swings.
- The pattern is read as GPT-3 having learned surface regularities that mimic some
  cognitive strategies without their underlying mechanism.

## Research Questions It Leaves Open

- Whether the same partial-match pattern holds for larger, differently trained models.
- What test would distinguish a model that learned a strategy's surface pattern from
  one that learned the strategy itself.

## How It Bears on Research OS

Supplies a method Research OS's review layer could borrow: probing a production or the
engine's generator role with a battery of process-level checks rather than one
correctness score, the way this paper probes GPT-3 with canonical tasks rather than a
single benchmark. Bears on the overlap map's question 12 and on `RESEARCH-QUESTIONS.md`
Q9's concern about single-pass model checks.
