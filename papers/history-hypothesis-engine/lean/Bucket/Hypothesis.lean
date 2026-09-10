import Bucket.Timeline
import Bucket.Concept

/-!
# Hypotheses: placements and sequences

`TIMELINE-AND-COMBINATORICS-SPEC.md` intro paragraph: "Every hypothesis
takes one of two base forms: a placement, 'event E happened in time
interval T,' or a sequence, 'E1 then E2.'" A placement fills the six
non-relational slots from `Bucket.Concept.Slot` and pins them to a
`Bucket.Timeline.Interval`; a sequence pairs two placements with the
Allen relation between them.
-/

namespace Bucket.Hypothesis

/-- A placement hypothesis: "actor performed action on object at place
via mechanism, during this interval"
(`TIMELINE-AND-COMBINATORICS-SPEC.md` §2-3). Slot values are carried by
`Bucket.Concept.Concept.id` rather than the concept itself, so a
placement is a plain data record independent of which `Vocabulary` its
concepts happen to live in. -/
structure Placement where
  actor : String
  action : String
  object : String
  place : String
  mechanism : String
  interval : Bucket.Timeline.Interval
  deriving Repr

/-- A sequence hypothesis: two placements related by one of Allen's
thirteen relations (`TIMELINE-AND-COMBINATORICS-SPEC.md` §2-3,
`H_seq = H x ALLEN_RELATION x H`). -/
structure Sequence where
  first : Placement
  second : Placement
  relation : Bucket.Timeline.AllenRelation
  deriving Repr

end Bucket.Hypothesis
