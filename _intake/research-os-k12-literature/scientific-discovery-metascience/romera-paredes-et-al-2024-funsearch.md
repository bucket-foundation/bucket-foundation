---
title: "Mathematical discoveries from program search with large language models"
authors:
  - "Romera-Paredes, Bernardino"
  - "Barekatain, Mohammadamin"
  - "Novikov, Alexander"
  - "Balog, Matej"
  - "Kumar, M. Pawan"
  - "Dupont, Emilien"
  - "Ruiz, Francisco J. R."
  - "Ellenberg, Jordan S."
  - "Wang, Pengming"
  - "Fawzi, Omar"
  - "Kohli, Pushmeet"
  - "Fawzi, Alhussein"
year: 2024
venue: "Nature"
doi: "10.1038/s41586-023-06924-6"
url: "https://doi.org/10.1038/s41586-023-06924-6"
openalex_id: null
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  A demonstrated case of an LLM-plus-search system finding a new mathematical
  construction, beyond recombining known results, the closest existing precedent for
  whether the hypothesis engine's own combinatorial generation-plus-tournament loop could,
  in principle, surface a novel finding rather than only rank known claims.
key_claims:
  - "FunSearch pairs a large language model that proposes candidate programs with an automated evaluator that scores them against a target function, iterating in an evolutionary loop; it found new constructions for the cap set problem that improved on the best previously known bounds."
  - "The system requires a problem that can be phrased as searching for a program to maximize a score with a checkable evaluator, a narrower class of problems than open scientific hypothesis generation."
  - "Human oversight remained in the loop for problem framing and evaluator design, though not for the search or the final construction itself."
research_questions_it_leaves_open:
  - "How far the method generalizes beyond problems with a clean, automatically checkable score, the condition most open scientific questions do not satisfy."
  - "Whether the method's discoveries constitute real mathematical insight or an efficient search over a space a human already structured, a question about the locus of creativity the paper itself does not resolve."
how_it_bears_on_research_os: >
  Is a direct existence proof for the class of claim the AI-and-researchers literature
  keeps asking about in the abstract: whether an AI-generated result can be both novel and
  checkable. The hypothesis engine's own gap-node queue, naming an unfilled cell or an
  unresolved mechanism as a priced target, is a much looser analog of FunSearch's
  checkable evaluator, and the comparison sharpens what the engine would need, a tighter,
  automatically scoreable objective, to move from ranking existing evidence toward
  proposing a new, checkable claim.
---

# Mathematical discoveries from program search with large language models

A demonstrated case of an LLM-plus-search system finding a new mathematical construction, beyond recombining known results, the closest existing precedent for whether the hypothesis engine's own combinatorial generation-plus-tournament loop could, in principle, surface a novel finding rather than only rank known claims.

## Key Claims

- FunSearch pairs a large language model that proposes candidate programs with an automated evaluator that scores them against a target function, iterating in an evolutionary loop; it found new constructions for the cap set problem that improved on the best previously known bounds.
- The system requires a problem that can be phrased as searching for a program to maximize a score with a checkable evaluator, a narrower class of problems than open scientific hypothesis generation.
- Human oversight remained in the loop for problem framing and evaluator design, though not for the search or the final construction itself.

## Research Questions It Leaves Open

- How far the method generalizes beyond problems with a clean, automatically checkable score, the condition most open scientific questions do not satisfy.
- Whether the method's discoveries constitute real mathematical insight or an efficient search over a space a human already structured, a question about the locus of creativity the paper itself does not resolve.

## How It Bears on Research OS

Is a direct existence proof for the class of claim the AI-and-researchers literature keeps asking about in the abstract: whether an AI-generated result can be both novel and checkable. The hypothesis engine's own gap-node queue, naming an unfilled cell or an unresolved mechanism as a priced target, is a much looser analog of FunSearch's checkable evaluator, and the comparison sharpens what the engine would need, a tighter, automatically scoreable objective, to move from ranking existing evidence toward proposing a new, checkable claim.
