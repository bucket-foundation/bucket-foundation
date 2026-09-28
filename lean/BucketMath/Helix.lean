import BucketMath.Vec

namespace BucketMath.Helix

open BucketMath.Vec

structure Slice where
  t : Rat
  w : List Rat

def phase (K k : Nat) (ω t : Rat) : Rat := (k : Rat) / K + ω * t

theorem phase_shift (K k : Nat) (ω t d : Rat) :
    phase K k ω (t + d) = phase K k ω t + ω * d := by
  simp only [phase]; grind

theorem phase_spacing (K k : Nat) (ω t : Rat) :
    phase K (k + 1) ω t = phase K k ω t + 1 / K := by
  simp only [phase]; push_cast; grind

theorem phase_period (K k : Nat) (ω t : Rat) (hK : K ≠ 0) :
    phase K (k + K) ω t = phase K k ω t + 1 := by
  have h : (K : Rat) ≠ 0 := by exact_mod_cast hK
  simp only [phase]; push_cast; grind

def lerp (a b : List Rat) (s : Rat) : List Rat := add (smul (1 - s) a) (smul s b)

def Nonneg (v : List Rat) : Prop := ∀ x ∈ v, 0 ≤ x

theorem lerp_nonneg (a b : List Rat) (s : Rat) (hs0 : 0 ≤ s) (hs1 : s ≤ 1)
    (ha : Nonneg a) (hb : Nonneg b) : Nonneg (lerp a b s) := by
  unfold lerp Nonneg at *
  induction a generalizing b with
  | nil => cases b <;> simp [smul, add]
  | cons x xs ih =>
    cases b with
    | nil => simp [smul, add]
    | cons y ys =>
      simp only [smul, add, List.mem_cons, forall_eq_or_imp] at *
      refine ⟨?_, ih ys ha.2 hb.2⟩
      have h1 : 0 ≤ (1 - s) * x := Rat.mul_nonneg (by grind) ha.1
      have h2 : 0 ≤ s * y := Rat.mul_nonneg hs0 hb.1
      grind

theorem lerp_sum (a b : List Rat) (s : Rat) (h : a.length = b.length) :
    sum (lerp a b s) = (1 - s) * sum a + s * sum b := by
  unfold lerp
  induction a generalizing b with
  | nil => cases b <;> simp_all [smul, add, sum] <;> grind
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      simp only [List.length_cons, Nat.add_right_cancel_iff] at h
      simp only [smul, add, sum, ih ys h]; grind

theorem length_lerp (a b : List Rat) (s : Rat) (h : a.length = b.length) :
    (lerp a b s).length = a.length := by
  unfold lerp
  induction a generalizing b with
  | nil => cases b <;> rfl
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      simp only [List.length_cons, Nat.add_right_cancel_iff] at h
      simp [smul, add, ih ys h]

theorem lerp_simplex (a b : List Rat) (s : Rat) (h : a.length = b.length)
    (hs0 : 0 ≤ s) (hs1 : s ≤ 1) (ha : Nonneg a) (hb : Nonneg b)
    (sa : sum a = 1) (sb : sum b = 1) :
    Nonneg (lerp a b s) ∧ sum (lerp a b s) = 1 ∧ (lerp a b s).length = a.length := by
  refine ⟨lerp_nonneg a b s hs0 hs1 ha hb, ?_, length_lerp a b s h⟩
  rw [lerp_sum a b s h, sa, sb]; grind

theorem lerp_zero (a b : List Rat) (h : a.length = b.length) : lerp a b 0 = a := by
  unfold lerp
  induction a generalizing b with
  | nil => cases b <;> rfl
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      simp only [List.length_cons, Nat.add_right_cancel_iff] at h
      simp only [smul, add, ih ys h]; grind

theorem lerp_one (a b : List Rat) (h : a.length = b.length) : lerp a b 1 = b := by
  unfold lerp
  induction a generalizing b with
  | nil => cases b with
    | nil => rfl
    | cons y ys => simp at h
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      simp only [List.length_cons, Nat.add_right_cancel_iff] at h
      simp only [smul, add, ih ys h]; grind

def zeros : Nat → List Rat
  | 0 => []
  | n + 1 => 0 :: zeros n

def basis : Nat → Nat → List Rat
  | 0, _ => []
  | K + 1, 0 => 1 :: zeros K
  | K + 1, i + 1 => 0 :: basis K i

theorem dot_zeros (n : Nat) (v : List Rat) : dot (zeros n) v = 0 := by
  induction n generalizing v with
  | zero => cases v <;> rfl
  | succ n ih => cases v with
    | nil => rfl
    | cons y ys => simp only [zeros, dot, ih]; grind

theorem basis_orth (K i j : Nat) (h : i ≠ j) : dot (basis K i) (basis K j) = 0 := by
  induction K generalizing i j with
  | zero => rfl
  | succ K ih =>
    cases i with
    | zero =>
      cases j with
      | zero => exact absurd rfl h
      | succ j => simp only [basis, dot, dot_zeros]; grind
    | succ i =>
      cases j with
      | zero => simp only [basis, dot]; rw [dot_comm, dot_zeros]; grind
      | succ j => simp only [basis, dot, ih i j (by omega)]; grind

theorem basis_unit (K i : Nat) (h : i < K) : dot (basis K i) (basis K i) = 1 := by
  induction K generalizing i with
  | zero => omega
  | succ K ih =>
    cases i with
    | zero => simp only [basis, dot, dot_zeros]; grind
    | succ i => simp only [basis, dot, ih i (by omega)]; grind

theorem dot_basis (K i : Nat) (w : List Rat) (hw : w.length = K) (h : i < K) :
    dot (basis K i) w = w.getD i 0 := by
  induction K generalizing i w with
  | zero => omega
  | succ K ih =>
    cases w with
    | nil => simp at hw
    | cons y ys =>
      simp only [List.length_cons, Nat.add_right_cancel_iff] at hw
      cases i with
      | zero => simp only [basis, dot, dot_zeros, List.getD_cons_zero]; grind
      | succ i => simp only [basis, dot, ih i ys hw (by omega), List.getD_cons_succ]; grind

end BucketMath.Helix
