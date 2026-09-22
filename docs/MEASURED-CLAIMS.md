# Numbers in prose

A sentence carrying a number says whether it was measured, and if it was, under what conditions. A reader cannot tell a measurement from an estimate by the voice it is written in, and the two are used for different things.

Two sessions hit this independently on 2026-09-22, in unrelated code, within an afternoon of each other. Both had shipped.

## What goes wrong

**A design written as a measurement.** `learning/research-os/ai/OPERATING.md` described what happens during a corpus rollback: every request degrades, nothing serves the withdrawn revision. It sat one table below numbers that were measured, so it read as one of them. Each piece of it was covered by a test; the three together in that order had never been run. Corrected in #239, and the Rollback gate went back to open.

**An estimate written as a measurement, hiding the variable that matters.** `src/lib/research-os/import-tables.ts` told callers that the 20 MB default parses "in about 0.7 seconds and a quarter of a gigabyte of heap". That sentence exists so a browser path can decide whether it can afford the default. Measured across three row shapes: 0.7 s and 0.49 GB at 800,000 short rows, 1.3 to 1.6 s and 0.61 GB at 98,000 long ones, with RSS reaching 2.4 GB. The estimate was the fastest shape at half the heap, and the real finding was that the parser builds one object per cell, so row shape moves the cost more than byte count does. A caller sizing off the old sentence was sizing off the wrong variable.

**A number credited to the wrong run.** `scripts/systemd/evidence-worker.service` said the runtime gate measured 3.4 GiB at peak. The runtime gate measured latency; the 3.4 GiB came from `evidence_search probe`, a different run on a different day. Same file gave a single figure for worker start where two runs of twenty restarts had produced 22 s and 33 s.

## The rule

A number in a comment, a docstring, a runbook or a PR body is one of three things, and says which:

| Kind | How it reads |
|---|---|
| a threshold | names where it comes from, as "the 8-second deadline in IMPLEMENTATION.md" |
| a measurement | names what produced it, when, and on what, as "20 restarts on 2026-09-22, this machine, the 500-source corpus" |
| an estimate | says so, as "tens of seconds" or "order of a gigabyte" |

Conditions belong next to the number rather than in the commit that produced it. A range beats a point when the runs disagree: two runs giving 22 s and 33 s are reported as 22 to 33, because a reader who sees 32 and measures 22 has to work out which of you is wrong.

A claim that cannot be attributed is an estimate. Write it as one, or measure it.

## Where it bites hardest

A number a caller sizes a decision off. Parse cost that a browser path budgets against, a memory figure that sets a cgroup cap, a start time that decides whether a health check runs now or later. Those are the sentences to check first, because a wrong one there is acted on rather than read.

## The related shape

A check that cannot fail reads as coverage. A `SEALED` assertion matching a string that is always present, and a browser test clicking the element that was already selected, both pass for reasons unrelated to what they claim to prove. The habit that catches both: run the check against the unfixed code and watch it fail before trusting that it passed.
