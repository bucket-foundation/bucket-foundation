---
title: "Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention"
authors:
  - "Roediger, Henry L."
  - "Karpicke, Jeffrey D."
year: 2006
venue: "Psychological Science"
doi: "10.1111/j.1467-9280.2006.01693.x"
url: "https://doi.org/10.1111/j.1467-9280.2006.01693.x"
openalex_id: "https://openalex.org/W2163569782"
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  This is the canonical experimental demonstration of the testing effect: retrieval practice produces better long-term retention than repeated study of the same material, even when repeated study feels more fluent in the short term. Research OS's spaced-review scheduling and its graded transfer items both rest on retrieval practice rather than restudy.
key_claims:
  - "Students who took repeated recall tests on studied passages retained more of the material a week later than students who restudied the passages the same number of times."
  - "Repeated studying produced better performance on an immediate test, reversing at a one-week delay, when repeated testing pulled ahead."
  - "Participants' own predictions of their future recall favored the restudy condition, the opposite of the measured outcome, showing learners cannot judge which strategy works from feel alone."
research_questions_it_leaves_open:
  - "How retrieval-practice benefits interact with item difficulty and prior knowledge, which matters for how a spaced-review scheduler should weight new versus struggling items."
  - "Whether the effect transfers from verbatim recall to the kind of free-response explanation Research OS's Understanding stage grades."
how_it_bears_on_research_os: >
  The FSRS retrievability function already shipping in mastery.ts schedules review by decaying retention, which only produces a benefit if the review itself is a retrieval event rather than a restudy pass; Roediger and Karpicke's finding is the direct evidentiary basis for building the review surface as a recall or explanation prompt rather than a rereading pass. The mismatch they find between felt fluency and actual retention is also the reason a K-12 product should not let a learner self-report mastery: the checkpoint-attempt-from-a-sealed-pool design in the system review exists precisely because learners misjudge their own retention.
---

# Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention

This is the canonical experimental demonstration of the testing effect: retrieval practice produces better long-term retention than repeated study of the same material, even when repeated study feels more fluent in the short term. Research OS's spaced-review scheduling and its graded transfer items both rest on retrieval practice rather than restudy.

## Key Claims

- Students who took repeated recall tests on studied passages retained more of the material a week later than students who restudied the passages the same number of times.
- Repeated studying produced better performance on an immediate test, reversing at a one-week delay, when repeated testing pulled ahead.
- Participants' own predictions of their future recall favored the restudy condition, the opposite of the measured outcome, showing learners cannot judge which strategy works from feel alone.

## Research Questions It Leaves Open

- How retrieval-practice benefits interact with item difficulty and prior knowledge, which matters for how a spaced-review scheduler should weight new versus struggling items.
- Whether the effect transfers from verbatim recall to the kind of free-response explanation Research OS's Understanding stage grades.

## How It Bears on Research OS

The FSRS retrievability function already shipping in mastery.ts schedules review by decaying retention, which only produces a benefit if the review itself is a retrieval event rather than a restudy pass; Roediger and Karpicke's finding is the direct evidentiary basis for building the review surface as a recall or explanation prompt rather than a rereading pass. The mismatch they find between felt fluency and actual retention is also the reason a K-12 product should not let a learner self-report mastery: the checkpoint-attempt-from-a-sealed-pool design in the system review exists precisely because learners misjudge their own retention.
