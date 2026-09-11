---
title: "Predicting replication outcomes in the Many Labs 2 study"
authors:
  - "Forsell, Eskil"
  - "Viganola, Domenico"
  - "Pfeiffer, Thomas"
  - "Almenberg, Johan"
  - "Wilson, Brad"
  - "Chen, Yiling"
  - "Nosek, Brian A."
  - "Johannesson, Magnus"
year: 2019
venue: "Journal of Economic Psychology"
doi: "10.1016/j.joep.2018.10.009"
url: "https://doi.org/10.1016/j.joep.2018.10.009"
openalex_id: "https://openalex.org/W2898161671"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  A third independent replication-forecasting study, after Dreber and colleagues (2015)
  and Camerer and colleagues (2018), narrows down which forecasting elicitation method
  works: prediction markets on a binary replication-success outcome tracked the actual
  outcomes closely, while markets on a continuous outcome, relative effect size, attracted
  little trading and performed poorly, a distinction relevant to what the engine's own
  ranking label should forecast.
key_claims:
  - "Researchers' peer beliefs, elicited through prediction markets and surveys, were
    collected on whether each of 24 studies replicated in the large-scale Many Labs 2
    project would produce a statistically significant effect in the original direction and
    on the size of the replicated effect relative to the original."
  - "The prediction markets correctly predicted about three in four replication outcomes
    on the binary significance measure and were highly correlated with the actual
    outcomes; survey beliefs on the same binary measure were also significantly
    correlated with outcomes but had larger prediction errors than the markets."
  - "The markets built to forecast relative effect size attracted little trading and did
    not perform well, while survey beliefs on that same continuous outcome performed
    better, evidence the two elicitation methods are not interchangeable across outcome
    types."
research_questions_it_leaves_open:
  - "Whether the market-versus-survey performance gap on binary outcomes, markets beating
    surveys, but the reverse on continuous outcomes, has an analog in how the engine's own
    ranking label should be elicited: a discrete validated-or-unvalidated status, or a
    continuous calibration score."
  - "Whether the weak market performance on relative effect size reflects a genuine
    difficulty in forecasting continuous outcomes or an artifact of the low trading volume
    this specific market design attracted."
how_it_bears_on_research_os: >
  Sharpens the design choice behind the engine's own ranking-status label: this paper's
  own finding that a binary outcome (did it replicate) is easier to forecast well than a
  continuous one (by how much) is a point in favor of `hte.holdout_ledger`'s own discrete
  unvalidated-or-validated status over a bare continuous score as the label a downstream
  consumer, a teacher or a K-12 learner routed to a ranked hypothesis, actually sees. Read
  alongside Dreber and colleagues (2015) and Camerer and colleagues (2018), this is the
  third of three independent replication-forecasting studies this batch adds, converging
  evidence that a calibrated probability over "will this hold up" is a well-studied,
  forecastable quantity rather than a claim specific to this engine's own design.
---

# Predicting replication outcomes in the Many Labs 2 study

A third independent replication-forecasting study narrows down which elicitation method
works: prediction markets on a binary replication outcome tracked actual outcomes closely;
markets on a continuous outcome did not.

## Key Claims

- Researchers' peer beliefs, elicited through prediction markets and surveys, were
  collected on whether each of 24 studies replicated in the large-scale Many Labs 2
  project would produce a statistically significant effect in the original direction and
  on the size of the replicated effect relative to the original.
- The prediction markets correctly predicted about three in four replication outcomes on
  the binary significance measure and were highly correlated with the actual outcomes;
  survey beliefs on the same binary measure were also significantly correlated with
  outcomes but had larger prediction errors than the markets.
- The markets built to forecast relative effect size attracted little trading and did not
  perform well, while survey beliefs on that same continuous outcome performed better,
  evidence the two elicitation methods are not interchangeable across outcome types.

## Research Questions It Leaves Open

- Whether the market-versus-survey performance gap on binary outcomes, markets beating
  surveys, but the reverse on continuous outcomes, has an analog in how the engine's own
  ranking label should be elicited: a discrete validated-or-unvalidated status, or a
  continuous calibration score.
- Whether the weak market performance on relative effect size reflects a genuine
  difficulty in forecasting continuous outcomes or an artifact of the low trading volume
  this specific market design attracted.

## How It Bears on Research OS

Sharpens the design choice behind the engine's own ranking-status label: this paper's own
finding that a binary outcome (did it replicate) is easier to forecast well than a
continuous one (by how much) is a point in favor of `hte.holdout_ledger`'s own discrete
unvalidated-or-validated status over a bare continuous score as the label a downstream
consumer, a teacher or a K-12 learner routed to a ranked hypothesis, actually sees. Read
alongside Dreber and colleagues (2015) and Camerer and colleagues (2018), this is the third
of three independent replication-forecasting studies this batch adds, converging evidence
that a calibrated probability over "will this hold up" is a well-studied, forecastable
quantity rather than a claim specific to this engine's own design.

## Verification note

OpenAlex records this record's own `publication_year` as 2018 (its online-first date,
2018-10-25); Crossref's `published-print` field dates the same DOI's print issue (volume
75) to 2019-12, matching the year this pass's own task brief names. This card follows the
print-issue year, the same convention this corpus already applies elsewhere when an
online-first and print date diverge.
