import Std

namespace BucketMath.Literature.Rasch

def raschLogit (θ b : Int) : Int := θ - b

def twoPlLogit (a θ b : Int) : Int := a * (θ - b)

def prob (w : Rat) : Rat := w / (1 + w)

theorem rasch_order_invariant (θ θ' b1 b2 : Int) :
    raschLogit θ b1 ≤ raschLogit θ b2 ↔ raschLogit θ' b1 ≤ raschLogit θ' b2 := by
  unfold raschLogit; omega

theorem rasch_person_difference_free_of_item (θ1 θ2 b b' : Int) :
    raschLogit θ1 b - raschLogit θ2 b = raschLogit θ1 b' - raschLogit θ2 b' := by
  unfold raschLogit; omega

theorem rasch_even_at_difficulty (b : Int) : raschLogit b b = 0 := by
  unfold raschLogit; omega

theorem rasch_mono_ability (b : Int) {θ θ' : Int} (h : θ ≤ θ') : raschLogit θ b ≤ raschLogit θ' b := by
  unfold raschLogit; omega

theorem twoPl_orders_cross :
    twoPlLogit 1 0 0 > twoPlLogit 2 0 1 ∧ twoPlLogit 1 4 0 < twoPlLogit 2 4 1 := by decide

theorem twoPl_is_rasch_at_unit_slope (θ b : Int) : twoPlLogit 1 θ b = raschLogit θ b := by
  unfold twoPlLogit raschLogit; omega

theorem prob_half_at_even_odds : prob 1 = 1 / 2 := by unfold prob; grind

theorem prob_complement {w : Rat} (hw : 0 < w) : prob w + prob w⁻¹ = 1 := by
  unfold prob
  have : w ≠ 0 := by grind
  have : 1 + w ≠ 0 := by grind
  have : 1 + w⁻¹ ≠ 0 := by
    have : 0 < w⁻¹ := Rat.inv_pos.mpr hw
    grind
  grind

def claim_lord_1980_applications_of_irt (a1 a2 : Int) : Prop := a1 ≠ a2

end BucketMath.Literature.Rasch
