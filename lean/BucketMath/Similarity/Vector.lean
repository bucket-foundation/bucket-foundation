import BucketMath.Similarity.Axioms

namespace BucketMath.Similarity

def dot : List Int → List Int → Int
  | x :: xs, y :: ys => x * y + dot xs ys
  | _, _ => 0

theorem dot_comm : ∀ a b : List Int, dot a b = dot b a
  | [], [] => rfl
  | [], _ :: _ => rfl
  | _ :: _, [] => rfl
  | x :: xs, y :: ys => by simp only [dot, dot_comm xs ys, Int.mul_comm x y]

def cosineDistance (radius : Int) (a b : List Int) : Int := radius * radius - dot a b

theorem cosine_symm (radius : Int) (a b : List Int) :
    cosineDistance radius a b = cosineDistance radius b a := by
  simp [cosineDistance, dot_comm a b]

theorem cosine_self (radius : Int) (a : List Int) (h : dot a a = radius * radius) :
    cosineDistance radius a a = 0 := by
  simp [cosineDistance, h]

theorem cosine_triangle_fails : ¬ Triangle (cosineDistance 5) := by
  intro h
  have := h [5, 0] [3, 4] [0, 5]
  simp [cosineDistance, dot] at this

theorem cosine_counterexample :
    cosineDistance 5 [5, 0] [0, 5] = 25 ∧ cosineDistance 5 [5, 0] [3, 4] = 10 ∧
      cosineDistance 5 [3, 4] [0, 5] = 5 := by
  decide

def manhattan : List Int → List Int → Nat
  | x :: xs, y :: ys => (x - y).natAbs + manhattan xs ys
  | x :: xs, [] => x.natAbs + manhattan xs []
  | [], y :: ys => y.natAbs + manhattan [] ys
  | [], [] => 0

theorem manhattan_self : ∀ a : List Int, manhattan a a = 0
  | [] => by simp [manhattan]
  | x :: xs => by simp [manhattan, manhattan_self xs]

theorem manhattan_symm : ∀ a b : List Int, manhattan a b = manhattan b a
  | [], [] => rfl
  | [], y :: ys => by simp only [manhattan, manhattan_symm [] ys]
  | x :: xs, [] => by simp only [manhattan, manhattan_symm xs []]
  | x :: xs, y :: ys => by
      simp only [manhattan, manhattan_symm xs ys]
      omega

theorem manhattan_triangle : ∀ a b c : List Int, manhattan a c ≤ manhattan a b + manhattan b c
  | [], [], [] => by simp [manhattan]
  | [], [], z :: zs => by
      have := manhattan_triangle [] [] zs
      simp only [manhattan] at *; omega
  | [], y :: ys, [] => by
      have := manhattan_triangle [] ys []
      simp only [manhattan] at *; omega
  | [], y :: ys, z :: zs => by
      have := manhattan_triangle [] ys zs
      simp only [manhattan] at *; omega
  | x :: xs, [], [] => by
      have := manhattan_triangle xs [] []
      simp only [manhattan] at *; omega
  | x :: xs, [], z :: zs => by
      have := manhattan_triangle xs [] zs
      simp only [manhattan] at *; omega
  | x :: xs, y :: ys, [] => by
      have := manhattan_triangle xs ys []
      simp only [manhattan] at *; omega
  | x :: xs, y :: ys, z :: zs => by
      have := manhattan_triangle xs ys zs
      simp only [manhattan] at *; omega

theorem manhattan_pseudo : Pseudometric manhattan :=
  ⟨manhattan_self, manhattan_symm, manhattan_triangle⟩

theorem manhattan_separate : ∀ a b : List Int, a.length = b.length → manhattan a b = 0 → a = b
  | [], [], _, _ => rfl
  | [], _ :: _, hl, _ => by simp at hl
  | _ :: _, [], hl, _ => by simp at hl
  | x :: xs, y :: ys, hl, h => by
      simp only [manhattan] at h
      have hxy : x = y := by omega
      rw [hxy, manhattan_separate xs ys (by simpa using hl) (by omega)]

theorem manhattan_padding_not_separating : manhattan [] [0] = 0 ∧ ([] : List Int) ≠ [0] := by
  simp [manhattan]

def squaredEuclid (a b : List Int) : Nat := (manhattanSq a b)
where
  manhattanSq : List Int → List Int → Nat
    | x :: xs, y :: ys => (x - y).natAbs * (x - y).natAbs + manhattanSq xs ys
    | _, _ => 0

theorem squaredEuclid_triangle_fails :
    ¬ (∀ a b c, squaredEuclid a c ≤ squaredEuclid a b + squaredEuclid b c) := by
  intro h
  have := h [0] [1] [2]
  simp [squaredEuclid, squaredEuclid.manhattanSq] at this

end BucketMath.Similarity
