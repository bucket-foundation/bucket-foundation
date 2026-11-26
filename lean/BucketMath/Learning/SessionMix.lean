namespace BucketMath.Learning.SessionMix

def roundedItems (targetPermille items : Nat) : Nat := (targetPermille * items + 500) / 1000

theorem m1_within_one (t n : Nat) :
    1000 * roundedItems t n ≤ t * n + 1000 ∧ t * n ≤ 1000 * roundedItems t n + 1000 := by
  unfold roundedItems
  omega

def units (want avg : Nat) : Nat := (2 * want + avg) / (2 * avg)

theorem m1_units_within_one_item (want avg : Nat) (h : 0 < avg) :
    units want avg * avg ≤ want + avg ∧ want ≤ units want avg * avg + avg := by
  unfold units
  have h2 : 0 < 2 * avg := by omega
  have hd := Nat.div_add_mod (2 * want + avg) (2 * avg)
  have hm := Nat.mod_lt (2 * want + avg) h2
  generalize (2 * want + avg) / (2 * avg) = q at hd ⊢
  generalize (2 * want + avg) % (2 * avg) = r at hd hm
  rw [Nat.mul_assoc] at hd
  rw [Nat.mul_comm q avg]
  constructor <;> omega

def share (inputSec cardSec : Nat) : Nat := if inputSec + cardSec = 0 then 0 else 1000 * inputSec / (inputSec + cardSec)

theorem share_le_one (i c : Nat) : share i c ≤ 1000 := by
  unfold share
  split
  · omega
  · exact Nat.div_le_of_le_mul (by rw [Nat.mul_comm (i + c)]; exact Nat.mul_le_mul_left 1000 (Nat.le_add_right i c))

end BucketMath.Learning.SessionMix
