---
title: "Pay Enough or Don't Pay at All"
authors:
  - "Gneezy, Uri"
  - "Rustichini, Aldo"
year: 2000
venue: "The Quarterly Journal of Economics"
doi: "10.1162/003355300554917"
url: "https://doi.org/10.1162/003355300554917"
openalex_id: "https://openalex.org/W2168112513"
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  The founding field-and-lab evidence that small monetary incentives can perform worse
  than no incentive at all, non-monotonic in payment size. It sets a hard constraint on
  any payout Research OS designs around a production: a token payment risks landing in
  the demotivating middle this paper documents rather than above it.
key_claims:
  - "A field study of daycare centers found that introducing a small fine for late pickup increased the rate of late pickups rather than decreasing it, and the increase persisted after the fine was removed."
  - "In a separate incentivized-effort task, participants paid a small amount performed worse than participants paid nothing, and worse than participants paid a larger amount."
  - "The pattern across studies is non-monotonic: performance or compliance was often lowest at a small payment, higher at both zero payment and at a sufficiently large payment."
research_questions_it_leaves_open:
  - "Where the threshold between an insufficient and a sufficient payment sits for a given task and population, and whether it can be estimated in advance rather than found by trial."
  - "Whether the mechanism (reframing a moral or social obligation as a market transaction) applies the same way to a student citation payment as to a parent's daycare pickup."
how_it_bears_on_research_os: >
  Sets a design constraint on `docs/PRODUCTION-SCHEMA.md`'s payout: a citation payment
  pilot should test a payment large enough to clear the "enough" side of this paper's
  non-monotonic curve, or should run a no-payment recognition-only arm instead of
  guessing at a token amount that risks the demotivating middle. Directly informs the
  design of the recognition-only versus recognition-plus-payment comparison named in
  `RESEARCH-QUESTIONS.md` Q13. Extends `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`
  question 5.
---

# Pay Enough or Don't Pay at All

Field and lab evidence that small monetary incentives can produce worse behavior than
no incentive at all, non-monotonic in payment size rather than linearly beneficial.

## Key Claims

- A small late-pickup fine at daycare centers increased late pickups rather than
  reducing them, and the increase outlasted the fine.
- Small incentivized payment produced worse task performance than either no payment or
  a larger payment.
- The pattern across studies was non-monotonic: a small payment often performed worse
  than zero payment or a sufficiently large one.

## Research Questions It Leaves Open

- Where the threshold between insufficient and sufficient payment sits for a given
  task and population.
- Whether the reframing mechanism applies the same way to a student citation payment
  as to a parent's daycare pickup.

## How It Bears on Research OS

Sets a constraint on the payout in `docs/PRODUCTION-SCHEMA.md`: a citation-payment
pilot should test an amount large enough to clear this paper's non-monotonic curve, or
run a no-payment recognition-only arm instead. Directly informs the recognition-only
versus recognition-plus-payment comparison in `RESEARCH-QUESTIONS.md` Q13.
