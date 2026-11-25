import BucketMath.Literature.Forgetting

namespace BucketMath.Literature.HalfLife

open BucketMath.Literature.Forgetting

def hlrNum (_k : Nat) : Nat := 1

def hlrDen (k : Nat) : Nat := 2 ^ k

theorem hlr_is_exponential : hlrNum = expNum 1 ∧ hlrDen = expDen 2 := by
  refine ⟨funext fun k => ?_, rfl⟩
  simp [hlrNum, expNum]

theorem hlr_half_at_one_halfLife : hlrDen 1 = 2 * hlrNum 1 := rfl

theorem hlr_halves_each_halfLife (k : Nat) : hlrDen (k + 1) = 2 * hlrDen k := by
  unfold hlrDen; rw [Nat.pow_succ, Nat.mul_comm]

theorem hlr_logLinear (k : Nat) : LogLinearAt hlrNum hlrDen k := by
  rw [hlr_is_exponential.1, hlr_is_exponential.2]; exact exp_logLinear 1 2 k

theorem hlr_disagrees_with_power {a : Nat} (ha : 0 < a) :
    ¬ Matches (powNum a) (powDen a) hlrNum hlrDen := by
  rw [hlr_is_exponential.1, hlr_is_exponential.2]
  exact exp_cannot_match_pow ha (by decide)

def logHalfLife (θ0 θc θw c w : Int) : Int := θ0 + θc * c + θw * w

theorem logHalfLife_mono_correct {θc : Int} (h : 0 ≤ θc) (θ0 θw w : Int) {c c' : Int} (hc : c ≤ c') :
    logHalfLife θ0 θc θw c w ≤ logHalfLife θ0 θc θw c' w := by
  unfold logHalfLife
  have := Int.mul_le_mul_of_nonneg_left hc h
  omega

theorem logHalfLife_antitone_wrong {θw : Int} (h : θw ≤ 0) (θ0 θc c : Int) {w w' : Int} (hw : w ≤ w') :
    logHalfLife θ0 θc θw c w' ≤ logHalfLife θ0 θc θw c w := by
  unfold logHalfLife
  have := Int.mul_le_mul_of_nonneg_left hw (Int.neg_nonneg_of_nonpos h)
  grind

def claim_settles_2016_half_life_regression (errHlr errLeitner : Nat) : Prop := errHlr < errLeitner

end BucketMath.Literature.HalfLife
