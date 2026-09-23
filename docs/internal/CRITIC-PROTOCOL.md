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

Every ledger entry carries the commit it was verified at and the files it covers. An entry is void as soon as a later commit touches one of those files, and the brief lists it as open again. Without that trigger a fix made after a check would inherit the check, which is how a rewritten row keeps a verification it never earned.

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

The loop records each round's score and findings in the PR body before it starts the next round, fixes everything above Low, and carries the ledger forward with each entry keyed to the commit it was verified at. A task merges on a 9 or higher. A task that reaches three rounds without a 9 gets its scope cut and keeps its standard.

The PR body holds one table of rounds: the round, its score, its verdict, the findings above Low, and the commit that fixed them. A round that starts before the previous one is written up is a round without a baseline, which is how a rewritten artifact keeps a verification it never earned.

## The surface gate

A task merges when its result is usable inside Research OS at 1280 and 390, which is the founder's standing rule of 2026-09-18. A task whose output is a memo or a script owes a surface, and the loop records that debt as a roadmap row in the same pass. `ros-frontend 1` carries the debt from the four tasks that shipped before this rule had teeth.

## The three defects this repo produces

Seven review rounds on the Research OS authorization work found the same
three shapes over and over, in different files each time. A critic reads
for these before anything else, and a change that introduces one is a
finding even when every test passes.

**One shape declared twice.** A route builds its response inline and its
client declares the same fields by hand. Widening a field on the route is
invisible to the client, and the page renders the new value as text: the
`/loop` route made two counts nullable and the panel printed "null
connections held" to the learner. Four copies of the assignment shape
meant a fix reached one of four surfaces. The check: for every response
field a client reads, find the one declaration both compile against. The
repair is `import type` from the server module, which is erased at build
and costs the client nothing.

**A list of ids chunked but not paged.** PostgREST puts an `in()` filter
in the request line, so the ids get chunked to keep the URL short. That
bound says nothing about the separate cap of 1,000 rows per response. A
chunked read past that cap returns a prefix with no error, and the caller
treats the prefix as the whole answer: sixty node ids on a dense branch
overflow a thousand edges routinely. Worse in an authorization path,
where the dropped rows read as a denial of a live grant. The check: every
`in(...)` read pages with `.range()` and carries an `.order()`, since
Postgres gives no stable order across LIMIT and OFFSET without one. A
page loop whose callback forgets the range answers the same page forever,
so the loop stops itself and throws.

**An outage collapsed into an empty result.** A read fails, the code
answers `[]` or an empty `Set`, and the surface says the learner has
nothing. The two are different facts and the reader cannot tell them
apart: "no assignments" and "we could not check your assignments" render
the same. This one survives a fix by moving, from a library to a route
to a client, so the check follows it the whole way: an unavailable result
propagates as its own case to every consumer, and each consumer renders
it as unknown with a way to retry.

Each has a mutation that proves the fix: blank the field and watch the
client print the wrong text, strip the `.range()` and watch a
thousand-and-first row disappear, force the store to fail and watch the
surface claim emptiness. A repair with no such mutation is unverified.
