import BucketMath.Similarity.Axioms

namespace BucketMath.Similarity

variable {α : Type}

def hamming [DecidableEq α] : List α → List α → Nat
  | x :: xs, y :: ys => (if x = y then 0 else 1) + hamming xs ys
  | [], ys => ys.length
  | xs, [] => xs.length

theorem hamming_nil_right [DecidableEq α] (xs : List α) : hamming xs [] = xs.length := by
  cases xs <;> rfl

theorem hamming_self [DecidableEq α] : ∀ xs : List α, hamming xs xs = 0
  | [] => rfl
  | x :: xs => by simp [hamming, hamming_self xs]

theorem hamming_symm [DecidableEq α] : ∀ xs ys : List α, hamming xs ys = hamming ys xs
  | [], [] => rfl
  | [], _ :: _ => rfl
  | _ :: _, [] => rfl
  | x :: xs, y :: ys => by
      simp only [hamming, hamming_symm xs ys]
      by_cases h : x = y
      · subst h; rfl
      · rw [if_neg h, if_neg (Ne.symm h)]

theorem length_le_hamming [DecidableEq α] : ∀ xs ys : List α,
    ys.length ≤ xs.length + hamming xs ys
  | [], ys => by simp [hamming]
  | x :: xs, [] => by simp
  | x :: xs, y :: ys => by
      have := length_le_hamming xs ys
      simp only [hamming, List.length_cons]
      split <;> omega

theorem hamming_le_lengths [DecidableEq α] : ∀ xs ys : List α,
    hamming xs ys ≤ xs.length + ys.length
  | [], ys => by simp [hamming]
  | x :: xs, [] => by simp [hamming_nil_right]
  | x :: xs, y :: ys => by
      have := hamming_le_lengths xs ys
      simp only [hamming, List.length_cons]
      split <;> omega

theorem hamming_triangle [DecidableEq α] : ∀ xs ys zs : List α,
    hamming xs zs ≤ hamming xs ys + hamming ys zs
  | [], ys, zs => by
      have := length_le_hamming ys zs
      simp only [hamming]; omega
  | x :: xs, [], zs => by
      have := hamming_le_lengths (x :: xs) zs
      simp only [hamming]; omega
  | x :: xs, y :: ys, [] => by
      have := length_le_hamming (y :: ys) (x :: xs)
      rw [hamming_symm (y :: ys)] at this
      simp only [hamming_nil_right] at *; omega
  | x :: xs, y :: ys, z :: zs => by
      have ih := hamming_triangle xs ys zs
      simp only [hamming]
      by_cases h1 : x = y <;> by_cases h2 : y = z <;> by_cases h3 : x = z <;> simp_all <;> omega

theorem hamming_separate [DecidableEq α] : ∀ xs ys : List α, hamming xs ys = 0 → xs = ys
  | [], [] , _ => rfl
  | [], _ :: _, h => by simp [hamming] at h
  | _ :: _, [], h => by simp [hamming] at h
  | x :: xs, y :: ys, h => by
      simp only [hamming] at h
      by_cases hxy : x = y
      · rw [if_pos hxy] at h
        rw [hxy, hamming_separate xs ys (by omega)]
      · rw [if_neg hxy] at h; omega

theorem hamming_metric [DecidableEq α] : Metric (hamming (α := α)) :=
  ⟨⟨hamming_self, hamming_symm, hamming_triangle⟩, hamming_separate⟩

inductive Edit : List α → List α → Prop where
  | substitute (pre post : List α) (x y : α) : Edit (pre ++ x :: post) (pre ++ y :: post)
  | insert (pre post : List α) (y : α) : Edit (pre ++ post) (pre ++ y :: post)
  | delete (pre post : List α) (x : α) : Edit (pre ++ x :: post) (pre ++ post)

inductive Within : Nat → List α → List α → Prop where
  | refl (n : Nat) (a : List α) : Within n a a
  | step {n a b c} : Edit a b → Within n b c → Within (n + 1) a c

theorem edit_symm {a b : List α} : Edit a b → Edit b a
  | .substitute pre post x y => .substitute pre post y x
  | .insert pre post y => .delete pre post y
  | .delete pre post x => .insert pre post x

theorem within_mono {m n : Nat} {a b : List α} (h : Within m a b) (hmn : m ≤ n) :
    Within n a b := by
  induction h generalizing n with
  | refl => exact .refl _ _
  | @step k _ _ _ e _ ih =>
      obtain ⟨j, rfl⟩ : ∃ j, n = j + 1 := ⟨n - 1, by omega⟩
      exact .step e (ih (Nat.le_of_succ_le_succ hmn))

theorem within_trans {m n : Nat} {a b c : List α} (h1 : Within m a b) (h2 : Within n b c) :
    Within (m + n) a c := by
  induction h1 with
  | refl k a => exact within_mono h2 (by omega)
  | @step k _ _ _ e _ ih =>
      rw [show k + 1 + n = (k + n) + 1 by omega]
      exact .step e (ih h2)

theorem within_one {a b : List α} (e : Edit a b) : Within 1 a b := .step e (.refl 0 b)

theorem within_symm {n : Nat} {a b : List α} (h : Within n a b) : Within n b a := by
  induction h with
  | refl => exact .refl _ _
  | step e _ ih =>
      have := within_trans ih (within_one (edit_symm e))
      exact this

theorem within_zero {a b : List α} (h : Within 0 a b) : a = b := by
  cases h with
  | refl => rfl

theorem within_self (a : List α) : Within 0 a a := .refl 0 a

def transliterated {β : Type} (t : α → β) (d : β → β → Nat) (a b : α) : Nat := d (t a) (t b)

theorem transliterated_pseudo {β : Type} (t : α → β) {d : β → β → Nat} (hd : Pseudometric d) :
    Pseudometric (transliterated t d) := pullback_pseudo hd t

theorem transliterated_not_separating :
    transliterated (List.map (fun c : Char => if c = 'ё' then 'е' else c)) hamming ['ё'] ['е'] = 0 ∧
      ['ё'] ≠ ['е'] := by
  constructor
  · rfl
  · decide

end BucketMath.Similarity
