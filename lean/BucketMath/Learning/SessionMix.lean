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

def eligibleRate (eligible session : Nat) : Nat := if session = 0 then 0 else 1000 * eligible / session

def inputShare (target eligible session : Nat) : Nat := min target (eligibleRate eligible session)

theorem inputShare_le_target (t e s : Nat) : inputShare t e s ≤ t := Nat.min_le_left _ _

theorem inputShare_le_eligible (t e s : Nat) : inputShare t e s ≤ eligibleRate e s := Nat.min_le_right _ _

theorem inputShare_zero_without_input (t s : Nat) : inputShare t 0 s = 0 := by
  unfold inputShare eligibleRate
  split <;> simp

def planUnits (pool cards rounded : Nat) : Nat := min pool (min (max 1 cards) (max 1 rounded))

theorem planUnits_le_pool (p c r : Nat) : planUnits p c r ≤ p := Nat.min_le_left _ _

theorem planUnits_le_cards (p c r : Nat) (hc : 0 < c) : planUnits p c r ≤ c := by
  unfold planUnits
  have : max 1 c = c := by omega
  rw [this]
  exact Nat.le_trans (Nat.min_le_right _ _) (Nat.min_le_left _ _)

theorem planUnits_pos (p c r : Nat) (hp : 0 < p) : 0 < planUnits p c r := by
  unfold planUnits
  omega

def position (cards units i : Nat) : Nat := min (cards - 1) ((i + 1) * cards / (units + 1))

theorem position_lt_cards (c u i : Nat) (hc : 0 < c) : position c u i < c := by
  unfold position
  omega

end BucketMath.Learning.SessionMix
