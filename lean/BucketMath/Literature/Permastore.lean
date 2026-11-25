import BucketMath.Learning.Capacity
import BucketMath.Literature.Forgetting

namespace BucketMath.Literature.Permastore

open BucketMath.Learning.Capacity
open BucketMath.Literature.Forgetting

def claim_bahrick_1984_permastore_spanish (R : Nat → Nat) (T : Nat) : Prop :=
  (∀ t t', t ≤ t' → R t' ≤ R t) ∧ ∀ t, T ≤ t → R t = R T

theorem permastore_floor {R : Nat → Nat} {T : Nat} (h : claim_bahrick_1984_permastore_spanish R T) (t : Nat) :
    R T ≤ R t := by
  by_cases ht : t ≤ T
  · exact h.1 t T ht
  · rw [h.2 t (by omega)]; exact Nat.le_refl _

theorem pow_never_flat {a : Nat} (ha : 0 < a) (T : Nat) :
    powNum a (T + 1) * powDen a T < powNum a T * powDen a (T + 1) := by
  unfold powNum powDen
  exact Nat.mul_lt_mul_of_pos_left (by omega) ha

theorem exp_never_flat {p q : Nat} (hp : 0 < p) (hpq : p < q) (T : Nat) :
    expNum p (T + 1) * expDen q T < expNum p T * expDen q (T + 1) := by
  unfold expNum expDen
  simp only [Nat.pow_succ]
  have hu : 0 < p ^ T * q ^ T := Nat.mul_pos (Nat.pow_pos hp) (Nat.pow_pos (by omega))
  have := Nat.mul_lt_mul_of_pos_left hpq hu
  grind

theorem lastHold_full (R : Nat → Nat → Nat) (r S n : Nat) (h : ∀ t, r ≤ R t S) : lastHold R r S n = n := by
  cases n with
  | zero => rfl
  | succ n => simp [lastHold, h]

theorem permastore_interval {R : Nat → Nat → Nat} {S T r n : Nat}
    (h : claim_bahrick_1984_permastore_spanish (fun t => R t S) T) (hr : r ≤ R T S) :
    lastHold R r S n = n :=
  lastHold_full R r S n (fun t => Nat.le_trans hr (permastore_floor h t))

theorem permastore_upkeep_min {R : Nat → Nat → Nat} {S T r n c W : Nat}
    (h : claim_bahrick_1984_permastore_spanish (fun t => R t S) T) (hr : r ≤ R T S) (S' : Nat) :
    upkeep R r n c W S ≤ upkeep R r n c W S' ∨ lastHold R r S' n = 0 := by
  unfold upkeep
  rw [permastore_interval h hr]
  by_cases h0 : lastHold R r S' n = 0
  · exact Or.inr h0
  · exact Or.inl (maintenance_antitone c W (by omega) (lastHold_le R r S' n))

end BucketMath.Literature.Permastore
