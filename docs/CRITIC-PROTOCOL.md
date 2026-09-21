# Critic protocol

Every loop task passes an independent critic before it merges. The critic scores the work out of 10 against the rubric below, and the gate is **9 or higher with no open finding above Low**. Anything less returns for another round.

Founder direction, 2026-09-21: the pass has to be rigorous, it has to clear a 9 of 10 gate, and each round upgrades the one before it instead of repeating it.

## The rubric

| Criterion | Points | What earns them |
|---|---|---|
| Claims hold | 3 | Every factual claim checked against its source, every code claim checked against the code. A claim the critic could not reach is named as unverified, and an unverified claim in a load-bearing position costs a point. |
| Logic holds | 2 | The code does what its docs and its commit message say, run rather than read where running is possible. Edge cases, empty inputs, filters, cycles, and the failure path each return what the docs promise. |
| The surface serves its reader | 2 | The result appears where people work, readable at 1280 and 390, with nothing unexplained on screen. A founder-facing surface is scored as the founder would read it. |
| Scope is whole | 1 | Nothing in the task's own brief is dropped without saying so. A split or a narrowing carries every part of what it replaced. |
| The record agrees | 1 | The memo, the change ledger, the PR body, and the commit messages say the same thing as the code. |
| Voice | 1 | `agf-lint-voice` and `agf-lint-voice-src` clean, and the constructions the linters miss are clean too: antithesis, a contradicting clause after a comma, three-item lists, a heading with a clause tacked on. |

A criterion scores whole or half points. The total is the score, and the verdict is the gate: 9.0 or higher with no Medium or High open is a pass.

## Rounds upgrade

A round never repeats an earlier round's verification. Each critic brief carries the **verification ledger**: what earlier rounds checked against a live source or by running code, so the new round spends its budget on what changed and on what nobody has reached yet. A round that finds nothing new in a checked area says so and moves on.

Each round also raises its own bar: the first round reads the change, the second attacks the fixes, the third attacks the whole as a reader would meet it, and a fourth exists to confirm a 9 rather than to hunt.

## Severity

- **High**: a reader acting on this is harmed, data is lost, a secret leaks, or the gate a rule claims to enforce does not run.
- **Medium**: a claim a reader could act on is wrong, a rule does not hold, or a surface would be misread.
- **Low**: an inaccuracy, a rough edge, or a wording problem that changes no decision.

Findings above Low are fixed on the branch before merge. A Low may ship with a line in the PR body saying why.

## What the critic returns

```
SCORE: <n>/10   (claims x/3, logic x/2, surface x/2, scope x/1, record x/1, voice x/1)
VERDICT: PASS or FAIL        (PASS needs 9.0 and no Medium or High)
Findings: severity | file:line | what is wrong | the fix
Verification ledger: what this round verified by running or fetching, and what it could not reach
```

## The loop's side

The loop records each round's score and findings in the PR body, fixes everything above Low, and runs the next round with the ledger carried forward. A task merges on a 9 or higher. A task that reaches three rounds without a 9 gets its scope cut rather than its standard lowered.
