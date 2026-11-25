import Std

namespace BucketMath.Papers

theorem hhe_slot_products :
    40 * 50 = 2000 ∧ 2000 * 300 = 600000 ∧ 600000 * 120 = 72000000 ∧
      72000000 * 200 = 14400000000 ∧ 14400000000 * 25 = 360000000000 := by decide

theorem hhe_hypothesis_space : 40 * 50 * 300 * 120 * 200 * 25 = 360000000000 := by decide

theorem hhe_sequence_space :
    13 * 360000000000 ^ 2 = 1684800000000000000000000 ∧
      165 * 10 ^ 22 ≤ 13 * 360000000000 ^ 2 ∧ 13 * 360000000000 ^ 2 < 175 * 10 ^ 22 := by decide

theorem hhe_kind_weights :
    2000 * 900 + 1500 * 500 = 2550000 ∧ 2550 * 15485 ≤ 39510000 ∧ 39510000 ≤ 2550 * 15495 ∧
      1000 * 600 = 600000 ∧ 808 * 1000 ≤ 600 * 1347 ∧ 600 * 1347 < 809 * 1000 ∧ 3951 + 808 = 4759 := by decide

theorem hhe_support_score : 13 * 4759 = 61867 ∧ 6186 * 10 ≤ 61867 ∧ 61867 < 6187 * 10 := by decide

def absenceRatio (q0 q1 δ : Rat) : Rat := (1 - δ * q1) / (1 - δ * q0)

theorem absenceRatio_undetectable (q0 q1 : Rat) : absenceRatio q0 q1 0 = 1 := by
  unfold absenceRatio; grind

theorem absenceRatio_full (q0 q1 : Rat) : absenceRatio q0 q1 1 = (1 - q1) / (1 - q0) := by
  unfold absenceRatio; grind

def fsrs5SqNum (_t S : Nat) : Nat := 81 * S

def fsrs5SqDen (t S : Nat) : Nat := 81 * S + 19 * t

def RoundsTo (x : Nat) (t S : Nat) : Prop :=
  (2 * x - 1) ^ 2 * fsrs5SqDen t S ≤ 40000 * fsrs5SqNum t S ∧
    40000 * fsrs5SqNum t S < (2 * x + 1) ^ 2 * fsrs5SqDen t S

instance (x t S : Nat) : Decidable (RoundsTo x t S) := inferInstanceAs (Decidable (_ ∧ _))

theorem fsrs5_target_at_stability (S : Nat) :
    100 * fsrs5SqNum S S = 81 * fsrs5SqDen S S := by
  unfold fsrs5SqNum fsrs5SqDen; omega

theorem fsrs5_retest_week :
    RoundsTo 80 7 3 ∧ RoundsTo 90 7 7 ∧ RoundsTo 96 7 21 ∧ RoundsTo 99 7 90 := by decide

theorem fsrs5_horizon_ninety :
    RoundsTo 35 90 3 ∧ RoundsTo 50 90 7 ∧ RoundsTo 71 90 21 ∧ RoundsTo 90 90 90 := by decide

theorem fsrs5_mastery_threshold_tenths :
    49 * (81 * 203 + 19 * 900) ≤ 100 * 81 * 203 ∧ 100 * 81 * 202 < 49 * (81 * 202 + 19 * 900) := by decide

def wsum (d g : List Rat) (f : Rat → Rat) : Rat := ((d.zip g).map (fun p => p.1 * f p.2)).sum

theorem wsum_cons (a b : Rat) (d g : List Rat) (f : Rat → Rat) :
    wsum (a :: d) (b :: g) f = a * f b + wsum d g f := by
  simp [wsum]

theorem weighted_spread (d g : List Rat) (G : Rat) :
    wsum d g (fun x => (x - G) * (x - G)) =
      wsum d g (fun x => x * x) - 2 * G * wsum d g id + G * G * wsum d g (fun _ => 1) := by
  induction d generalizing g with
  | nil => simp only [wsum, List.zip_nil_left, List.map_nil, List.sum_nil]; grind
  | cons a d ih =>
      cases g with
      | nil => simp only [wsum, List.zip_nil_right, List.map_nil, List.sum_nil]; grind
      | cons b g => rw [wsum_cons, wsum_cons, wsum_cons, wsum_cons, ih]; simp only [id]; grind

theorem weighted_variance_identity (d g : List Rat) (h : wsum d g (fun _ => 1) ≠ 0) :
    wsum d g (fun x => (x - wsum d g id / wsum d g (fun _ => 1)) * (x - wsum d g id / wsum d g (fun _ => 1)))
        / wsum d g (fun _ => 1) =
      wsum d g (fun x => x * x) / wsum d g (fun _ => 1) -
        (wsum d g id / wsum d g (fun _ => 1)) * (wsum d g id / wsum d g (fun _ => 1)) := by
  rw [weighted_spread]
  generalize wsum d g (fun _ => 1) = S0 at *
  generalize wsum d g id = S1
  generalize wsum d g (fun x => x * x) = S2
  grind

theorem wsum_nonneg (d g : List Rat) (f : Rat → Rat) (hd : ∀ x ∈ d, 0 ≤ x) (hf : ∀ x, 0 ≤ f x) :
    0 ≤ wsum d g f := by
  induction d generalizing g with
  | nil => simp [wsum]
  | cons a d ih =>
      cases g with
      | nil => simp [wsum]
      | cons b g =>
          rw [wsum_cons]
          have h1 : 0 ≤ a * f b := Rat.mul_nonneg (hd a (by simp)) (hf b)
          have h2 := ih g (fun x hx => hd x (by simp [hx]))
          grind

theorem sq_nonneg (x : Rat) : 0 ≤ x * x := by
  rcases (Rat.le_total : (0 : Rat) ≤ x ∨ x ≤ 0) with h | h
  · exact Rat.mul_nonneg h h
  · have hn : 0 ≤ -x := by grind
    have := Rat.mul_nonneg hn hn
    grind

theorem mean_sq_le_mean_of_sq (d g : List Rat) (hd : ∀ x ∈ d, 0 ≤ x) (h : 0 < wsum d g (fun _ => 1)) :
    (wsum d g id / wsum d g (fun _ => 1)) * (wsum d g id / wsum d g (fun _ => 1)) ≤
      wsum d g (fun x => x * x) / wsum d g (fun _ => 1) := by
  have hv := wsum_nonneg d g (fun x => (x - wsum d g id / wsum d g (fun _ => 1)) * (x - wsum d g id / wsum d g (fun _ => 1)))
    hd (fun x => sq_nonneg _)
  have hid := weighted_variance_identity d g (by grind)
  have : 0 ≤ wsum d g (fun x => (x - wsum d g id / wsum d g (fun _ => 1)) * (x - wsum d g id / wsum d g (fun _ => 1)))
      / wsum d g (fun _ => 1) := by
    rw [Rat.div_def]; exact Rat.mul_nonneg hv (Rat.le_of_lt (Rat.inv_pos.mpr h))
  grind

theorem sq_sum_le_sum (d g : List Rat) (hd : ∀ x ∈ d, 0 ≤ x) (hg : ∀ x ∈ g, 0 ≤ x ∧ x ≤ 1) :
    wsum d g (fun x => x * x) ≤ wsum d g id := by
  induction d generalizing g with
  | nil => simp only [wsum, List.zip_nil_left, List.map_nil, List.sum_nil]; grind
  | cons a d ih =>
      cases g with
      | nil => simp only [wsum, List.zip_nil_right, List.map_nil, List.sum_nil]; grind
      | cons b g =>
          rw [wsum_cons, wsum_cons]
          have hb := hg b (by simp)
          have hbb : 0 ≤ b * (1 - b) := Rat.mul_nonneg hb.1 (by grind)
          have h1 : 0 ≤ a * (b * (1 - b)) := Rat.mul_nonneg (hd a (by simp)) hbb
          have h2 := ih g (fun x hx => hd x (by simp [hx])) (fun x hx => hg x (by simp [hx]))
          simp only [id] at h2 ⊢
          grind

def ratioRoundsTo (x : Nat) (a n b m : Nat) : Prop :=
  (2 * x - 1) * (n * b) ≤ 2000 * (a * m) ∧ 2000 * (a * m) < (2 * x + 1) * (n * b)

instance (x a n b m : Nat) : Decidable (ratioRoundsTo x a n b m) := inferInstanceAs (Decidable (_ ∧ _))

theorem frontier_settled_ratios : ratioRoundsTo 4012 38 161 4 68 ∧ ratioRoundsTo 21489 35 272 1 167 := by decide

theorem frontier_settled_rates :
    23 * 161 ≤ 100 * 38 ∧ 100 * 38 < 24 * 161 + 161 ∧ 5 * 68 < 100 * 4 ∧ 100 * 4 < 6 * 68 ∧
      12 * 272 < 100 * 35 ∧ 100 * 35 < 13 * 272 + 272 := by decide

theorem frontier_remaining_shares : 6 * 2 < 13 ∧ 18 * 4 = 24 * 3 := by decide

def multiplier (J H A : Rat) : Rat := J / max H A

theorem multiplier_one_at_ceiling {J A H : Rat} (hA : 0 < A) (hH : H ≤ A) (hJ : J = A) : multiplier J H A = 1 := by
  unfold multiplier
  have : max H A = A := by grind
  rw [this, hJ]
  grind

end BucketMath.Papers
