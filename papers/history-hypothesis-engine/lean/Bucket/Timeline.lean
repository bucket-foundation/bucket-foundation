/-!
# Timeline substrate: intervals and Allen's interval algebra

`TIMELINE-AND-COMBINATORICS-SPEC.md` §1 fixes the engine's time axis as a
signed integer line in astronomical years and names Allen's thirteen
interval relations as the relation vocabulary for every sequence
hypothesis. This file gives both a Lean 4 home: `Interval` carries the
axis and an uncertainty tag, `AllenRelation` is the thirteen-constructor
relation type, and `relate` decides which relation holds between two
intervals.

Builds in core Lean 4 plus the `omega` and `decide` tactics that ship with
it; no Mathlib dependency (`papers/PAPER-STANDARDS.md`, "Lean rule"). The
converse proofs unfold a thirteen-branch decision chain and need more
than the default elaboration budget.
-/

set_option maxHeartbeats 4000000

namespace Bucket.Timeline

/-- How an interval's boundary is known, reusing the four-way split
`TIMELINE-AND-COMBINATORICS-SPEC.md` §1's `uncertainty.distribution` field
draws (`point`, `uniform`, `normal`, `oxcal-posterior`). `sampled` stands
in for the spec's `oxcal-posterior` case, whose payload is a sampled
posterior curve rather than a closed-form distribution. -/
inductive Uncertainty where
  | point
  | uniform
  | normal
  | sampled
  deriving DecidableEq, Repr, BEq

/-- A dated interval on the engine's astronomical-year axis
(`TIMELINE-AND-COMBINATORICS-SPEC.md` §1). `start ≤ stop` is carried as a
proof field rather than assumed, so no downstream lemma about the interval
has to re-derive it. -/
structure Interval where
  start : Int
  stop : Int
  le : start ≤ stop
  uncertainty : Uncertainty := .point
  deriving Repr

/-- Allen's thirteen interval relations
(`TIMELINE-AND-COMBINATORICS-SPEC.md` §1), the relation vocabulary for
every sequence hypothesis and every edge between two dated nodes. -/
inductive AllenRelation where
  | before
  | after
  | meets
  | metBy
  | overlaps
  | overlappedBy
  | starts
  | startedBy
  | during
  | contains
  | finishes
  | finishedBy
  | equal
  deriving DecidableEq, Repr, BEq

open AllenRelation in
/-- Decide which of the thirteen Allen relations holds between `a` and
`b`. The thirteen conditions below are checked in a fixed order, each
`else` falling through to the next, so exactly one branch fires for any
pair of intervals: `relate_total` below is the formal statement that this
is a well-defined function (trivially, since every Lean function is
total), and `relate_before_iff` through `relate_metBy_iff` characterize
each of the first four branches in closed arithmetic form. -/
def relate (a b : Interval) : AllenRelation :=
  if a.stop < b.start then before
  else if b.stop < a.start then after
  else if a.stop = b.start then meets
  else if b.stop = a.start then metBy
  else if a.start = b.start ∧ a.stop = b.stop then equal
  else if a.start = b.start ∧ a.stop < b.stop then starts
  else if a.start = b.start then startedBy
  else if a.stop = b.stop ∧ a.start < b.start then finishedBy
  else if a.stop = b.stop then finishes
  else if b.start < a.start ∧ a.stop < b.stop then during
  else if a.start < b.start ∧ b.stop < a.stop then contains
  else if a.start < b.start then overlaps
  else overlappedBy

/-- `relate` is total: every pair of intervals gets exactly one relation.
This holds by construction, since `relate` is a Lean function (every
function returns exactly one value for each input); the existence half
and the uniqueness half are spelled out separately here rather than
folded into `∃!` notation, which needs Mathlib. -/
theorem relate_total (a b : Interval) :
    ∃ r : AllenRelation, relate a b = r ∧ ∀ r', relate a b = r' → r' = r :=
  ⟨relate a b, rfl, fun _ hr' => hr'.symm⟩

theorem relate_before_iff (a b : Interval) :
    relate a b = .before ↔ a.stop < b.start := by
  have := a.le; have := b.le
  unfold relate
  constructor
  · intro h
    iterate 40 (all_goals (try split at h))
    all_goals (try (exact absurd h (by decide)))
    all_goals omega
  · intro h
    rw [if_pos h]

theorem relate_after_iff (a b : Interval) :
    relate a b = .after ↔ b.stop < a.start := by
  have := a.le; have := b.le
  unfold relate
  constructor
  · intro h
    iterate 40 (all_goals (try split at h))
    all_goals (try (exact absurd h (by decide)))
    all_goals omega
  · intro h
    have h1 : ¬ (a.stop < b.start) := by omega
    rw [if_neg h1, if_pos h]

/-- `relate a b = before` and `relate b a = after` are the same fact seen
from either interval, with no side condition: a strict gap between two
intervals reads as `before` from the earlier one and `after` from the
later one, unconditionally. -/
theorem relate_converse_before_after (a b : Interval) :
    relate a b = .before ↔ relate b a = .after := by
  rw [relate_before_iff, relate_after_iff]

theorem relate_meets_iff (a b : Interval) :
    relate a b = .meets ↔
      (¬ a.stop < b.start) ∧ (¬ b.stop < a.start) ∧ a.stop = b.start := by
  have hia := a.le; have hib := b.le
  constructor
  · intro h
    have h1 : ¬ a.stop < b.start := by
      intro hc
      have hh := (relate_before_iff a b).mpr hc
      rw [h] at hh
      exact absurd hh (by decide)
    have h2 : ¬ b.stop < a.start := by
      intro hc
      have hh := (relate_after_iff a b).mpr hc
      rw [h] at hh
      exact absurd hh (by decide)
    refine ⟨h1, h2, ?_⟩
    unfold relate at h
    rw [if_neg h1, if_neg h2] at h
    by_cases h3 : a.stop = b.start
    · exact h3
    · exfalso
      rw [if_neg h3] at h
      by_cases h4 : b.stop = a.start
      · rw [if_pos h4] at h; exact absurd h (by decide)
      · rw [if_neg h4] at h
        by_cases h5 : a.start = b.start ∧ a.stop = b.stop
        · rw [if_pos h5] at h; exact absurd h (by decide)
        · rw [if_neg h5] at h
          by_cases h6 : a.start = b.start ∧ a.stop < b.stop
          · rw [if_pos h6] at h; exact absurd h (by decide)
          · rw [if_neg h6] at h
            by_cases h7 : a.start = b.start
            · rw [if_pos h7] at h; exact absurd h (by decide)
            · rw [if_neg h7] at h
              by_cases h8 : a.stop = b.stop ∧ a.start < b.start
              · rw [if_pos h8] at h; exact absurd h (by decide)
              · rw [if_neg h8] at h
                by_cases h9 : a.stop = b.stop
                · rw [if_pos h9] at h; exact absurd h (by decide)
                · rw [if_neg h9] at h
                  by_cases h10 : b.start < a.start ∧ a.stop < b.stop
                  · rw [if_pos h10] at h; exact absurd h (by decide)
                  · rw [if_neg h10] at h
                    by_cases h11 : a.start < b.start ∧ b.stop < a.stop
                    · rw [if_pos h11] at h; exact absurd h (by decide)
                    · rw [if_neg h11] at h
                      by_cases h12 : a.start < b.start
                      · rw [if_pos h12] at h; exact absurd h (by decide)
                      · rw [if_neg h12] at h
                        exact absurd h (by decide)
  · rintro ⟨h1, h2, h3⟩
    unfold relate
    rw [if_neg h1, if_neg h2, if_pos h3]

theorem relate_metBy_iff (a b : Interval) :
    relate a b = .metBy ↔
      (¬ a.stop < b.start) ∧ (¬ b.stop < a.start) ∧
        (¬ a.stop = b.start) ∧ b.stop = a.start := by
  have hia := a.le; have hib := b.le
  constructor
  · intro h
    have h1 : ¬ a.stop < b.start := by
      intro hc
      have hh := (relate_before_iff a b).mpr hc
      rw [h] at hh; exact absurd hh (by decide)
    have h2 : ¬ b.stop < a.start := by
      intro hc
      have hh := (relate_after_iff a b).mpr hc
      rw [h] at hh; exact absurd hh (by decide)
    have h3 : ¬ a.stop = b.start := by
      intro hc
      have hh := (relate_meets_iff a b).mpr ⟨h1, h2, hc⟩
      rw [h] at hh; exact absurd hh (by decide)
    refine ⟨h1, h2, h3, ?_⟩
    unfold relate at h
    rw [if_neg h1, if_neg h2, if_neg h3] at h
    by_cases h4 : b.stop = a.start
    · exact h4
    · exfalso
      rw [if_neg h4] at h
      by_cases h5 : a.start = b.start ∧ a.stop = b.stop
      · rw [if_pos h5] at h; exact absurd h (by decide)
      · rw [if_neg h5] at h
        by_cases h6 : a.start = b.start ∧ a.stop < b.stop
        · rw [if_pos h6] at h; exact absurd h (by decide)
        · rw [if_neg h6] at h
          by_cases h7 : a.start = b.start
          · rw [if_pos h7] at h; exact absurd h (by decide)
          · rw [if_neg h7] at h
            by_cases h8 : a.stop = b.stop ∧ a.start < b.start
            · rw [if_pos h8] at h; exact absurd h (by decide)
            · rw [if_neg h8] at h
              by_cases h9 : a.stop = b.stop
              · rw [if_pos h9] at h; exact absurd h (by decide)
              · rw [if_neg h9] at h
                by_cases h10 : b.start < a.start ∧ a.stop < b.stop
                · rw [if_pos h10] at h; exact absurd h (by decide)
                · rw [if_neg h10] at h
                  by_cases h11 : a.start < b.start ∧ b.stop < a.stop
                  · rw [if_pos h11] at h; exact absurd h (by decide)
                  · rw [if_neg h11] at h
                    by_cases h12 : a.start < b.start
                    · rw [if_pos h12] at h; exact absurd h (by decide)
                    · rw [if_neg h12] at h
                      exact absurd h (by decide)
  · rintro ⟨h1, h2, h3, h4⟩
    unfold relate
    rw [if_neg h1, if_neg h2, if_neg h3, if_pos h4]

/-- `relate a b = meets` and `relate b a = metBy` agree, with one
non-degeneracy side condition. `meets` and `metBy` share a boundary check
(`a.stop = b.start` versus `b.stop = a.start`) that both hold at once
exactly when `a` and `b` collapse to the same zero-length instant
(`a.start = a.stop = b.start = b.stop`); `relate` breaks that tie in
`meets`'s favor on both sides, since `meets` is checked first in the
definition above, so the pure converse fails on that one instant-on-instant
case. Excluding it (at least one interval has positive length) restores
the converse. -/
theorem relate_converse_meets_metBy (a b : Interval)
    (hnondeg : a.start < a.stop ∨ b.start < b.stop) :
    relate a b = .meets ↔ relate b a = .metBy := by
  have hia := a.le; have hib := b.le
  rw [relate_meets_iff, relate_metBy_iff]
  constructor
  · rintro ⟨h1, h2, h3⟩
    exact ⟨by omega, by omega, by omega, by omega⟩
  · rintro ⟨h1, h2, h3, h4⟩
    exact ⟨by omega, by omega, by omega⟩

end Bucket.Timeline
