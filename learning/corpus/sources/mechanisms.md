# Bucket Learning Mechanisms

Read from `origin/dev` at e61d717. `mechanisms.jsonl` holds 39 mechanisms and 29 product practices with paths.

## Running today

| Mechanism | Rule | Evidence cited | Measured |
|---|---|---|---|
| FSRS scheduler | Power curve, 0.9 target, 1 to 3650 days | Ye, Su, Cao KDD '22 | State only |
| Elo proficiency | theta += K(score - P), K = 1/(1 + 0.05n) | Pelánek 2016 | theta, n |
| Mastery | M = P^1 * R(90 days)^1, mastered at 0.7 | None, own synthesis | No |
| Encompassing map | 0.6 * 0.5^(hops-1), 4 hops | Skycak essays | No |
| FIRe | Up to 4.5% stability gain to prerequisites | Skycak essays | firedCredit |
| Daily route | Due cards, then 4 new atoms | ALEKS outer fringe | Session totals |
| Placement | Log-odds per atom, 18 questions | Cosyn et al. 2021 | Two counts |
| Assessment | 10 items, 1% numeric tolerance | None | Per-item verdicts |
| Tutor | One atom, hint only, leak guard | Bastani et al. 2025 | Flags, tokens |
| Three-choice quiz | 15-token stem, distractors from other atoms | None | Attempts |
| Work quiz | Least-picked form, 2 surprise quizzes a day | None | Coverage, attempts |
| Fermi grading | Within 0.5 log10 | None | log10 distance |
| Streak, XP | XP 5, 8, 14, 20 by depth | None | Totals |

## Parameters with no stated source

132 of 146. The groups: the 21-day constant in stability-only mastery, the 0.7 mastered cut, the depth difficulty table, the rating-to-score map, the encompassing and FIRe constants, 4 new atoms a day, all placement constants, every quiz length and time limit, the sampler weights, the trigger timings. The 19 FSRS weights carry no origin note.

## Document and code disagree

- Scheduler: decided FSRS-6 through ts-fsrs; coded as hand-written FSRS-5.
- Proficiency: specified at the lower confidence bound; coded as a point estimate.
- Mastery: decided BKT at P >= 0.95; coded Elo at M >= 0.7.
- Encompassing weights: specified as expert-set; coded from hop distance.
- FIRe: described with penalties upward; coded credit-down only.
- Placement: specified as a state distribution with 35/5/50 weights; coded as per-atom log-odds.
- Assessment: called sealed; it reuses study items.
- Grader: SymPy specified; string and number match coded.
- Streak freeze: decided; absent.
- Quiz: generated answers recommended; three-option recognition shipped.
- Reach score and route opening rule: simpler than specified.
- Fermi boundary: the code accepts 8658 against 27379; Lean rejects it.

## Shared and own

Same as Anki: the FSRS scheduler, the four-button self-rating. Same as Duolingo: streak, XP, hearts, combo, rotating exercise formats, self-rated language placement. Simplified from Math Academy and ALEKS: the encompassing map, FIRe, the prerequisite gate, placement.

Bucket's own: the fused mastery formula, the four-depth ladder, the answer-leak guard, quizzes from the learner's own beads and pull requests, the surprise trigger, the length limits, Fermi grading, the learn-this link, the grip sphere, the Lean bounds.

## Unmeasured

- Retention at 7 and 30 days: predicted retrievability is never compared with observed recall. The human-AI probe alone retests after 7 days, on its own items.
- Transfer: no held-out or novel items.
- Time to mastery: the web keeps state without a review log.
- Real-world use: nothing.
- Also absent: placement accuracy, the effects of FIRe and the tutor. Web events cover consenting adults only.
