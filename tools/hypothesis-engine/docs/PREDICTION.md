Prediction Register
====================

Every calibration pass this package runs (`hte.calibrate.run_holdout`,
`holdout_kfold`) scores the engine against evidence it already has: a
discovery-date or k-fold split of a corpus that already exists on disk.
That answers one question, does the belief model read existing evidence
well. It does not answer a second, harder one: does the graph's own
prior, the part carried by `Hypothesis.prior_logit` and the four `hte.
unknowns.prior_profiles`, say anything real about the world before new
evidence arrives.

`hte.predict` is that second test. `register` turns one completed run's
own survivors and structural gaps into dated, timestamped forecasts,
committed to an append-only ledger before anyone knows the answer.
`resolve` scores those forecasts, later, against whatever evidence
corpus stands in for the world as of a given date. A graph whose forward
predictions come back well calibrated, low Brier, a reliability curve
near the diagonal, has a prior worth trusting. One that does not, does
not, and this is the one place that distinction gets measured on the
record.

## What a prediction is

A `Prediction` carries `P` and `u`, the same projected probability and
uncertainty mass every `Opinion` carries (`P = b + a*u`, `hte.belief.
Opinion.project`), `a`, the base rate behind it, and `profile_spread`,
the range `P` takes across the four prior profiles consensus, skeptic,
fringe, uniform (`hte.unknowns.robustness`). A forecast with a narrow
spread says the same thing under every profile; a wide spread says the
bet rides on which profile turns out right, worth flagging alongside the
number itself.

`P` and `u` are not free parameters. `u` close to `1` means the graph has
seen little or no evidence naming this hypothesis; `a` alone carries the
bet, no real call at all. A claim is worth registering only past that
point: `u_max` (default `0.5`) keeps `register` from forecasting on
hypotheses evidence has not yet reached, and a second gate,
`_CLAIM_CONFIDENCE_MIN` (`0.15`), keeps it from registering an
examined-but-undecided hypothesis whose supporting and refuting weight
canceled out near its own prior, `P` sitting close to `a` regardless of
how low `u` has dropped. A claim registers when `u <= u_max` AND
`|P - a| >= 0.15`: examined, and moved.

The earlier reading of this gate (`u >= floor_u`, `0.9`) selected the
OPPOSITE population, the least-examined hypotheses a run carries. On a
real run most survivors clear a tournament and a critique pass before
`timeline.json` ever names them, so most of them already carry some
linked evidence and a moderate `u`; that reading came back with zero
claim predictions on `runs/quantum-history/20260910T085020Z`, a real
finding about the run's own population, but also the wrong one to
register: a bet on an unexamined hypothesis is not the engine's own
confident call, only its bare prior. `floor_u` still gates `sequence`
predictions below, where the earlier reading remains correct (see that
kind's own paragraph).

## Three kinds

**claim.** A placement hypothesis reconstructed from the run (`hte.
canon_writeback.reconstruct_candidates`'s own technique: re-ingest the
named corpus, replay `MANIFEST.json`'s `vocab_added`, rebuild each
survivor's `Placement` from its persisted slots and time bin, relink
evidence, rescore with `hte.belief.score`), examined and confident
(`u <= u_max` and `|P - a| >= 0.15`): "this actor performed this
action, in this place, via this mechanism, dated to this interval,
will be attested by new evidence by the horizon."

`hte.predict._reconstruct` links only evidence carrying at least one
extracted slot. `hte.link.link_evidence` also links an item carrying a
dated interval and no slot at all against every placement sharing that
date, real signal for the engine loop's own use of that function, but it
collapses every survivor's own `u` toward the same low floor regardless
of how much slot-specific evidence backs it, since one dateless-but-dated
item then touches the whole population at once. Filtering it out here
keeps `u` reading real per-hypothesis examination, the reading `u_max`
needs to mean anything; `hte.belief.score` still scores every item in
the corpus, a slotless item never entered any hypothesis's
`supports`/`refutes` list, so it contributes zero pooled weight either
way.

**discovery.** The highest-value gap nodes (`hte.unknowns.
unresolved_slot_gaps`, ranked by value of information): "evidence of
this kind, naming this evidence item's own missing slots, will be found
by the horizon," staked at the gap's own VOI. A discovery prediction
carries no single hypothesis to read `u` off, so its opinion is the flat
prior `Opinion(b=0, d=0, u=1, a)`, with `a` read off the run's own
Good-Turing missing-mass estimate (`MANIFEST.json["counts"]["coverage"]
["missing_mass"]`, default `0.5` when a run carries none): the corpus's
own measured rate of finding something new is the base rate for finding
something new about this one gap.

**sequence.** An Allen-relation claim between two reconstructed
placements (`hte.generate.sequences_from`), scored on its own sequence
address the same way a claim is scored on its own placement address:
"this relation holds between these two events, and will be attested by
evidence by the horizon." No evidence item's `supports`/`refutes` ever
names a sequence address (`hte.link.link_evidence`'s own documented
scope: it links placements only), so a sequence prediction's own `u`
reads `1.0` every time, a real, structural property of this engine's
belief model rather than a shortcut this module takes: a sequence
hypothesis rides entirely on its own prior until a future pass links
evidence to sequence addresses too. `floor_u` (default `0.9`, `u >=
floor_u`) still gates this kind, and the gate is a no-op today for
exactly that reason; it stays in place for the day a sequence carries
real linked evidence and a real `u` to gate on.

## The ledger and its receipt

`register` appends to `<out>/ledger.jsonl`, one JSON object per line,
oldest first, deduplicated by `id` and never rewritten: a second
`register` call over a different run, or the same run at a different
`made_at`, only ever adds lines after the ones already there. `id` is a
short hash of the prediction's own kind, run id, natural key (a
hypothesis address, or a gap id), and `made_at`, so two `register` calls
made at the identical `made_at` over the identical run produce byte-
identical predictions, the property that makes a re-run of `register`
safe to check against a previous one.

Every prediction also carries a feed402-shaped `envelope` (`PROTOCOL.md`
§4): a `citation` block whose `type` is `"prediction"`, the additive
extension point `PROTOCOL.md` §3.1 and `CLAUDE.md`'s own feed402 forward-
compat note both name (sibling to DerbyFish's `derbyfish.bhrv.v2`), and a
`receipt` that is a placeholder throughout, `price_usd: 0`, `status:
"forecast_registered_not_yet_resolved"`, since no x402 settlement has
happened over a forecast that has not resolved. `register` also emits
one `predict_register` event through `tools/feed/feed.py`'s own
`cmd_update`, so a forecast lands on the canon activity feed the same
way an `add_canon_entry` event does.

`meta` on each `Prediction` carries the structured fields `resolve`
needs to rebuild the underlying placement, sequence, or gap from the
ledger alone, since the ledger is the only durable record of a forecast
and nothing resolution depends on may live only in memory: slots and an
interval for a claim, both members' slots and intervals plus the
relation for a sequence, and the origin evidence id, unresolved slot
names, and evidence kind for a discovery. Nothing in a `Prediction`, its
`meta` included, is a filesystem path; `run_id` is a label
(`f"{campaign}-{timestamp}"`, `hte.canon_writeback.RunContext.run_id`'s
own convention), so the ledger stays portable across checkouts and
worktrees.

## Resolution and reliability

`resolve(ledger, evidence_corpus=..., as_of=...)` scores every
prediction whose `resolves_at` falls at or before `as_of`, using the
identical slot-and-interval matcher `hte.calibrate.run_holdout` scores
its own holdout with (`hte.calibrate._matches_event`, imported, never
reimplemented): a candidate placement matches a target evidence item
when every slot the target names agrees, with at least one real,
resolved match among them.

- **claim**: attested when some evidence item matches the claim's own
  slots at a compatible date; refuted when one matches the slots but at
  a disjoint date, a competing dated claim for the same event; a claim
  with no matching evidence at all stays unresolved even past its own
  date, since silence is not proof of refutation, only `hte.calibrate.
  run_holdout`'s own "uncovered" reading, carried forward to a bet made
  ahead of time instead of behind it.
- **sequence**: the same reading applied to both members: attested when
  dated evidence exists for both events and their actual relation
  matches the one predicted, refuted when it exists for both and
  disagrees, unresolved when dated evidence for at least one member is
  still missing.
- **discovery**: attested when an evidence item of the named kind now
  supplies every slot the gap once left unresolved, refuted when none
  has by the horizon. A discovery prediction carries no third reading
  the way a claim does: "evidence will be found by this date" either
  happened by then or it did not, so past its own date it resolves to
  one of the two, never unresolved.

Every attested or refuted outcome scores a Brier component,
`(P - observed)^2`, `observed` `1.0` or `0.0`; an unresolved one scores
none, matching `hte.calibrate.brier_score`'s own "nothing to score"
convention rather than a division by zero. `resolve` writes `<out>/
RESOLUTIONS.md` (default: the ledger's own parent directory): counts by
outcome, a Brier score per kind, a 10-bin reliability curve (`hte.
calibrate.calibration_curve`, imported), and Brier bucketed by the month
each resolved prediction's own `resolves_at` fell in, so a widening or
narrowing trend across cohorts of forecasts is visible rather than
buried in one aggregate number.

## Why this is the test that turns the graph into a measurable prior

A calibration pass over existing evidence can always be gamed after the
fact, by a corpus whose ground truth happens to sit close to what the
prior already favored, by a threshold picked once the answer is known.
A forecast committed to an append-only ledger before the evidence that
resolves it exists cannot be gamed that way: the prediction is fixed at
`made_at`, the world moves on its own, and `resolve` reads whatever it
finds. A graph that stays well calibrated under that test, low Brier
on claims made ahead of time, a reliability curve that tracks the
diagonal across the profiles `hte.unknowns.prior_profiles` builds, has
turned a fixed set of axioms and priors into something that predicts,
the property the whole engine claims for itself and the property no
holdout run over existing evidence can check on its own.

## Command lines

```bash
cd tools/hypothesis-engine

# Turn a completed run into dated forecasts, one year out.
python3 -m hte.cli predict register runs/quantum-history/<timestamp> \
  --horizon-days 365 --out predictions

# Score everything due as of a given date against a named corpus.
python3 -m hte.cli predict resolve --ledger predictions/ledger.jsonl \
  --corpus quantum-history --as-of 2027-09-10T00:00:00+00:00

# The same resolution pass, printing predictions/RESOLUTIONS.md.
python3 -m hte.cli predict report --ledger predictions/ledger.jsonl \
  --corpus quantum-history --as-of 2027-09-10T00:00:00+00:00
```

`register`'s Python entry point takes `kinds` (default `("claim",
"discovery", "sequence")`), `u_max` (default `0.5`, gates claims),
`floor_u` (default `0.9`, gates sequences), and `made_at` (default: now,
UTC; pin it to get the identical predictions back from a repeated call
over the identical run). `resolve` takes any `Corpus` already in memory,
or a path to a ledger it loads itself; a caller scripting a resolution
pass builds `evidence_corpus` however it likes, `hte.predict` reads only
its `.evidence` and `.vocab`.
