# Allen-relations check

`hte.temporal_consistency`, PLAN.md section 10 item 7 (Allen 1983,
doi:10.1145/182.358434): "Check that the address scheme preserves all
thirteen Allen interval relations instead of forcing a total order."

The address scheme already carries a sequence hypothesis's RELATION slot
as a free value, one of the thirteen `hte.timeline.AllenRelation`s,
alongside the two placements it joins (`hte.address.encode_sequence_
indices`, `hte.hypothesis.Sequence`). Nothing upstream checked that value
against the two placements' own `interval` fields. `hte.generate.
neighbors`'s relation-mutation branch deliberately builds every other
Allen relation on the same fixed pair of placements, so the tournament can
weigh an alternate-ordering hypothesis on its evidence merit; every one of
those alternates but the true one is, by construction, inconsistent with
the intervals its own two placements already carry.

## Contract

- `check_sequence(hypothesis)`: `None` for a non-sequence hypothesis, or a
  sequence hypothesis whose claimed relation matches
  `relate(first.interval, second.interval)` exactly. A
  `TemporalInconsistency` otherwise, naming both placements and both
  relations. Never raises: an inconsistent claim is a fact about the
  hypothesis worth surfacing, kept visible in a caller's downstream
  totals instead of dropped.
- `flag_hypothesis(hypothesis)`: runs `check_sequence` and, only when it
  finds an inconsistency, sets
  `hypothesis.meta["temporal_inconsistency"]` to that finding's own
  `to_dict()`. Mutates `hypothesis.meta` in place and returns the same
  object. A no-op for a consistent sequence or a non-sequence hypothesis;
  `meta` carries no such key in either case, so a plain `"meta" == {}`
  check keeps meaning what it already means elsewhere in this package.
- `check_hypotheses(hypotheses)`: every `TemporalInconsistency`
  `check_sequence` finds across a population, in iteration order, for a
  campaign-level report.

`TemporalInconsistency` carries `first`/`second` (human-readable
placement labels, actor/action/object plus interval) and
`claimed_relation`/`actual_relation` (the `AllenRelation.value` strings).

## Wiring

`hte.generate.neighbors` calls `flag_hypothesis` on every relation-mutation
candidate it yields: holding both placements' own intervals fixed while
varying only the claimed relation means every alternate but the one
`hte.timeline.relate` would derive is inconsistent with those intervals by
construction. The tournament still scores every alternate on its evidence
merit; a downstream reader sees which alternates disagree with the dates
via `meta["temporal_inconsistency"]`.

## Tests

`tests/test_temporal_consistency.py`, 11 tests: `check_sequence` against a
non-sequence hypothesis, a matching relation, and a mismatched one (label
and `to_dict()` shape checked); `flag_hypothesis`'s meta mutation on an
inconsistent sequence and its no-op on a consistent one and on a
non-sequence hypothesis; `check_hypotheses` collecting only the
inconsistent members of a mixed population; the `generate.neighbors`
integration flagging every alternate relation but the true one, and
leaving the one alternate that matches the intervals unflagged; and a case
against `hte.corpus.sacred_history`'s own dating fields, an inconsistent
DURING claim against two real events flagged, the correct BEFORE claim
left clean.
