import BucketMath.Learning.Coverage

namespace BucketMath.Learning.CognateAdjusted

open BucketMath.Learning.Cognate

variable {L W : Type}

def adjusted (w p : Rat) (r : Bool) : Rat := if r then (if p < w then w else p) else p

def AdjustedMass (cognate : L → W → Bool) (held : List L) (known : W → Rat) (w : Rat) : List W → Rat
  | [] => 0
  | x :: xs => adjusted w (known x) (Recognized cognate held x) + AdjustedMass cognate held known w xs

def AdjustedCoverage (cognate : L → W → Bool) (held : List L) (known : W → Rat) (w : Rat) (text : List W) : Rat :=
  AdjustedMass cognate held known w text / (text.length : Rat)

theorem rat_add_le_add {a b c d : Rat} (h1 : a ≤ b) (h2 : c ≤ d) : a + c ≤ b + d :=
  Rat.le_trans (Rat.add_le_add_right.mpr h1) (Rat.add_le_add_left.mpr h2)

theorem adjusted_mono {w p p' : Rat} {r r' : Bool} (hp : p ≤ p') (hr : r = true → r' = true) :
    adjusted w p r ≤ adjusted w p' r' := by
  cases r <;> cases r'
  · exact hp
  · show p ≤ (if p' < w then w else p')
    by_cases h' : p' < w
    · rw [if_pos h']
      exact Rat.le_trans hp (Rat.le_of_lt h')
    · rw [if_neg h']
      exact hp
  · exact absurd (hr rfl) (by simp)
  · show (if p < w then w else p) ≤ (if p' < w then w else p')
    by_cases h : p < w
    · rw [if_pos h]
      by_cases h' : p' < w
      · rw [if_pos h']
        exact Rat.le_refl
      · rw [if_neg h']
        exact Rat.not_lt.mp h'
    · rw [if_neg h]
      by_cases h' : p' < w
      · rw [if_pos h']
        exact Rat.le_trans hp (Rat.le_of_lt h')
      · rw [if_neg h']
        exact hp

theorem adjusted_bounds {w p : Rat} (r : Bool) (hw0 : 0 ≤ w) (hw1 : w ≤ 1) (hp0 : 0 ≤ p) (hp1 : p ≤ 1) :
    0 ≤ adjusted w p r ∧ adjusted w p r ≤ 1 := by
  unfold adjusted
  cases r <;> simp
  · exact ⟨hp0, hp1⟩
  · split
    · exact ⟨hw0, hw1⟩
    · exact ⟨hp0, hp1⟩

theorem mass_mono (cognate : L → W → Bool) {small large : List L} (sub : ∀ l, l ∈ small → l ∈ large)
    {known known' : W → Rat} (hk : ∀ x, known x ≤ known' x) (w : Rat) (text : List W) :
    AdjustedMass cognate small known w text ≤ AdjustedMass cognate large known' w text := by
  induction text with
  | nil => exact Rat.le_refl
  | cons x xs ih =>
      unfold AdjustedMass
      exact rat_add_le_add (adjusted_mono (hk x) (recognized_mono cognate sub x)) ih

theorem mass_bounds (cognate : L → W → Bool) (held : List L) {known : W → Rat} {w : Rat}
    (hw0 : 0 ≤ w) (hw1 : w ≤ 1) (hk : ∀ x, 0 ≤ known x ∧ known x ≤ 1) (text : List W) :
    0 ≤ AdjustedMass cognate held known w text ∧ AdjustedMass cognate held known w text ≤ (text.length : Rat) := by
  induction text with
  | nil => simp [AdjustedMass]
  | cons x xs ih =>
      unfold AdjustedMass
      have hb := adjusted_bounds (Recognized cognate held x) hw0 hw1 (hk x).1 (hk x).2
      refine ⟨Rat.add_nonneg hb.1 ih.1, ?_⟩
      have h := rat_add_le_add hb.2 ih.2
      rw [List.length_cons, Rat.natCast_add]
      simpa [Rat.add_comm] using h

theorem c1_bounds (cognate : L → W → Bool) (held : List L) {known : W → Rat} {w : Rat}
    (hw0 : 0 ≤ w) (hw1 : w ≤ 1) (hk : ∀ x, 0 ≤ known x ∧ known x ≤ 1) (text : List W) :
    0 ≤ AdjustedCoverage cognate held known w text ∧ AdjustedCoverage cognate held known w text ≤ 1 := by
  have hm := mass_bounds cognate held hw0 hw1 hk text
  unfold AdjustedCoverage
  rw [Rat.div_def]
  refine ⟨Rat.mul_nonneg hm.1 (natCast_inv_nonneg _), ?_⟩
  by_cases hz : text.length = 0
  · rw [hz]
    simp [Rat.inv_zero]
    decide
  · have hpos : (0 : Rat) < (text.length : Rat) := by exact_mod_cast Nat.pos_of_ne_zero hz
    have h := Rat.mul_le_mul_of_nonneg_right hm.2 (natCast_inv_nonneg text.length)
    rw [Rat.mul_inv_cancel _ (Rat.ne_of_gt hpos)] at h
    exact h

theorem c1_mono (cognate : L → W → Bool) {small large : List L} (sub : ∀ l, l ∈ small → l ∈ large)
    {known known' : W → Rat} (hk : ∀ x, known x ≤ known' x) (w : Rat) (text : List W) :
    AdjustedCoverage cognate small known w text ≤ AdjustedCoverage cognate large known' w text := by
  unfold AdjustedCoverage
  rw [Rat.div_def, Rat.div_def]
  exact Rat.mul_le_mul_of_nonneg_right (mass_mono cognate sub hk w text) (natCast_inv_nonneg _)

end BucketMath.Learning.CognateAdjusted
