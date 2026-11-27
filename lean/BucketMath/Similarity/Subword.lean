import BucketMath.Similarity.Script
import BucketMath.Learning.Sequencing

namespace BucketMath.Similarity

open BucketMath.Learning.Sequencing (Ultra)

variable {α : Type}

def sharedPrefix [DecidableEq α] : List α → List α → Nat
  | x :: xs, y :: ys => if x = y then sharedPrefix xs ys + 1 else 0
  | _, _ => 0

theorem sharedPrefix_symm [DecidableEq α] : ∀ a b : List α, sharedPrefix a b = sharedPrefix b a
  | [], [] => rfl
  | [], _ :: _ => rfl
  | _ :: _, [] => rfl
  | x :: xs, y :: ys => by
      simp only [sharedPrefix]
      by_cases h : x = y
      · subst h; simp [sharedPrefix_symm xs ys]
      · rw [if_neg h, if_neg (Ne.symm h)]

theorem sharedPrefix_ultra [DecidableEq α] : ∀ a b c : List α,
    min (sharedPrefix a b) (sharedPrefix b c) ≤ sharedPrefix a c
  | [], _, _ => by simp [sharedPrefix]
  | _ :: _, [], _ => by simp [sharedPrefix]
  | _ :: _, _ :: _, [] => by simp [sharedPrefix]
  | x :: xs, y :: ys, z :: zs => by
      have ih := sharedPrefix_ultra xs ys zs
      simp only [sharedPrefix]
      by_cases h1 : x = y <;> by_cases h2 : y = z <;> simp_all <;> omega

theorem sharedPrefix_isUltra [DecidableEq α] : Ultra (sharedPrefix (α := α)) :=
  ⟨sharedPrefix_symm, sharedPrefix_ultra⟩

def sharedSuffix [DecidableEq α] (a b : List α) : Nat := sharedPrefix a.reverse b.reverse

theorem sharedSuffix_isUltra [DecidableEq α] : Ultra (sharedSuffix (α := α)) :=
  ⟨fun _ _ => sharedPrefix_symm _ _, fun _ _ _ => sharedPrefix_ultra _ _ _⟩

theorem sharedPrefix_le_length [DecidableEq α] : ∀ a b : List α, sharedPrefix a b ≤ a.length
  | [], _ => by simp [sharedPrefix]
  | _ :: _, [] => by simp [sharedPrefix]
  | x :: xs, y :: ys => by
      have := sharedPrefix_le_length xs ys
      simp only [sharedPrefix, List.length_cons]
      split <;> omega

def morphemeDistance [DecidableEq α] (depth : Nat) (a b : List α) : Nat :=
  depth - min depth (sharedPrefix a b)

theorem morphemeDistance_ultra [DecidableEq α] (depth : Nat) :
    Ultrametric (morphemeDistance (α := α) depth) := by
  intro a b c
  have := sharedPrefix_ultra a b c
  simp only [morphemeDistance]
  omega

theorem sharedPrefix_self [DecidableEq α] : ∀ a : List α, sharedPrefix a a = a.length
  | [] => rfl
  | x :: xs => by simp [sharedPrefix, sharedPrefix_self xs]

theorem morphemeDistance_self [DecidableEq α] (depth : Nat) (a : List α)
    (h : depth ≤ a.length) : morphemeDistance depth a a = 0 := by
  simp only [morphemeDistance, sharedPrefix_self]
  omega

theorem morphemeDistance_not_separating :
    morphemeDistance 2 [1, 2, 3] [1, 2, 4] = 0 ∧ ([1, 2, 3] : List Nat) ≠ [1, 2, 4] := by
  decide

theorem ngram_metric : Metric (hamming (α := Bool)) := hamming_metric

def overlap : List Bool → List Bool → Nat
  | x :: xs, y :: ys => (if x && y then 1 else 0) + overlap xs ys
  | _, _ => 0

def union : List Bool → List Bool → Nat
  | x :: xs, y :: ys => (if x || y then 1 else 0) + union xs ys
  | x :: xs, [] => (if x then 1 else 0) + union xs []
  | [], y :: ys => (if y then 1 else 0) + union [] ys
  | [], [] => 0

theorem overlap_le_union : ∀ a b : List Bool, overlap a b ≤ union a b
  | [], [] => by simp [overlap, union]
  | [], y :: ys => by simp [overlap]
  | x :: xs, [] => by simp [overlap]
  | x :: xs, y :: ys => by
      have := overlap_le_union xs ys
      simp only [overlap, union]
      cases x <;> cases y <;> simp <;> omega

end BucketMath.Similarity
