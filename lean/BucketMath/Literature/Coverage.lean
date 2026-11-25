import Std

namespace BucketMath.Literature.Coverage

variable {W : Type}

def covered (known : W → Bool) (text : List (W × Nat)) : Nat :=
  ((text.filter (fun p => known p.1)).map Prod.snd).sum

def total (text : List (W × Nat)) : Nat := (text.map Prod.snd).sum

def MeetsThreshold (pct : Nat) (known : W → Bool) (text : List (W × Nat)) : Prop :=
  pct * total text ≤ 100 * covered known text

theorem covered_le_total (known : W → Bool) (text : List (W × Nat)) : covered known text ≤ total text := by
  induction text with
  | nil => simp [covered, total]
  | cons p rest ih =>
      unfold covered total at *
      by_cases h : known p.1 = true <;> simp [h, List.filter_cons] <;> omega

theorem covered_mono {small large : W → Bool} (sub : ∀ w, small w = true → large w = true)
    (text : List (W × Nat)) : covered small text ≤ covered large text := by
  induction text with
  | nil => simp [covered]
  | cons p rest ih =>
      unfold covered at *
      by_cases hs : small p.1 = true
      · have hl := sub p.1 hs
        simp [hs, hl, List.filter_cons]; omega
      · by_cases hl : large p.1 = true
        · simp [hs, hl, List.filter_cons]; omega
        · simp [hs, hl, List.filter_cons]; omega

theorem threshold_mono_known {pct : Nat} {small large : W → Bool} (sub : ∀ w, small w = true → large w = true)
    {text : List (W × Nat)} (h : MeetsThreshold pct small text) : MeetsThreshold pct large text :=
  Nat.le_trans h (Nat.mul_le_mul_left 100 (covered_mono sub text))

theorem threshold_mono_pct {pct pct' : Nat} (hp : pct' ≤ pct) {known : W → Bool} {text : List (W × Nat)}
    (h : MeetsThreshold pct known text) : MeetsThreshold pct' known text :=
  Nat.le_trans (Nat.mul_le_mul_right _ hp) h

theorem ninetyEight_unknown_density {known : W → Bool} {text : List (W × Nat)}
    (h : MeetsThreshold 98 known text) : 50 * (total text - covered known text) ≤ total text := by
  have := covered_le_total known text
  unfold MeetsThreshold at h
  omega

theorem ninetyFive_unknown_density {known : W → Bool} {text : List (W × Nat)}
    (h : MeetsThreshold 95 known text) : 20 * (total text - covered known text) ≤ total text := by
  have := covered_le_total known text
  unfold MeetsThreshold at h
  omega

def claim_laufer_1989_coverage (comprehends : Prop) (known : W → Bool) (text : List (W × Nat)) : Prop :=
  MeetsThreshold 95 known text → comprehends

def claim_hu_2000_unknown_vocabulary_density (comprehends : Prop) (known : W → Bool) (text : List (W × Nat)) : Prop :=
  MeetsThreshold 98 known text → comprehends

theorem hu_threshold_implies_laufer {comprehends : Prop} {known : W → Bool} {text : List (W × Nat)}
    (hl : claim_laufer_1989_coverage comprehends known text) (h : MeetsThreshold 98 known text) : comprehends :=
  hl (threshold_mono_pct (by decide) h)

end BucketMath.Literature.Coverage
