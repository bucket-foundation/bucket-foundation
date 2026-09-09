open Rat in
#check @Rat.mul_nonneg
example : True := by trivial
#check @Rat.mul_le_mul_of_nonneg_left
#check @Rat.mul_le_mul_of_nonneg_right
example (a u : Rat) (h0 : 0 ≤ a) (h2 : 0 ≤ u) : 0 ≤ a * u := by
  exact Rat.mul_nonneg h0 h2
