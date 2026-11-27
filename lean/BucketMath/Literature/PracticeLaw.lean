import BucketMath.Literature.Forgetting

namespace BucketMath.Literature.PracticeLaw

open BucketMath.Literature.Forgetting

def powerTimeNum (a _c _N : Nat) : Nat := a

def powerTimeDen (c N : Nat) : Nat := c + N

def mixNum (x y N : Nat) : Nat := x ^ N + y ^ N

def one (_N : Nat) : Nat := 1

theorem powerTime_strictLogConvex {a c : Nat} (ha : 0 < a) (hc : 0 < c) (N : Nat) :
    StrictLogConvexAt (powerTimeNum a c) (powerTimeDen c) N := by
  have := hyp_strictLogConvex hc N
  unfold StrictLogConvexAt powerTimeNum powerTimeDen hypNum hypDen at *
  have hc2 : 0 < c * c := Nat.mul_pos hc hc
  have ha2 : 0 < a * a := Nat.mul_pos ha ha
  have e1 : a * a * ((c + N) * (c + (N + 2))) * (c * c) = c * c * ((c + N) * (c + (N + 2))) * (a * a) := by grind
  have e2 : a * a * ((c + (N + 1)) * (c + (N + 1))) * (c * c) = c * c * ((c + (N + 1)) * (c + (N + 1))) * (a * a) := by grind
  have := Nat.mul_lt_mul_of_pos_right this ha2
  exact Nat.lt_of_mul_lt_mul_right (a := c * c) (by omega)

theorem mixture_strictLogConvex {x y : Nat} (hx : 0 < x) (hxy : x < y) (N : Nat) :
    StrictLogConvexAt (mixNum x y) one N := by
  unfold StrictLogConvexAt mixNum one
  obtain ⟨d, rfl⟩ : ∃ d, y = x + (d + 1) := ⟨y - x - 1, by omega⟩
  have hu : 0 < x ^ N := Nat.pow_pos hx
  have hv : 0 < (x + (d + 1)) ^ N := Nat.pow_pos (by omega)
  have hp : 0 < x ^ N * (x + (d + 1)) ^ N * ((d + 1) * (d + 1)) :=
    Nat.mul_pos (Nat.mul_pos hu hv) (Nat.mul_pos (by omega) (by omega))
  simp only [Nat.pow_succ]
  have e : (x ^ N + (x + (d + 1)) ^ N) * (x ^ N * x * x + (x + (d + 1)) ^ N * (x + (d + 1)) * (x + (d + 1))) * (1 * 1)
      = (x ^ N * x + (x + (d + 1)) ^ N * (x + (d + 1))) * (x ^ N * x + (x + (d + 1)) ^ N * (x + (d + 1))) * (1 * 1)
        + x ^ N * (x + (d + 1)) ^ N * ((d + 1) * (d + 1)) := by grind
  omega

def mixDen (q N : Nat) : Nat := q ^ N

theorem mixture_decays {x y q : Nat} (hxy : x ≤ y) (hyq : y ≤ q) (N : Nat) :
    mixNum x y (N + 1) * mixDen q N ≤ mixNum x y N * mixDen q (N + 1) := by
  unfold mixNum mixDen
  simp only [Nat.pow_succ]
  have hx : x ≤ q := Nat.le_trans hxy hyq
  have h1 := Nat.mul_le_mul_left (x ^ N * q ^ N) hx
  have h2 := Nat.mul_le_mul_left (y ^ N * q ^ N) hyq
  grind

theorem decaying_mixture_strictLogConvex {x y q : Nat} (hx : 0 < x) (hxy : x < y) (hq : 0 < q) (N : Nat) :
    StrictLogConvexAt (mixNum x y) (mixDen q) N := by
  have h := mixture_strictLogConvex hx hxy N
  unfold StrictLogConvexAt mixDen one at *
  have hK : 0 < q ^ (N + 1) * q ^ (N + 1) := Nat.mul_pos (Nat.pow_pos hq) (Nat.pow_pos hq)
  have := Nat.mul_lt_mul_of_pos_right h hK
  have e : q ^ N * q ^ (N + 2) = q ^ (N + 1) * q ^ (N + 1) := by
    rw [← Nat.pow_add, ← Nat.pow_add]; congr 1; omega
  rw [e]
  grind

def claim_newell_1981_power_law_practice (n d : Nat → Nat) : Prop := ∀ N, StrictLogConvexAt n d N

def claim_heathcote_2000_power_law_repealed (n d : Nat → Nat) : Prop := ∀ N, LogLinearAt n d N

theorem heathcote_individuals (p q : Nat) : claim_heathcote_2000_power_law_repealed (expNum p) (expDen q) :=
  exp_logLinear p q

theorem exponential_learner_decays {p q : Nat} (h : p ≤ q) (N : Nat) :
    expNum p (N + 1) * expDen q N ≤ expNum p N * expDen q (N + 1) :=
  exp_antitone h N

theorem averaging_yields_newell {x y q : Nat} (hx : 0 < x) (hxy : x < y) (hyq : y ≤ q) :
    claim_heathcote_2000_power_law_repealed (expNum x) (expDen q) ∧
    claim_heathcote_2000_power_law_repealed (expNum y) (expDen q) ∧
    claim_newell_1981_power_law_practice (mixNum x y) (mixDen q) :=
  ⟨heathcote_individuals x q, heathcote_individuals y q,
    decaying_mixture_strictLogConvex hx hxy (by omega)⟩

theorem mixture_not_exponential {x y q : Nat} (hx : 0 < x) (hxy : x < y) (hq0 : 0 < q) {p r : Nat} (hr : 0 < r) :
    ¬ Matches (mixNum x y) (mixDen q) (expNum p) (expDen r) :=
  exp_rejected_of_strictLogConvex (decaying_mixture_strictLogConvex hx hxy hq0 0) hr

end BucketMath.Literature.PracticeLaw
