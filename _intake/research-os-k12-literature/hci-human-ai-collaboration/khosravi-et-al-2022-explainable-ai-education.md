---
title: "Explainable Artificial Intelligence in education"
authors:
  - "Khosravi, Hassan"
  - "Shum, Simon Buckingham"
  - "Chen, Guanliang"
  - "Conati, Cristina"
  - "Tsai, Yi-Shan"
  - "Kay, Judy"
  - "Knight, Simon"
  - "Martinez-Maldonado, Roberto"
  - "Sadiq, Shazia"
  - "Gašević, Dragan"
year: 2022
venue: "Computers and Education: Artificial Intelligence"
doi: "10.1016/j.caeai.2022.100074"
url: "https://doi.org/10.1016/j.caeai.2022.100074"
openalex_id: "https://openalex.org/W4280651558"
branch: "hci-human-ai-collaboration"
tier: "canon"
why_it_matters: >
  A survey of explainable-AI methods and evaluation approaches specific to education,
  directly relevant to the requirement that a teacher's class-graph view expose
  belief-score components rather than a bare pass-or-fail state.
key_claims:
  - "Explainability needs differ by stakeholder in an educational system: a student, a teacher, and a system developer each need different explanations of the same underlying model output, a distinction most general-purpose explainable-AI work does not make."
  - "Most published education explainable-AI work explains a model's prediction after the fact rather than using an inherently interpretable model, a design tradeoff between accuracy and built-in transparency the survey documents as unresolved."
  - "Evaluation of whether an explanation helps a teacher or student make a better decision, versus whether it is technically faithful to the model, is rare in the surveyed literature."
research_questions_it_leaves_open:
  - "How to design a stage-confidence or belief-score explanation for a teacher who is not a data scientist, without oversimplifying to the point of being misleading."
  - "How to evaluate whether an explanation changes a teacher's decision for the better, not just whether the explanation is accurate."
how_it_bears_on_research_os: >
  Bears directly on the teacher-visible evidence requirement: every Check result that
  would advance a stage past Understanding writes a teacher-visible evidence row, and this
  survey's own stakeholder-specific framing argues that row needs a teacher-legible
  explanation of why the model reached its verdict, not just the verdict itself, echoing
  the hypothesis engine's own unresolved question of whether exposing belief-score
  components changes teacher trust.
---

# Explainable Artificial Intelligence in education

A survey of explainable-AI methods and evaluation approaches specific to education, directly relevant to the requirement that a teacher's class-graph view expose belief-score components rather than a bare pass-or-fail state.

## Key Claims

- Explainability needs differ by stakeholder in an educational system: a student, a teacher, and a system developer each need different explanations of the same underlying model output, a distinction most general-purpose explainable-AI work does not make.
- Most published education explainable-AI work explains a model's prediction after the fact rather than using an inherently interpretable model, a design tradeoff between accuracy and built-in transparency the survey documents as unresolved.
- Evaluation of whether an explanation helps a teacher or student make a better decision, versus whether it is technically faithful to the model, is rare in the surveyed literature.

## Research Questions It Leaves Open

- How to design a stage-confidence or belief-score explanation for a teacher who is not a data scientist, without oversimplifying to the point of being misleading.
- How to evaluate whether an explanation changes a teacher's decision for the better, not just whether the explanation is accurate.

## How It Bears on Research OS

Bears directly on the teacher-visible evidence requirement: every Check result that would advance a stage past Understanding writes a teacher-visible evidence row, and this survey's own stakeholder-specific framing argues that row needs a teacher-legible explanation of why the model reached its verdict, not just the verdict itself, echoing the hypothesis engine's own unresolved question of whether exposing belief-score components changes teacher trust.
