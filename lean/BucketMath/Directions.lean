import BucketMath.Vec

namespace BucketMath.Directions

open BucketMath.Vec

theorem pythagoras_unit (x v : List Rat) (hlen : x.length = v.length) (hv : dot v v = 1) :
    dot x x = dot (smul (dot x v) v) (smul (dot x v) v)
      + dot (sub x (smul (dot x v) v)) (sub x (smul (dot x v) v)) := by
  have hl : x.length = (smul (dot x v) v).length := by rw [length_smul]; exact hlen
  rw [dot_sub_left _ _ _ hl, dot_sub_right _ _ _ hl, dot_sub_right _ _ _ hl]
  simp only [dot_smul_left, dot_smul_right, hv]
  rw [dot_comm v x]
  grind

theorem pagerank_step_mass (d : Rat) (walk teleport : List Rat)
    (hlen : walk.length = teleport.length) (hwalk : sum walk = 1) (htele : sum teleport = 1) :
    sum (add (smul d walk) (smul (1 - d) teleport)) = 1 := by
  rw [sum_add _ _ (by simp [length_smul, hlen]), sum_smul, sum_smul, hwalk, htele]
  grind

theorem modularity_single_cluster (twoM : Rat) (h : twoM ≠ 0) :
    twoM / twoM - (twoM / twoM) * (twoM / twoM) = 0 := by
  rw [Rat.div_def, Rat.mul_inv_cancel _ h]
  grind

end BucketMath.Directions
