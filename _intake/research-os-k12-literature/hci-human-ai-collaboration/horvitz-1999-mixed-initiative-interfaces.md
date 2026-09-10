---
title: "Principles of mixed-initiative user interfaces"
authors:
  - "Horvitz, Eric"
year: 1999
venue: "Proceedings of the SIGCHI conference on Human factors in computing systems the CHI is the limit - CHI '99"
doi: "10.1145/302979.303030"
url: "https://doi.org/10.1145/302979.303030"
openalex_id: "https://openalex.org/W2059216172"
branch: "hci-human-ai-collaboration"
tier: "canon"
why_it_matters: >
  The foundational design vocabulary for deciding when a system should act on its own
  initiative versus wait for the user, directly relevant to the diagnostic probe
  (system-initiated) versus the free-text target query (user-initiated) split in
  frontier-backward routing.
key_claims:
  - "A mixed-initiative interface balances automated services with direct user control, guided by principles including considering user goals, developing significant value under uncertainty about those goals, and employing socially appropriate ways to negotiate whose turn it is to act."
  - "The expected cost of poor timing, interrupting at the wrong moment or failing to act when needed, should factor into whether and when a system takes initiative, beyond whether the system could act."
  - "Providing a mechanism for efficient agent-user collaboration to refine results, rather than a single automated action, improves outcomes over either pure automation or pure manual control."
research_questions_it_leaves_open:
  - "How to set the expected-cost-of-poor-timing threshold for a system used by children, where interruption cost and benefit are less studied than in the adult productivity contexts these principles were developed for."
  - "Whether the same mixed-initiative principles apply to a graph-navigation and diagnostic-probing context, distinct from the document and calendar assistants the original work focuses on."
how_it_bears_on_research_os: >
  Supplies the design vocabulary for the frontier-backward routing algorithm's own
  cold-start handling: the diagnostic probe against the top-five candidate boundary nodes
  is a system-initiative action taken under uncertainty about the learner's prior
  knowledge, and the principle of weighing the cost of a wrong or poorly timed initiative
  against the cost of doing nothing applies directly to deciding when that probe should
  fire versus when a returning learner's cached frontier should be trusted instead.
---

# Principles of mixed-initiative user interfaces

The foundational design vocabulary for deciding when a system should act on its own initiative versus wait for the user, directly relevant to the diagnostic probe (system-initiated) versus the free-text target query (user-initiated) split in frontier-backward routing.

## Key Claims

- A mixed-initiative interface balances automated services with direct user control, guided by principles including considering user goals, developing significant value under uncertainty about those goals, and employing socially appropriate ways to negotiate whose turn it is to act.
- The expected cost of poor timing, interrupting at the wrong moment or failing to act when needed, should factor into whether and when a system takes initiative, beyond whether the system could act.
- Providing a mechanism for efficient agent-user collaboration to refine results, rather than a single automated action, improves outcomes over either pure automation or pure manual control.

## Research Questions It Leaves Open

- How to set the expected-cost-of-poor-timing threshold for a system used by children, where interruption cost and benefit are less studied than in the adult productivity contexts these principles were developed for.
- Whether the same mixed-initiative principles apply to a graph-navigation and diagnostic-probing context, distinct from the document and calendar assistants the original work focuses on.

## How It Bears on Research OS

Supplies the design vocabulary for the frontier-backward routing algorithm's own cold-start handling: the diagnostic probe against the top-five candidate boundary nodes is a system-initiative action taken under uncertainty about the learner's prior knowledge, and the principle of weighing the cost of a wrong or poorly timed initiative against the cost of doing nothing applies directly to deciding when that probe should fire versus when a returning learner's cached frontier should be trusted instead.
