import BucketMath.Literature.Forgetting

namespace BucketMath.Literature.PracticeLaw

open BucketMath.Literature.Forgetting

def powerTimeNum (a _c _N : Nat) : Nat := a

def powerTimeDen (c N : Nat) : Nat := c + N

def mixNum (x y N : Nat) : Nat := x ^ N + y ^ N

def one (_N : Nat) : Nat := 1

theorem powerTime_strictLogConvex {a c : Nat} (ha : 0 < a) (hc : 0 < c) (N : Nat) :
    StrictLogConvexAt (powerTimeNum a c) (powerTimeDen c) N := by
  have := pow_strictLogConvex hc N
  unfold StrictLogConvexAt powerTimeNum powerTimeDen powNum powDen at *
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

def claim_newell_1981_power_law_practice (n d : Nat → Nat) : Prop := ∀ N, StrictLogConvexAt n d N

def claim_heathcote_2000_power_law_repealed (n d : Nat → Nat) : Prop := ∀ N, LogLinearAt n d N

theorem heathcote_individuals (x : Nat) : claim_heathcote_2000_power_law_repealed (expNum x) one := by
  intro N
  have := exp_logLinear x 1 N
  unfold LogLinearAt expDen one at *
  simpa using this

theorem averaging_yields_newell {x y : Nat} (hx : 0 < x) (hxy : x < y) :
    claim_heathcote_2000_power_law_repealed (expNum x) one ∧
    claim_heathcote_2000_power_law_repealed (expNum y) one ∧
    claim_newell_1981_power_law_practice (mixNum x y) one :=
  ⟨heathcote_individuals x, heathcote_individuals y, mixture_strictLogConvex hx hxy⟩

theorem mixture_not_exponential {x y : Nat} (hx : 0 < x) (hxy : x < y) {p q : Nat} (hq : 0 < q) :
    ¬ Matches (mixNum x y) one (expNum p) (expDen q) :=
  exp_rejected_of_strictLogConvex (mixture_strictLogConvex hx hxy 0) hq

end BucketMath.Literature.PracticeLaw
