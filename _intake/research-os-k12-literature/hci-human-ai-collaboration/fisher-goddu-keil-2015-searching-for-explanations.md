---
title: "Searching for Explanations: How the Internet Inflates Estimates of Internal Knowledge"
authors:
  - "Fisher, Matthew"
  - "Goddu, Mariel K."
  - "Keil, Frank C."
year: 2015
venue: "Journal of Experimental Psychology: General"
doi: "10.1037/xge0000070"
url: "https://doi.org/10.1037/xge0000070"
openalex_id: "https://openalex.org/W2151132174"
branch: "hci-human-ai-collaboration"
tier: "canon"
why_it_matters: >
  Shows that searching the internet for an explanation of one topic raises a person's
  self-rated understanding of unrelated topics never searched, a knowledge-source
  confusion that lands directly on the gap between a learner's felt confidence and a
  learner's tested understanding, the gap Research OS's Understanding state is meant
  to close rather than paper over.
key_claims:
  - "After searching the internet to answer questions in one domain, participants rated their own ability to explain unrelated topics they had not searched as higher than a no-search control group did."
  - "The effect held when participants used a search engine returning explanations, but weakened when the search returned no explanatory content, tying the inflation to accessing explanatory material rather than to search activity alone."
  - "Participants showed no matching increase in actual test performance on the unrelated topics, so the inflated self-rating was not tracking a real gain in knowledge."
research_questions_it_leaves_open:
  - "Whether the effect transfers from web search to a conversational AI interface, where the sense of a fluent, personalized answer may be stronger than a search-results page."
  - "Whether showing the source of an explanation, rather than hiding it behind a fluent answer, reduces the misattribution."
how_it_bears_on_research_os: >
  Predicts a specific failure mode the Check tool must guard against: a learner whose
  claim gets verified against cited evidence may walk away rating their own
  understanding of the whole topic higher, not only the checked claim, without a
  matching gain in tested performance. This argues for scoring Research OS's own
  Understanding state on performance rather than self-report, and for logging a
  self-rated confidence measure alongside the three-arm testbed named in `RESEARCH-
  QUESTIONS.md` Q8 so the gap itself is visible. Extends `OVERLAP-RESEARCH-OS-AND-AI-
  FOR-RESEARCH.md` question 1.
---

# Searching for Explanations

Searching the internet for an explanation of one topic inflates a person's self-rated
understanding of unrelated topics never searched, with no matching gain in tested
performance on those unrelated topics.

## Key Claims

- Internet search in one domain raised self-rated explanatory ability for unrelated,
  unsearched topics.
- The inflation tracked access to explanatory content specifically, not search activity
  alone.
- No matching gain in actual test performance on the unrelated topics appeared.

## Research Questions It Leaves Open

- Whether the effect is stronger with a conversational AI answer than a search-results
  page.
- Whether showing an explanation's source reduces the misattribution.

## How It Bears on Research OS

Predicts a failure mode the Check tool must guard against: a verified claim can inflate
a learner's self-rated understanding of the whole topic without a matching performance
gain, arguing for scoring the Understanding state on performance and logging
self-rated confidence alongside it in the three-arm testbed named in `RESEARCH-
QUESTIONS.md` Q8.
