/-!
# Concept ontology: slots, concepts, and the open-world vocabulary

`TIMELINE-AND-COMBINATORICS-SPEC.md` §2 gives a hypothesis its slot frame,
ACTOR/ACTION/OBJECT/PLACE/TIME/MECHANISM/RELATION, and a `concept` node per
slot value carrying its own editable base rate. `IDEAL-STATE-AND-UNKNOWNS-
SPEC.md` §6a adds an open-world `OTHER` concept to every slot so a value
outside the closed vocabulary can still be addressed. This file gives both
a Lean home.
-/

namespace Bucket.Concept

/-- The seven hypothesis slots (`TIMELINE-AND-COMBINATORICS-SPEC.md` §2).
The first six fill a placement hypothesis; `relation` fills a sequence
hypothesis only, drawn from `Bucket.Timeline.AllenRelation`. -/
inductive Slot where
  | actor
  | action
  | object
  | place
  | time
  | mechanism
  | relation
  deriving DecidableEq, Repr, BEq

/-- How a concept stands against the corpus's own reading, extending the
`stance` vocabulary `ENTITY-MODEL.md` §5 already uses on claims
(`TIMELINE-AND-COMBINATORICS-SPEC.md` §2's `consensus_status`). `other`
marks the open-world placeholder from `IDEAL-STATE-AND-UNKNOWNS-SPEC.md`
§6a rather than a graded stance. -/
inductive ConsensusStatus where
  | consensus
  | contested
  | fringe
  | other
  deriving DecidableEq, Repr, BEq

/-- A single slot value: an id, the slot it fills, an editable base rate
in log-odds (`prior_logit`), and a consensus reading
(`TIMELINE-AND-COMBINATORICS-SPEC.md` §2). `priorLogit` is a `Float` here
to match the field's use as a tunable, human-edited number; `Bucket.Belief`
carries the `Rat` counterpart wherever a theorem needs to compute with it. -/
structure Concept where
  id : String
  slot : Slot
  priorLogit : Float
  consensusStatus : ConsensusStatus
  deriving Repr

/-- The canonical id of a slot's open-world placeholder concept. -/
def otherId : Slot → String
  | .actor => "other-actor"
  | .action => "other-action"
  | .object => "other-object"
  | .place => "other-place"
  | .time => "other-time"
  | .mechanism => "other-mechanism"
  | .relation => "other-relation"

/-- The open-world placeholder concept for a slot
(`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6a): a near-neutral base rate
(`priorLogit := 0`) and `consensusStatus := .other`, so a value outside
the closed vocabulary still gets an address, a prior, and a place in the
frontier. -/
def otherConcept (s : Slot) : Concept :=
  { id := otherId s, slot := s, priorLogit := 0.0, consensusStatus := .other }

/-- A slot-indexed vocabulary that is never missing its open-world
placeholder: `hasOther` is a proof field, not a claim to check later, so
every `Vocabulary` value carries the guarantee by construction. -/
structure Vocabulary where
  bySlot : Slot → List Concept
  hasOther : ∀ s : Slot, otherConcept s ∈ bySlot s

/-- Looking up the `other` concept in any slot always succeeds: it is a
member of that slot's vocabulary list for every vocabulary and every slot,
by `Vocabulary.hasOther`. This is the "lookup of `other` succeeds for
every slot" guarantee `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6a asks for,
stated as its own theorem so callers do not have to know the field name to
rely on it. -/
theorem lookup_other_succeeds (v : Vocabulary) (s : Slot) :
    otherConcept s ∈ v.bySlot s :=
  v.hasOther s

end Bucket.Concept
