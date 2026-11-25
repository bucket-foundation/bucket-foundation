import Std

namespace BucketMath.Literature.Actr

def trace (U age : Nat) : Nat := U / (age + 1)

def strength (U : Nat) (ages : List Nat) : Nat := (ages.map (trace U)).sum

def wait (Δ : Nat) (ages : List Nat) : List Nat := ages.map (· + Δ)

theorem trace_antitone_age (U : Nat) {a a' : Nat} (h : a ≤ a') : trace U a' ≤ trace U a :=
  Nat.div_le_div_left (by omega) (by omega)

theorem trace_fresh (U : Nat) : trace U 0 = U := by simp [trace]

theorem strength_practice (U a : Nat) (ages : List Nat) : strength U ages ≤ strength U (a :: ages) := by
  simp [strength]

theorem strength_practice_adds (U a : Nat) (ages : List Nat) :
    strength U (a :: ages) = trace U a + strength U ages := by
  simp [strength]

theorem strength_decays (U Δ : Nat) (ages : List Nat) : strength U (wait Δ ages) ≤ strength U ages := by
  induction ages with
  | nil => simp [strength, wait]
  | cons a rest ih =>
      have := trace_antitone_age U (Nat.le_add_right a Δ)
      simp only [strength, wait, List.map_cons, List.map_map, List.sum_cons] at ih ⊢
      exact Nat.add_le_add this ih

theorem strength_mono_count (U : Nat) (ages more : List Nat) : strength U ages ≤ strength U (more ++ ages) := by
  simp [strength]

def claim_anderson_schooler_base_level (U : Nat) (ages : List Nat) (recall : Nat → Prop) : Prop :=
  ∀ s, s ≤ strength U ages → recall s

end BucketMath.Literature.Actr
