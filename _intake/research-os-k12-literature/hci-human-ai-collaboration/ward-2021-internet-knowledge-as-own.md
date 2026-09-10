---
title: "People Mistake the Internet's Knowledge for Their Own"
authors:
  - "Ward, Adrian F."
year: 2021
venue: "Proceedings of the National Academy of Sciences"
doi: "10.1073/pnas.2105061118"
url: "https://doi.org/10.1073/pnas.2105061118"
openalex_id: "https://openalex.org/W3207200409"
branch: "hci-human-ai-collaboration"
tier: "canon"
why_it_matters: >
  Across nine experiments, shows people misattribute the internet's knowledge to their
  own minds, especially when search is fast and frictionless, and that the effect
  extends to unrelated future judgments of their own knowledge. It gives Research OS's
  design bet, that a workspace with required steps (locate, quote, check) is not the
  same as a frictionless chatbot, a specific mechanism to test: friction itself as the
  variable that should change the misattribution rate.
key_claims:
  - "Participants who searched online for answers rated their own unaided knowledge as higher afterward than participants who answered from memory, even on later, unrelated questions."
  - "The misattribution was strongest for smooth, uninterrupted searches, and weaker when search was slow or effortful, tying the effect to fluency rather than to internet use itself."
  - "Participants who searched showed increased confidence in their ability to answer future questions without help, a forward-looking overconfidence beyond the immediate task."
research_questions_it_leaves_open:
  - "What specific dose of friction is needed to prevent the misattribution without also eliminating the offloading benefit search provides."
  - "Whether the effect differs between a search-results page and a single confident conversational answer, which removes the step of picking a result."
how_it_bears_on_research_os: >
  Gives Research OS's four-tool design, Locate and Quote run with no model call and
  Check requires a cited span before it will verify, a falsifiable prediction: friction
  by construction should reduce the misattribution Ward documents relative to a
  frictionless chatbot, and should be measurable as a forward-looking confidence rating
  taken after the task, not only as immediate performance. This is a direct outcome
  measure for the three-arm testbed in `RESEARCH-QUESTIONS.md` Q8 and Q11. Extends
  `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` question 1.
---

# People Mistake the Internet's Knowledge for Their Own

Nine experiments showing people misattribute internet-search knowledge to their own
minds, most strongly when search is fast and frictionless, with the overconfidence
extending to later, unrelated questions.

## Key Claims

- Searching online for answers raised self-rated unaided knowledge, including on later
  unrelated questions.
- The misattribution tracked search fluency: stronger for smooth search, weaker for
  slow or effortful search.
- Searching raised confidence in answering future questions without help.

## Research Questions It Leaves Open

- What dose of friction prevents misattribution without eliminating the offloading
  benefit.
- Whether a single confident AI answer produces a stronger effect than a
  search-results page.

## How It Bears on Research OS

Gives the four-tool design a falsifiable prediction: friction built into Locate, Quote,
and Check should reduce this misattribution relative to a frictionless chatbot,
measurable as a forward-looking confidence rating in the three-arm testbed named in
`RESEARCH-QUESTIONS.md` Q8 and Q11.
