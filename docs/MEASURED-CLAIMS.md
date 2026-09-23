# Numbers in prose

A sentence carrying a number says whether it was measured, and if it was, under what conditions. A reader cannot tell a measurement from an estimate by the voice it is written in, and the two are used for different things.

Two sessions hit this independently on 2026-09-22, in unrelated code, within an afternoon of each other. Both had shipped.

## What goes wrong

**A design written as a measurement.** `learning/research-os/ai/OPERATING.md` described what happens during a corpus rollback: every request degrades, nothing serves the withdrawn revision. It sat one table below numbers that were measured, so it read as one of them. Each piece of it was covered by a test; the three together in that order had never been run. Corrected in #239, and the Rollback gate went back to open.

**An estimate written as a measurement, hiding the variable that matters.** `src/lib/research-os/import-tables.ts` told callers that the 20 MB default parses "in about 0.7 seconds and a quarter of a gigabyte of heap". That sentence exists so a browser path can decide whether it can afford the default. Measured across three row shapes: 0.7 s and 0.49 GB at 800,000 short rows, 1.3 to 1.6 s and 0.61 GB at 98,000 long ones, with RSS reaching 2.4 GB. The estimate was the fastest shape at half the heap, and the real finding was that the parser builds one object per cell, so row shape moves the cost more than byte count does. A caller sizing off the old sentence was sizing off the wrong variable.

**A command's output measuring the wrong thing.** A probe counted unguarded calls per file. Its per-file tally went through `head -12`, and the number of lines the terminal printed became "twelve files" in a docstring. The real count was seventeen. This is the hardest of the four to catch, because it came out of a command: it is a real number, produced by a real run, measuring the display rather than the thing. An estimate that feels safe at least reads as a guess; this one reads as evidence.

**A count of a moving artifact, written as a property of the design.** The same docstring said the gate marks "eight of the twenty-eight routes". There were thirty-one. Worse, the related counts moved three times in one day as the code moved: 37 calls across 12 files, then 37 across 18, then 36 across 17. All three were true when measured and all three were written as facts about the system rather than about a revision. The finding underneath held throughout, which is why the moving numbers were not caught: a gateway sits in front of every route, and a bare 503 reaches a client that consults no rule.

**A measurement taken against the wrong environment.** A schema map was generated from a development database and declared keys for `source_quote_receipts`, a table CI does not have. The database had accumulated tables from branches that never merged, so it is a superset of what any one branch builds. The generator ran, the numbers were real, and they described a machine rather than the code. Generate from a database holding only that branch's migrations, and say which.

**A number credited to the wrong run.** `scripts/systemd/evidence-worker.service` said the runtime gate measured 3.4 GiB at peak. The runtime gate measured latency; the 3.4 GiB came from `evidence_search probe`, a different run on a different day. Same file gave a single figure for worker start where two runs of twenty restarts had produced 22 s and 33 s.

## The rule

A number in a comment, a docstring, a runbook or a PR body is one of three things, and says which:

| Kind | How it reads |
|---|---|
| a threshold | names where it comes from, as "the 8-second deadline in IMPLEMENTATION.md" |
| a measurement | names what produced it, when, and on what, as "20 restarts on 2026-09-22, this machine, the 500-source corpus" |
| an estimate | says so, as "tens of seconds" or "order of a gigabyte" |
| a count of the code | names the revision it was counted on, and asks for a re-count before the work is picked up |

Conditions belong next to the number rather than in the commit that produced it. A range beats a point when the runs disagree: two runs giving 22 s and 33 s are reported as 22 to 33, because a reader who sees 32 and measures 22 has to work out which of you is wrong.

A claim that cannot be attributed is an estimate. Write it as one, or measure it.

When a repair changes a mechanism, name every artifact that describes it. The copy is part of the blast radius, and the person who changed the mechanism is the only one who knows it moved. A cap that counted unrecorded objects and now counts every object makes a message about unrecorded ones wrong, and the message lives in a file the repair never touched. Send the list of what the change means, rather than the error code and an assurance that the rest still works.

Check what the command measured, rather than that it ran. A pipeline ending in `head`, `uniq`, a default page size or a truncating viewer answers a question about the display. The number of lines a terminal printed is not the number of things.

Record the checks that pass. A sweep listing only what it broke reads as a confession, and the next person cannot tell which claims were examined and held from the ones nobody looked at. `read-access.ts` says 100 ids build about 3.7 KB of request line and 200 build 7.5 KB, which is what sets the chunk bound; the URLs were built and came back 3.7 KB at 100 and 7.3 KB at 200. That one holds, and saying so is part of the work.

## Where it bites hardest

A number a caller sizes a decision off. Parse cost that a browser path budgets against, a memory figure that sets a cgroup cap, a start time that decides whether a health check runs now or later. Those are the sentences to check first, because a wrong one there is acted on rather than read.

## The seam

Three defects in one day were each found by the session that did not own the code. A route-access suite written for one branch caught a corpus miss answering "try again in a moment" about a deployment that has no corpus, inside the branch whose purpose was to stop retryable answers to permanent facts. A cap's owner reported an error code and an assurance, and the person who owned the message found the regex never matched it.

The pattern is that a defect lives in the arm nobody had reason to doubt. The author tests the path they were thinking about. Someone reading from the other side tests the path they assumed was fine, which is the one that is not. Neither a review nor a gate substitutes for a second person exercising the same code for their own reasons.

The same seam produces false accusations, at a rate worth naming. Three gates fired on one branch's merge and two were defects in the gates. A paging rule matched identifiers with `[a-z_]+`, so a read ordered on `created_at` then `sha256` looked like it had no tiebreaker, and a correct total order failed. A parse-order rule searched a whole following subtree for `if (!x.ok)` without binding it to the response under test, so a correct sequence matched on a nested block below it and read as the defect. The same character class ran the other way too: a table whose name carries a digit would never match, and its read would leave the rule without ever failing it.

So a gate firing on someone else's work is a claim about their work, and the gate's author is the one person positioned to check it before reporting it. Both accusations collapsed on reading the accused code. The failure to do that, earlier the same day, is how one session told the other that a refusal message still worked when its pattern had never matched the new text.

## Green on both sides, broken together

`class/page.tsx` renders its load error inside parentheses: `Could not load classes ({loadError})`. One branch set a short sentinel and gave it its own render line. Another set a full sentence as the error value. Each was green on its own branch. Together they read "Could not load classes (The server could not finish the read. Try again in a moment.)."

No test on either branch could have caught it, because the defect is in the combination and neither branch contains both halves. It surfaced because the two sides touched the same line and the merge asked someone to look. A defect in a combination that does not conflict textually has nothing to surface it at all.

So a merge conflict is a prompt rather than a chore. The lines two branches both touched are the lines most likely to hold something neither branch could see, and resolving by taking a side ends the conflict without answering the question.

## The related shape

A check that cannot fail reads as coverage. A `SEALED` assertion matching a string that is always present, and a browser test clicking the element that was already selected, both pass for reasons unrelated to what they claim to prove. The habit that catches both: run the check against the unfixed code and watch it fail before trusting that it passed.
