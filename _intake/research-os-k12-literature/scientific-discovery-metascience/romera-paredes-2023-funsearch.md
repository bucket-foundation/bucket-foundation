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
year: 2023
venue: "Nature"
doi: "10.1038/s41586-023-06924-6"
url: "https://doi.org/10.1038/s41586-023-06924-6"
openalex_id: "https://openalex.org/W4389727268"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  FunSearch pairs a large language model that proposes candidate programs with an automated
  evaluator that scores them against a mathematical objective, and used the loop to find a new
  construction in combinatorics and improved heuristics for bin packing. It is a working case of
  an LLM system producing a result a domain expert accepts as an addition to the mathematical
  record, checked by code rather than by the model's own confidence.
key_claims:
  - "Pairing a pretrained language model with an automated program-search-and-evaluate loop can discover new mathematical constructions."
  - "The discovered cap-set construction improved the best known lower bound for a long-open combinatorics problem, a result checked independently of the model that proposed it."
  - "The evaluator confers trust: every candidate program is a scored, checkable object, verified by code execution rather than by a natural-language assertion from the model."
research_questions_it_leaves_open:
  - "The approach depends on an automated, checkable scoring function for the target problem, and the paper leaves open how many scientific questions worth pursuing admit that kind of cheap, automatic evaluator."
  - "It leaves open how a discovery produced this way should be attributed among the authors, the base language model, and the search procedure itself."
how_it_bears_on_research_os: >
  FunSearch's evaluator loop is a close functional match for Bucket's tournament and
  belief-fusion machinery: both need a scoring function that can rank many machine-proposed
  candidates and keep the ones that survive checkable, adversarial evaluation, and FunSearch
  shows that constraint working end to end on a domain, combinatorics, where checkable has a
  precise meaning. For the Research OS, the lesson is diagnostic: a K-12 production pipeline
  should look for sub-questions where a transfer-proof can be scored by an automatic check, and
  route students toward exactly those gap nodes, since that is where FunSearch shows
  machine-assisted search adds checkable value beyond plausible-sounding text.
---

# Mathematical discoveries from program search with large language models

FunSearch matters to Bucket Foundation as evidence that a search loop turns a plausible-sounding
suggestion into a checked discovery. The model proposes candidate programs; an automated
evaluator scores each one against the target objective and keeps only what survives. That
structure maps onto Bucket's own tournament and belief-fusion machinery, which needs the same
kind of scoring function to rank machine-proposed hypotheses before they enter the citation graph
as evidence. For the Research OS, it points at which student sub-questions are worth automating
first: the ones where a transfer-proof can be checked by code or a clear rule, alongside what a
teacher reads and judges directly.

Key claims:
- The model-plus-evaluator loop can discover mathematical constructions beyond what appears in its training data.
- Its cap-set construction improved a long-open combinatorics lower bound, verified independently of the model.
- Trust comes from the evaluator: every candidate is scored and checked by code execution.

Open questions:
- How many real scientific questions have a cheap, automatic evaluator FunSearch's method could use.
- How to attribute a discovery between the human authors, the base language model, and the search procedure.
