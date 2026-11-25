import Std

namespace BucketMath.Literature.Forgetting

def LogLinearAt (n d : Nat → Nat) (t : Nat) : Prop :=
  n (t + 1) * n (t + 1) * (d t * d (t + 2)) = n t * n (t + 2) * (d (t + 1) * d (t + 1))

def StrictLogConvexAt (n d : Nat → Nat) (t : Nat) : Prop :=
  n (t + 1) * n (t + 1) * (d t * d (t + 2)) < n t * n (t + 2) * (d (t + 1) * d (t + 1))

def expNum (p t : Nat) : Nat := p ^ t

def expDen (q t : Nat) : Nat := q ^ t

def powNum (a _t : Nat) : Nat := a

def powDen (a t : Nat) : Nat := a + t

theorem exp_logLinear (p q t : Nat) : LogLinearAt (expNum p) (expDen q) t := by
  unfold LogLinearAt expNum expDen
  simp only [Nat.pow_succ]
  grind

theorem pow_strictLogConvex {a : Nat} (ha : 0 < a) (t : Nat) :
    StrictLogConvexAt (powNum a) (powDen a) t := by
  unfold StrictLogConvexAt powNum powDen
  have h : 0 < a * a := Nat.mul_pos ha ha
  have e1 : a * a * ((a + t) * (a + (t + 2))) + a * a = a * a * ((a + (t + 1)) * (a + (t + 1))) := by grind
  omega

theorem exp_antitone {p q : Nat} (h : p ≤ q) (t : Nat) :
    expNum p (t + 1) * expDen q t ≤ expNum p t * expDen q (t + 1) := by
  unfold expNum expDen
  simp only [Nat.pow_succ]
  have := Nat.mul_le_mul_left (p ^ t * q ^ t) h
  grind

theorem pow_antitone (a t : Nat) : powNum a (t + 1) * powDen a t ≤ powNum a t * powDen a (t + 1) := by
  unfold powNum powDen
  exact Nat.mul_le_mul_left a (by omega)

theorem pow_mono_stability {a a' : Nat} (h : a ≤ a') (t : Nat) :
    powNum a t * powDen a' t ≤ powNum a' t * powDen a t := by
  unfold powNum powDen
  have := Nat.mul_le_mul_right t h
  grind

theorem pow_half_at_stability (a : Nat) : powDen a a = 2 * powNum a a := by
  unfold powDen powNum; omega

def Matches (n d n' d' : Nat → Nat) : Prop := ∀ t, n t * d' t = n' t * d t

theorem logLinear_of_matches_exp {n d : Nat → Nat} {p q : Nat} (hq : 0 < q)
    (hm : Matches n d (expNum p) (expDen q)) (t : Nat) : LogLinearAt n d t := by
  have h0 := hm t
  have h1 := hm (t + 1)
  have h2 := hm (t + 2)
  have hl := exp_logLinear p q t
  unfold LogLinearAt at *
  unfold expNum expDen at *
  have hF : 0 < q ^ t * q ^ (t + 2) * (q ^ (t + 1) * q ^ (t + 1)) := by
    have := Nat.pow_pos (n := t) hq
    have := Nat.pow_pos (n := (t + 1)) hq
    have := Nat.pow_pos (n := (t + 2)) hq
    apply Nat.mul_pos <;> apply Nat.mul_pos <;> assumption
  apply Nat.eq_of_mul_eq_mul_right hF
  calc n (t + 1) * n (t + 1) * (d t * d (t + 2)) * (q ^ t * q ^ (t + 2) * (q ^ (t + 1) * q ^ (t + 1)))
      = (n (t + 1) * q ^ (t + 1)) * (n (t + 1) * q ^ (t + 1)) * (d t * d (t + 2)) * (q ^ t * q ^ (t + 2)) := by grind
    _ = (p ^ (t + 1) * d (t + 1)) * (p ^ (t + 1) * d (t + 1)) * (d t * d (t + 2)) * (q ^ t * q ^ (t + 2)) := by rw [h1]
    _ = (p ^ (t + 1) * p ^ (t + 1) * (q ^ t * q ^ (t + 2))) * (d (t + 1) * d (t + 1)) * (d t * d (t + 2)) := by grind
    _ = (p ^ t * p ^ (t + 2) * (q ^ (t + 1) * q ^ (t + 1))) * (d (t + 1) * d (t + 1)) * (d t * d (t + 2)) := by rw [hl]
    _ = (p ^ t * d t) * (p ^ (t + 2) * d (t + 2)) * (d (t + 1) * d (t + 1)) * (q ^ (t + 1) * q ^ (t + 1)) := by grind
    _ = (n t * q ^ t) * (n (t + 2) * q ^ (t + 2)) * (d (t + 1) * d (t + 1)) * (q ^ (t + 1) * q ^ (t + 1)) := by rw [h0, h2]
    _ = n t * n (t + 2) * (d (t + 1) * d (t + 1)) * (q ^ t * q ^ (t + 2) * (q ^ (t + 1) * q ^ (t + 1))) := by grind

theorem exp_rejected_of_strictLogConvex {n d : Nat → Nat} {t : Nat} (h : StrictLogConvexAt n d t)
    {p q : Nat} (hq : 0 < q) : ¬ Matches n d (expNum p) (expDen q) := fun hm => by
  have := logLinear_of_matches_exp hq hm t
  unfold StrictLogConvexAt LogLinearAt at *
  omega

theorem exp_cannot_match_pow {a : Nat} (ha : 0 < a) {p q : Nat} (hq : 0 < q) :
    ¬ Matches (powNum a) (powDen a) (expNum p) (expDen q) :=
  exp_rejected_of_strictLogConvex (pow_strictLogConvex ha 0) hq

def claim_murre_2015_ebbinghaus_replication (n d : Nat → Nat) : Prop :=
  ∃ t, StrictLogConvexAt n d t

theorem ebbinghaus_data_not_exponential {n d : Nat → Nat}
    (h : claim_murre_2015_ebbinghaus_replication n d) {p q : Nat} (hq : 0 < q) :
    ¬ Matches n d (expNum p) (expDen q) := by
  obtain ⟨t, ht⟩ := h
  exact exp_rejected_of_strictLogConvex ht hq

def claim_wixted_power_forgetting (n d : Nat → Nat) : Prop :=
  ∃ a, 0 < a ∧ Matches n d (powNum a) (powDen a)

end BucketMath.Literature.Forgetting
