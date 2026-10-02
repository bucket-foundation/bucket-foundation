namespace BucketMath.Grade

def Within (p q a b : Nat) : Prop := 0 < a ∧ 0 < b ∧ (max a b) ^ q ≤ 10 ^ p * (min a b) ^ q

instance (p q a b : Nat) : Decidable (Within p q a b) := by unfold Within; exact inferInstance

def Closer (a b c d : Nat) : Prop := max a b * min c d ≤ max c d * min a b

abbrev Correct (a b : Nat) : Prop := Within 1 2 a b

abbrev Close (a b : Nat) : Prop := Within 3 20 a b

theorem within_symm (p q a b : Nat) : Within p q a b ↔ Within p q b a := by
  unfold Within
  rw [Nat.max_comm, Nat.min_comm]
  exact ⟨fun ⟨h1, h2, h3⟩ => ⟨h2, h1, h3⟩, fun ⟨h1, h2, h3⟩ => ⟨h2, h1, h3⟩⟩

theorem within_self (p q a : Nat) (h : 0 < a) : Within p q a a := by
  refine ⟨h, h, ?_⟩
  rw [Nat.max_self, Nat.min_self]
  exact Nat.le_mul_of_pos_left _ (Nat.pow_pos (by decide))

theorem within_scale (p q a b k : Nat) (hk : 0 < k) : Within p q (k * a) (k * b) ↔ Within p q a b := by
  unfold Within
  rw [Nat.mul_max_mul_left, Nat.mul_min_mul_left, Nat.mul_pow, Nat.mul_pow, Nat.mul_left_comm,
    Nat.mul_le_mul_left_iff (Nat.pow_pos hk)]
  constructor
  · exact fun ⟨h1, h2, h3⟩ => ⟨Nat.pos_of_mul_pos_left h1, Nat.pos_of_mul_pos_left h2, h3⟩
  · exact fun ⟨h1, h2, h3⟩ => ⟨Nat.mul_pos hk h1, Nat.mul_pos hk h2, h3⟩

theorem within_tolerance_mono {p p' q a b : Nat} (hp : p ≤ p') (h : Within p q a b) : Within p' q a b :=
  ⟨h.1, h.2.1, Nat.le_trans h.2.2 (Nat.mul_le_mul_right _ (Nat.pow_le_pow_right (by decide) hp))⟩

theorem within_refine (p q k a b : Nat) (hk : 0 < k) : Within p q a b ↔ Within (p * k) (q * k) a b := by
  unfold Within
  rw [Nat.pow_mul, Nat.pow_mul, Nat.pow_mul, ← Nat.mul_pow, Nat.pow_le_pow_iff_left (by omega)]

def epsilonScale : Nat := 1000000000

theorem correct_accepted_with_epsilon {a b : Nat} (h : Correct a b) :
    Within (epsilonScale / 2 + 1) epsilonScale a b := by
  have h' := (within_refine 1 2 (epsilonScale / 2) a b (by decide)).mp h
  have hq : 2 * (epsilonScale / 2) = epsilonScale := by decide
  rw [hq] at h'
  exact within_tolerance_mono (p := 1 * (epsilonScale / 2)) (by decide) h'

theorem within_of_closer {p q a b c d : Nat} (ha : 0 < a) (hb : 0 < b) (hc : Closer a b c d)
    (h : Within p q c d) : Within p q a b := by
  refine ⟨ha, hb, ?_⟩
  have hl : 0 < (min c d) ^ q := Nat.pow_pos (by have := h.1; have := h.2.1; omega)
  have h1 : (max a b * min c d) ^ q ≤ (max c d * min a b) ^ q := Nat.pow_le_pow_left hc q
  rw [Nat.mul_pow, Nat.mul_pow] at h1
  have h2 : (max c d) ^ q * (min a b) ^ q ≤ 10 ^ p * (min c d) ^ q * (min a b) ^ q :=
    Nat.mul_le_mul_right _ h.2.2
  have h3 : (max a b) ^ q * (min c d) ^ q ≤ 10 ^ p * (min a b) ^ q * (min c d) ^ q := by
    rw [Nat.mul_right_comm]; exact Nat.le_trans h1 h2
  exact Nat.le_of_mul_le_mul_right h3 hl

theorem close_correct {a b : Nat} (h : Close a b) : Correct a b := by
  refine ⟨h.1, h.2.1, ?_⟩
  apply Nat.le_of_not_lt
  intro hlt
  have h1 : (10 ^ 1 * (min a b) ^ 2) ^ 10 < ((max a b) ^ 2) ^ 10 := Nat.pow_lt_pow_left hlt (by decide)
  rw [← Nat.pow_mul, Nat.mul_pow, ← Nat.pow_mul, ← Nat.pow_mul] at h1
  have h2 : 10 ^ 3 * (min a b) ^ 20 ≤ 10 ^ (1 * 10) * (min a b) ^ (2 * 10) :=
    Nat.mul_le_mul_right _ (by decide)
  exact Nat.lt_irrefl _ (Nat.lt_of_lt_of_le (Nat.lt_of_le_of_lt h2 h1) h.2.2)

theorem no_exact_boundary : ∀ (b a : Nat), 0 < b → a * a ≠ 10 * (b * b) := by
  intro b
  induction b using Nat.strongRecOn with
  | _ b ih =>
    intro a hb h
    have ha : a % 2 = 0 := by
      rcases Nat.mod_two_eq_zero_or_one a with h0 | h1
      · exact h0
      · have : (a * a) % 2 = 1 := by rw [Nat.mul_mod, h1]
        omega
    obtain ⟨c, rfl⟩ : ∃ c, a = 2 * c := ⟨a / 2, by omega⟩
    have h2 : 2 * (c * c) = 5 * (b * b) := by
      have : 2 * c * (2 * c) = 4 * (c * c) := by rw [Nat.mul_mul_mul_comm]
      omega
    have hb2 : b % 2 = 0 := by
      rcases Nat.mod_two_eq_zero_or_one b with h0 | h1
      · exact h0
      · have : (b * b) % 2 = 1 := by rw [Nat.mul_mod, h1]
        omega
    obtain ⟨d, rfl⟩ : ∃ d, b = 2 * d := ⟨b / 2, by omega⟩
    have h3 : c * c = 10 * (d * d) := by
      have : 2 * d * (2 * d) = 4 * (d * d) := by rw [Nat.mul_mul_mul_comm]
      omega
    exact ih d (by omega) c (by omega) h3

theorem correct_strict {a b : Nat} (h : Correct a b) : (max a b) ^ 2 < 10 * (min a b) ^ 2 := by
  have hle : (max a b) ^ 2 ≤ 10 * (min a b) ^ 2 := h.2.2
  have hne := no_exact_boundary (min a b) (max a b) (by have := h.1; have := h.2.1; omega)
  rw [Nat.pow_two, Nat.pow_two] at *
  omega

theorem boundary_examples :
    Correct 1000 3162 ∧ ¬ Correct 1000 3163 ∧ Correct 1000 317 ∧ ¬ Correct 1000 316 ∧
      Close 1000 1412 ∧ ¬ Close 1000 1413 ∧ ¬ Correct 8658 27379 ∧ ¬ Correct 0 0 := by decide

end BucketMath.Grade
