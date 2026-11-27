import Std

namespace BucketMath.Learning.Cognate

variable {L W : Type}

def Recognized (cognate : L → W → Bool) (held : List L) (w : W) : Bool :=
  held.any (fun l => cognate l w)

def CoveredMass (cognate : L → W → Bool) (held : List L) (text : List (W × Nat)) : Nat :=
  ((text.filter (fun p => Recognized cognate held p.1)).map Prod.snd).sum

def TotalMass (text : List (W × Nat)) : Nat :=
  (text.map Prod.snd).sum

def CognateCoverage (cognate : L → W → Bool) (held : List L) (text : List (W × Nat)) : Rat :=
  (CoveredMass cognate held text : Rat) / (TotalMass text : Rat)

theorem recognized_mono (cognate : L → W → Bool) {small large : List L}
    (sub : ∀ l, l ∈ small → l ∈ large) (w : W)
    (h : Recognized cognate small w = true) : Recognized cognate large w = true := by
  unfold Recognized at *
  rw [List.any_eq_true] at *
  obtain ⟨l, hl, hc⟩ := h
  exact ⟨l, sub l hl, hc⟩

theorem coveredMass_mono (cognate : L → W → Bool) {small large : List L}
    (sub : ∀ l, l ∈ small → l ∈ large) (text : List (W × Nat)) :
    CoveredMass cognate small text ≤ CoveredMass cognate large text := by
  induction text with
  | nil => simp [CoveredMass]
  | cons p rest ih =>
      unfold CoveredMass at *
      by_cases hs : Recognized cognate small p.1 = true
      · have hl := recognized_mono cognate sub p.1 hs
        simp [hs, hl]
        omega
      · by_cases hl : Recognized cognate large p.1 = true
        · simp [hs, hl]
          omega
        · simp [hs, hl]
          omega

theorem coveredMass_le_total (cognate : L → W → Bool) (held : List L) (text : List (W × Nat)) :
    CoveredMass cognate held text ≤ TotalMass text := by
  induction text with
  | nil => simp [CoveredMass, TotalMass]
  | cons p rest ih =>
      unfold CoveredMass TotalMass at *
      by_cases hs : Recognized cognate held p.1 = true
      · simp [hs]
        omega
      · simp [hs]
        omega

theorem natCast_inv_nonneg (n : Nat) : 0 ≤ ((n : Rat))⁻¹ := by
  by_cases hz : n = 0
  · subst hz
    simp [Rat.inv_zero]
  · exact Rat.le_of_lt (Rat.inv_pos.mpr (by exact_mod_cast Nat.pos_of_ne_zero hz))

theorem coverage_mono (cognate : L → W → Bool) {small large : List L}
    (sub : ∀ l, l ∈ small → l ∈ large) (text : List (W × Nat)) :
    CognateCoverage cognate small text ≤ CognateCoverage cognate large text := by
  unfold CognateCoverage
  rw [Rat.div_def, Rat.div_def]
  have h : (CoveredMass cognate small text : Rat) ≤ (CoveredMass cognate large text : Rat) := by
    exact_mod_cast coveredMass_mono cognate sub text
  exact Rat.mul_le_mul_of_nonneg_right h (natCast_inv_nonneg _)

theorem coverage_le_one (cognate : L → W → Bool) (held : List L) (text : List (W × Nat)) :
    CognateCoverage cognate held text ≤ 1 := by
  unfold CognateCoverage
  rw [Rat.div_def]
  have h : (CoveredMass cognate held text : Rat) ≤ (TotalMass text : Rat) := by
    exact_mod_cast coveredMass_le_total cognate held text
  by_cases hz : TotalMass text = 0
  · rw [hz]
    simp [Rat.inv_zero]
    decide
  · have hne : (TotalMass text : Rat) ≠ 0 := by exact_mod_cast hz
    rw [← Rat.mul_inv_cancel _ hne]
    exact Rat.mul_le_mul_of_nonneg_right h (natCast_inv_nonneg _)

theorem coverage_nonneg (cognate : L → W → Bool) (held : List L) (text : List (W × Nat)) :
    0 ≤ CognateCoverage cognate held text := by
  unfold CognateCoverage
  rw [Rat.div_def]
  exact Rat.mul_nonneg (by exact_mod_cast Nat.zero_le _) (natCast_inv_nonneg _)

theorem coverage_empty (cognate : L → W → Bool) (text : List (W × Nat)) :
    CognateCoverage cognate [] text = 0 := by
  have h : CoveredMass cognate [] text = 0 := by
    induction text with
    | nil => rfl
    | cons p rest ih =>
        unfold CoveredMass at *
        simpa [Recognized] using ih
  unfold CognateCoverage
  rw [h, Rat.div_def]
  simp

end BucketMath.Learning.Cognate
