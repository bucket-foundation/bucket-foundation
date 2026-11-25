import Std

namespace BucketMath.Literature.Actr

def trace (U dec age : Nat) : Nat := U / (age + 1) ^ dec

def strength (U dec : Nat) (ages : List Nat) : Nat := (ages.map (trace U dec)).sum

def wait (Δ : Nat) (ages : List Nat) : List Nat := ages.map (· + Δ)

theorem trace_antitone_age (U dec : Nat) {a a' : Nat} (h : a ≤ a') : trace U dec a' ≤ trace U dec a :=
  Nat.div_le_div_left (Nat.pow_le_pow_left (by omega) dec) (Nat.pow_pos (by omega))

theorem trace_antitone_decay (U age : Nat) {dec dec' : Nat} (h : dec ≤ dec') :
    trace U dec' age ≤ trace U dec age :=
  Nat.div_le_div_left (Nat.pow_le_pow_right (by omega) h) (Nat.pow_pos (by omega))

theorem trace_fresh (U dec : Nat) : trace U dec 0 = U := by simp [trace]

theorem strength_practice_adds (U dec a : Nat) (ages : List Nat) :
    strength U dec (a :: ages) = trace U dec a + strength U dec ages := by
  simp [strength]

theorem strength_practice (U dec a : Nat) (ages : List Nat) :
    strength U dec ages ≤ strength U dec (a :: ages) := by
  rw [strength_practice_adds]; omega

theorem strength_decays (U dec Δ : Nat) (ages : List Nat) :
    strength U dec (wait Δ ages) ≤ strength U dec ages := by
  induction ages with
  | nil => simp [strength, wait]
  | cons a rest ih =>
      have := trace_antitone_age U dec (Nat.le_add_right a Δ)
      simp only [strength, wait, List.map_cons, List.map_map, List.sum_cons] at ih ⊢
      exact Nat.add_le_add this ih

theorem strength_antitone_decay (U : Nat) {dec dec' : Nat} (h : dec ≤ dec') (ages : List Nat) :
    strength U dec' ages ≤ strength U dec ages := by
  induction ages with
  | nil => simp [strength]
  | cons a rest ih =>
      rw [strength_practice_adds, strength_practice_adds]
      exact Nat.add_le_add (trace_antitone_decay U a h) ih

def claim_anderson_1991_reflections_environment_memory (needOdds : Nat → Nat) (U : Nat) : Prop :=
  ∃ dec, 0 < dec ∧ ∀ age, needOdds age = trace U dec age

theorem environment_need_falls {needOdds : Nat → Nat} {U : Nat}
    (h : claim_anderson_1991_reflections_environment_memory needOdds U) {a a' : Nat} (hle : a ≤ a') :
    needOdds a' ≤ needOdds a := by
  obtain ⟨dec, _, hm⟩ := h
  rw [hm, hm]; exact trace_antitone_age U dec hle

end BucketMath.Literature.Actr
