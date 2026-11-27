import BucketMath.Similarity.Axioms

namespace BucketMath.Similarity

variable {α : Type}

def combined (w₁ w₂ : Nat) (d₁ d₂ : α → α → Nat) (a b : α) : Nat := w₁ * d₁ a b + w₂ * d₂ a b

theorem combined_pseudo {d₁ d₂ : α → α → Nat} (w₁ w₂ : Nat)
    (h₁ : Pseudometric d₁) (h₂ : Pseudometric d₂) : Pseudometric (combined w₁ w₂ d₁ d₂) where
  self a := by simp [combined, h₁.self a, h₂.self a]
  symm a b := by simp [combined, h₁.symm a b, h₂.symm a b]
  triangle a b c := by
    have t₁ := Nat.mul_le_mul_left w₁ (h₁.triangle a b c)
    have t₂ := Nat.mul_le_mul_left w₂ (h₂.triangle a b c)
    simp only [combined, Nat.mul_add] at *
    omega

theorem combined_metric {d₁ d₂ : α → α → Nat} {w₁ : Nat} (w₂ : Nat) (hw : 0 < w₁)
    (h₁ : Metric d₁) (h₂ : Pseudometric d₂) : Metric (combined w₁ w₂ d₁ d₂) where
  toPseudometric := combined_pseudo w₁ w₂ h₁.toPseudometric h₂
  separate a b h := by
    apply h₁.separate
    simp only [combined] at h
    have : w₁ * d₁ a b = 0 := by omega
    rcases Nat.mul_eq_zero.mp this with h0 | h0
    · omega
    · exact h0

theorem combined_bounded {d₁ d₂ : α → α → Nat} (w₁ w₂ : Nat) {B₁ B₂ : Nat}
    (h₁ : Bounded d₁ B₁) (h₂ : Bounded d₂ B₂) :
    Bounded (combined w₁ w₂ d₁ d₂) (w₁ * B₁ + w₂ * B₂) := by
  intro a b
  have := Nat.mul_le_mul_left w₁ (h₁ a b)
  have := Nat.mul_le_mul_left w₂ (h₂ a b)
  simp only [combined]
  omega

theorem combined_ultra_fails :
    ¬ Ultrametric (combined 1 1 (fun a b : Nat × Nat => discrete a.1 b.1)
      (fun a b : Nat × Nat => discrete a.2 b.2)) := by
  intro h
  have := h (0, 0) (0, 1) (1, 1)
  simp [combined, discrete] at this

theorem combined_ultra_components :
    Ultrametric (fun a b : Nat × Nat => discrete a.1 b.1) ∧
      Ultrametric (fun a b : Nat × Nat => discrete a.2 b.2) :=
  ⟨fun a b c => discrete_ultra a.1 b.1 c.1, fun a b c => discrete_ultra a.2 b.2 c.2⟩

end BucketMath.Similarity
