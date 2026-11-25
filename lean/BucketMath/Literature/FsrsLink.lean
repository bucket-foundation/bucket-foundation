import BucketMath.Fsrs
import BucketMath.Learning.Capacity
import BucketMath.Literature.Forgetting

namespace BucketMath.Literature.FsrsLink

open BucketMath.Learning.Capacity
open BucketMath.Literature.Forgetting

theorem powerRetention_mono_stability (U t : Nat) {S S' : Nat} (h : S ≤ S') :
    powerRetention U t S ≤ powerRetention U t S' := by
  unfold powerRetention
  by_cases hd : 9 * S + t = 0
  · rw [hd, Nat.div_zero]; exact Nat.zero_le _
  have hd' : 0 < 9 * S' + t := by omega
  rw [Nat.le_div_iff_mul_le hd']
  have hAA : 9 * S ≤ 9 * S' := by omega
  generalize 9 * S = A at *
  generalize 9 * S' = A' at *
  generalize hq : A * U / (A + t) = q
  have hdiv : q * (A + t) ≤ A * U := by
    rw [← hq]; exact Nat.div_mul_le_self _ _
  have hqU : q ≤ U := by
    apply Nat.le_of_mul_le_mul_right (c := A + t) _ (by omega)
    have : A * U ≤ U * (A + t) := by grind
    omega
  have hA : (U - q) * A ≤ (U - q) * A' := Nat.mul_le_mul_left _ hAA
  have hqA : q * A' ≤ U * A' := Nat.mul_le_mul_right _ hqU
  have e1 : q * (A + t) = q * A + q * t := Nat.mul_add _ _ _
  have e2 : q * (A' + t) = q * A' + q * t := Nat.mul_add _ _ _
  have e3 : (U - q) * A = U * A - q * A := Nat.sub_mul _ _ _
  have e4 : (U - q) * A' = U * A' - q * A' := Nat.sub_mul _ _ _
  have e5 : A * U = U * A := Nat.mul_comm _ _
  have e6 : A' * U = U * A' := Nat.mul_comm _ _
  omega

theorem powerRetention_at_zero (U S : Nat) (hS : 0 < S) : powerRetention U 0 S = U := by
  unfold powerRetention
  rw [Nat.add_zero, Nat.mul_comm (9 * S) U, Nat.mul_div_cancel _ (by omega)]

theorem powerRetention_half (U S : Nat) (hS : 0 < S) : powerRetention U (9 * S) S = U / 2 := by
  unfold powerRetention
  rw [show 9 * S + 9 * S = 9 * S * 2 by omega, Nat.mul_div_mul_left _ _ (by omega)]

theorem powerRetention_is_hyperbolic (U t S : Nat) :
    powerRetention U t S = U * hypNum (9 * S) t / hypDen (9 * S) t := by
  unfold powerRetention hypNum hypDen; rw [Nat.mul_comm U]

theorem powerInterval_mono_stability (U r n : Nat) {S S' : Nat} (h : S ≤ S') :
    lastHold (fun t S => powerRetention U t S) r S n ≤ lastHold (fun t S => powerRetention U t S) r S' n :=
  lastHold_mono_stability _ r n (fun t _ _ hs => powerRetention_mono_stability U t hs) h

theorem powerUpkeep_antitone (U r n c W : Nat) {S S' : Nat}
    (hpos : 0 < lastHold (fun t S => powerRetention U t S) r S n) (h : S ≤ S') :
    upkeep (fun t S => powerRetention U t S) r n c W S' ≤ upkeep (fun t S => powerRetention U t S) r n c W S :=
  upkeep_antitone _ r n c W (fun t _ _ hs => powerRetention_mono_stability U t hs) hpos h

theorem fsrs_stored_denominator_pos (x t : Int) (ht : 0 ≤ t) : 0 < 9 * BucketMath.Fsrs.clampS x + t := by
  have := BucketMath.Fsrs.clampS_bounds x
  unfold BucketMath.Fsrs.stabilityFloor at this
  omega

def claim_ye_2022_fsrs_ssp_mmc (n d : Nat → Nat) : Prop :=
  ∃ S, 0 < S ∧ Matches n d (hypNum (9 * S)) (hypDen (9 * S))

theorem ye_data_not_exponential {n d : Nat → Nat} (h : claim_ye_2022_fsrs_ssp_mmc n d)
    (hd : ∀ t, 0 < d t) {p q : Nat} (hq : 0 < q) : ¬ Matches n d (expNum p) (expDen q) := by
  obtain ⟨S, hS, hm⟩ := h
  rw [(hyperbolic_is_power_one _).1, (hyperbolic_is_power_one _).2] at hm
  exact wixted_data_not_exponential ⟨9 * S, 1, by omega, by decide, hm⟩ hd hq

end BucketMath.Literature.FsrsLink
