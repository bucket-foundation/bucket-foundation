# Input Share Experiment Preregistration

Bead bkt-owjng. Plan: `COMPREHENSIBLE-INPUT-PLAN.md` §9. Experiment id `ci14-share-v1`. Status: prepared and waiting. Launch needs the founder's go.

## Question

Does the share of session time spent on comprehensible input change how many words a learner knows after 28 days? The plan sets 70% up to A2 as the starting point (PATH-MODEL step 9, grade C). This study tests that point against 50% and 90%.

## Hypotheses

- **H1:** learners assigned 50% input know fewer words at day 28 than learners assigned 70%.
- **H2:** learners assigned 90% input know more words at day 28 than learners assigned 70%.

Both tests are two-sided. The direction above is the prediction we record before data.

## Design

- **Arms:** `s50`, `s70`, `s90`. The arm sets the session input target; `inputShare` still caps the share at eligible input over session time.
- **Unit:** one install, keyed by the device hash already written on every review log row. A learner on two devices counts as two units; the analysis reports how many device hashes share a signed-in account when that link exists.
- **Assignment:** `fnv1a32("ci14-share-v1:<stratum>:<device>") mod 3`, where the stratum is `to-a2` for placement tier 6 or below and `past-a2` above. The same function runs on web, Android and iOS and is pinned by `src/lib/academy/input-experiment-vectors.json`. Assignment needs no server and anyone can recompute it from the log.
- **Eligibility:** a session is filled when eligible input could reach 90% of session time, so every arm can deliver its target. A filled session logs the arm (`s70`); an unfilled one logs the arm with `-x` (`s70-x`) and runs the default mix.
- **Enrolment:** the first filled session. Day 0 is that session's date. Later unfilled sessions stay in the arm.
- **Flag:** `NEXT_PUBLIC_POLINGUAL_INPUT_EXPERIMENT=1` on web, `polingualInputExperiment=1` on Android, `POLINGUAL_INPUT_EXPERIMENT=1` on iOS. Every default is off, and with the flag off the arm is null and the mix is unchanged.

## Outcomes

- **Primary:** known words at day 28 from a held-out yes/no test. The learner sees 50 real words sampled across frequency bands, none of them studied as cards, plus 20 pseudowords. Score: `(hits − false alarms) / (1 − false alarms)` times the size of the sampled bank (`yes_no_known` in the analysis code). The test runs once, between day 28 and day 35.
- **Baseline covariate:** the same test at enrolment, drawn from a disjoint word sample.
- **Secondary:** input hours by day 28 (exposure rows), day-28 retention (any session on days 21 to 28), card lapse rate over days 0 to 28, realized share (`share_real` on session rows).

## Sample Size

Two contrasts, 50 vs 70 and 90 vs 70, Holm-corrected at family-wise α 0.05. With d = 0.3 and power 0.8 at α 0.025 per contrast, a two-sample t test needs 212 completers per arm. Planning for 40% loss by day 28 gives 354 enrolled per arm, 1,062 in total. `ci14_analysis.py power` reproduces these numbers and simulates power with the covariate model; 100 simulations at 354 per arm gave 0.87 and 0.85.

## Analysis

- **Population:** every enrolled device, analysed in its assigned arm (intention to treat).
- **Model:** ordinary least squares on the day-28 score with arm indicators (reference `s70`), stratum, and baseline score. The arm coefficients are the two contrasts; p values are two-sided t tests, then Holm.
- **Missing outcomes:** the primary model uses observed outcomes. The sensitivity analysis is multiple imputation from the same model (20 imputations, Rubin's rules). A conclusion holds when both agree in sign and in rejection.
- **Effect size:** the coefficient divided by the residual SD.
- **Code:** `scripts/polingual/ci14_analysis.py`, tested in `scripts/polingual/test_ci14_analysis.py` on simulated data with known effects and under the null.

## Stopping Rules

- **Fixed horizon:** enrolment closes at 354 per arm or 120 days after launch, whichever comes first. No interim look at the primary outcome.
- **Harm check:** once every arm has 150 enrolled devices, compare day-7 retention. If any arm sits 15 points or more below `s70`, stop that arm and report it (`harm_stop`).
- **Defect stop:** stop if a logged arm disagrees with the hash assignment for any device (`enrolments` raises on it), or if `share_real` in filled sessions misses the arm target by more than 0.1 on median.

## Deviations

Any change after launch goes in a dated list at the end of this file with its reason, before the outcome data are read.

## Launch Prerequisites

1. Founder approval to launch on real users.
2. The yes/no test with pseudowords built and shipped on all three clients.
3. The flag set on all three clients in the same release window.
4. Review log upload on, so session and exposure rows reach the server.
