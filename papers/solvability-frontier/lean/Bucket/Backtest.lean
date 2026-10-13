structure PermutationP where
  hits : Nat
  permutations : Nat
  bounded : hits ≤ permutations

def PermutationP.numerator (p : PermutationP) : Nat := p.hits + 1

def PermutationP.denominator (p : PermutationP) : Nat := p.permutations + 1

theorem PermutationP.numerator_pos (p : PermutationP) : 0 < p.numerator :=
  Nat.succ_pos p.hits

theorem PermutationP.numerator_le_denominator (p : PermutationP) : p.numerator ≤ p.denominator :=
  Nat.succ_le_succ p.bounded

inductive LengthBand where
  | short
  | middle
  | long
  deriving DecidableEq, Repr

def lengthBand (words : Nat) : LengthBand :=
  if words < 20 then .short else if words ≤ 40 then .middle else .long

theorem lengthBand_short (words : Nat) (h : words < 20) : lengthBand words = .short := by
  simp [lengthBand, h]

theorem lengthBand_middle (words : Nat) (h1 : 20 ≤ words) (h2 : words ≤ 40) : lengthBand words = .middle := by
  simp [lengthBand, Nat.not_lt.mpr h1, h2]

theorem lengthBand_long (words : Nat) (h : 40 < words) : lengthBand words = .long := by
  have h1 : ¬ words < 20 := Nat.not_lt.mpr (Nat.le_of_lt (Nat.lt_trans (by decide : 20 < 40) h))
  simp [lengthBand, h1, Nat.not_le.mpr h]

theorem lengthBand_total (words : Nat) :
    lengthBand words = .short ∨ lengthBand words = .middle ∨ lengthBand words = .long := by
  unfold lengthBand
  split
  · exact Or.inl rfl
  · split
    · exact Or.inr (Or.inl rfl)
    · exact Or.inr (Or.inr rfl)
