import BucketMath.Learning.Coverage

namespace BucketMath.Similarity

open BucketMath.Learning.Cognate

variable {L W : Type}

structure Thresholds where
  meaning : Nat
  script : Nat
  phonetic : Nat
  subword : Nat

structure Axes (L W : Type) where
  meaning : L → W → Nat
  script : L → W → Nat
  phonetic : L → W → Nat
  subword : L → W → Nat

def formSimilar (ax : Axes L W) (θ : Thresholds) (l : L) (w : W) : Bool :=
  decide (θ.meaning ≤ ax.meaning l w) &&
    (decide (ax.script l w ≤ θ.script) || decide (ax.phonetic l w ≤ θ.phonetic) ||
      decide (θ.subword ≤ ax.subword l w))

def Looser (θ θ' : Thresholds) : Prop :=
  θ'.meaning ≤ θ.meaning ∧ θ.script ≤ θ'.script ∧ θ.phonetic ≤ θ'.phonetic ∧
    θ'.subword ≤ θ.subword

theorem formSimilar_looser (ax : Axes L W) {θ θ' : Thresholds} (h : Looser θ θ') (l : L) (w : W)
    (hc : formSimilar ax θ l w = true) : formSimilar ax θ' l w = true := by
  obtain ⟨hm, hs, hp, hw⟩ := h
  simp only [formSimilar, Bool.and_eq_true, Bool.or_eq_true, decide_eq_true_eq] at *
  refine ⟨by omega, ?_⟩
  rcases hc.2 with (h | h) | h
  · exact Or.inl (Or.inl (by omega))
  · exact Or.inl (Or.inr (by omega))
  · exact Or.inr (by omega)

theorem coveredMass_implies {c c' : L → W → Bool} (imp : ∀ l w, c l w = true → c' l w = true)
    (held : List L) (text : List (W × Nat)) :
    CoveredMass c held text ≤ CoveredMass c' held text := by
  have lift : ∀ w, Recognized c held w = true → Recognized c' held w = true := by
    intro w h
    unfold Recognized at *
    rw [List.any_eq_true] at *
    obtain ⟨l, hl, hc⟩ := h
    exact ⟨l, hl, imp l w hc⟩
  induction text with
  | nil => simp [CoveredMass]
  | cons p rest ih =>
      unfold CoveredMass at *
      by_cases hs : Recognized c held p.1 = true
      · simp [hs, lift p.1 hs]; omega
      · by_cases hl : Recognized c' held p.1 = true
        · simp [hs, hl]; omega
        · simp [hs, hl]; omega

theorem formSimilar_contributes (c : L → W → Bool) {held : List L} {l : L} {w : W} {k : Nat}
    {text : List (W × Nat)} (hl : l ∈ held) (hw : (w, k) ∈ text) (hc : c l w = true) :
    k ≤ CoveredMass c held text := by
  have hr : Recognized c held w = true := by
    unfold Recognized
    exact List.any_eq_true.mpr ⟨l, hl, hc⟩
  induction text with
  | nil => simp at hw
  | cons p rest ih =>
      unfold CoveredMass at *
      rcases List.mem_cons.mp hw with h | h
      · subst h
        simp [hr]
      · have := ih h
        by_cases hs : Recognized c held p.1 = true
        · simp [hs]; omega
        · simp [hs]; omega

theorem formSimilar_axes_contribute (ax : Axes L W) (θ : Thresholds) {held : List L} {l : L} {w : W}
    {k : Nat} {text : List (W × Nat)} (hl : l ∈ held) (hw : (w, k) ∈ text)
    (hc : formSimilar ax θ l w = true) : k ≤ CoveredMass (formSimilar ax θ) held text :=
  formSimilar_contributes _ hl hw hc

theorem looser_coverage (ax : Axes L W) {θ θ' : Thresholds} (h : Looser θ θ')
    (held : List L) (text : List (W × Nat)) :
    CognateCoverage (formSimilar ax θ) held text ≤ CognateCoverage (formSimilar ax θ') held text := by
  unfold CognateCoverage
  rw [Rat.div_def, Rat.div_def]
  have hm : (CoveredMass (formSimilar ax θ) held text : Rat) ≤ CoveredMass (formSimilar ax θ') held text := by
    exact_mod_cast coveredMass_implies (formSimilar_looser ax h) held text
  exact Rat.mul_le_mul_of_nonneg_right hm (natCast_inv_nonneg _)

def subwordOff (ax : Axes L W) : Axes L W := { ax with subword := fun _ _ => 0 }

theorem subword_adds_coverage (ax : Axes L W) (θ : Thresholds) (hθ : 0 < θ.subword)
    (held : List L) (text : List (W × Nat)) :
    CoveredMass (formSimilar (subwordOff ax) θ) held text ≤ CoveredMass (formSimilar ax θ) held text := by
  apply coveredMass_implies
  intro l w hc
  simp [formSimilar, subwordOff] at hc ⊢
  rcases hc with ⟨h1, h2⟩
  refine ⟨of_decide_eq_true h1, ?_⟩
  rcases h2 with (h | h) | h
  · exact Or.inl (Or.inl (of_decide_eq_true h))
  · exact Or.inl (Or.inr (of_decide_eq_true h))
  · omega

end BucketMath.Similarity
