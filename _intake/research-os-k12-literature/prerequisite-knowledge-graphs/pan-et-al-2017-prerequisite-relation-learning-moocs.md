---
title: "Prerequisite Relation Learning for Concepts in MOOCs"
authors:
  - "Pan, Liangming"
  - "Li, Chengjiang"
  - "Li, Juanzi"
  - "Tang, Jie"
year: 2017
venue: "Proceedings of the 55th Annual Meeting of the Association for Computational Linguistics"
doi: "10.18653/v1/p17-1133"
url: "https://doi.org/10.18653/v1/p17-1133"
openalex_id: "https://openalex.org/W2739893466"
branch: "prerequisite-knowledge-graphs"
tier: "canon"
why_it_matters: >
  One of the founding papers automatically inferring prerequisite edges between
  concepts from course text rather than from a hand-built curriculum, using both
  content features and behavioral signals from how learners move through a course.
  Research OS's `graph.edge` prerequisite kind is a curated, hand-reviewed version of
  exactly the relation this paper learns automatically.
key_claims:
  - "The paper frames prerequisite detection as a link-prediction problem over a concept graph extracted from course text, combining content-based features (co-occurrence, definition patterns) with context-based features (the order concepts appear across a course sequence)."
  - "A latent-variable model, treating a course's own concept ordering as a weak supervision signal, outperformed purely content-based baselines on a MOOC dataset the authors released alongside the paper."
  - "The model generalized across subject domains within the dataset without domain-specific tuning, a design goal for any system meant to cover multiple K-12 subjects."
research_questions_it_leaves_open:
  - "Whether prerequisite edges learned from course-ordering signals match the prerequisite edges a domain expert would hand-author, or only the edges a given course's syllabus happened to use."
  - "How well the method transfers from college-level MOOC text to K-12 reading levels and vocabulary."
how_it_bears_on_research_os: >
  Names a concrete alternative, or a validation check, for how Research OS's own
  `graph.edge` prerequisite kind gets built: rather than relying only on curated,
  hand-authored edges, a Pan-style model could flag candidate prerequisite pairs from
  the corpus a class already reads, for a human editor to accept or reject before they
  enter `graph.prereq_ancestor`'s backward closure. This bears on the frontier-backward
  routing question the overlap map's question 3 names, since a wrong prerequisite edge
  would mis-route every student who reaches it. Not yet posed as a numbered question in
  `RESEARCH-QUESTIONS.md`; closest neighbor is Q5 on routing.
---

# Prerequisite Relation Learning for Concepts in MOOCs

A link-prediction model inferring prerequisite edges between course concepts from
content features and from the order concepts appear across a MOOC, rather than from a
hand-built curriculum.

## Key Claims

- Frames prerequisite detection as link prediction over a concept graph, combining
  content features with course-ordering signals.
- A latent-variable model using course ordering as weak supervision outperformed
  content-only baselines on a released MOOC dataset.
- The model generalized across subject domains within the dataset without
  domain-specific tuning.

## Research Questions It Leaves Open

- Whether learned edges match expert-authored prerequisites or only a given course's
  own syllabus order.
- How well the method transfers from college-level MOOC text to K-12 reading levels.

## How It Bears on Research OS

Names a candidate validation check for `graph.edge`'s prerequisite kind: a Pan-style
model could flag candidate edges from a class's own corpus for a human editor to accept
or reject before they enter `graph.prereq_ancestor`'s backward closure, since a wrong
edge would mis-route every student who reaches it. Bears on the overlap map's question
3 on frontier-backward routing.
