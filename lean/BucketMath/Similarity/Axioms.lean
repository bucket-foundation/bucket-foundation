import Std

namespace BucketMath.Similarity

variable {α : Type}

structure Pseudometric (d : α → α → Nat) : Prop where
  self : ∀ a, d a a = 0
  symm : ∀ a b, d a b = d b a
  triangle : ∀ a b c, d a c ≤ d a b + d b c

structure Metric (d : α → α → Nat) : Prop extends Pseudometric d where
  separate : ∀ a b, d a b = 0 → a = b

def Ultrametric (d : α → α → Nat) : Prop :=
  ∀ a b c, d a c ≤ max (d a b) (d b c)

def Bounded (d : α → α → Nat) (bound : Nat) : Prop :=
  ∀ a b, d a b ≤ bound

def Triangle (d : α → α → Int) : Prop :=
  ∀ a b c, d a c ≤ d a b + d b c

theorem ultra_triangle {d : α → α → Nat} (h : Ultrametric d) (a b c : α) :
    d a c ≤ d a b + d b c := by
  have := h a b c
  omega

theorem pullback_pseudo {β : Type} {d : β → β → Nat} (hd : Pseudometric d) (t : α → β) :
    Pseudometric (fun a b => d (t a) (t b)) :=
  ⟨fun a => hd.self (t a), fun a b => hd.symm (t a) (t b), fun a b c => hd.triangle (t a) (t b) (t c)⟩

def discrete [DecidableEq α] (a b : α) : Nat := if a = b then 0 else 1

theorem discrete_metric [DecidableEq α] : Metric (discrete (α := α)) where
  self a := by simp [discrete]
  symm a b := by
    unfold discrete
    by_cases h : a = b
    · subst h; rfl
    · rw [if_neg h, if_neg (Ne.symm h)]
  triangle a b c := by
    unfold discrete
    by_cases h1 : a = b <;> by_cases h2 : b = c <;> by_cases h3 : a = c <;> simp_all
  separate a b h := by
    unfold discrete at h
    by_cases hab : a = b
    · exact hab
    · rw [if_neg hab] at h; exact absurd h (by decide)

theorem discrete_ultra [DecidableEq α] : Ultrametric (discrete (α := α)) := by
  intro a b c
  unfold discrete
  by_cases h1 : a = b <;> by_cases h2 : b = c <;> by_cases h3 : a = c <;> simp_all

end BucketMath.Similarity
