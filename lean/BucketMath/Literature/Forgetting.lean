import Std

namespace BucketMath.Literature.Forgetting

def LogLinearAt (n d : Nat → Nat) (t : Nat) : Prop :=
  n (t + 1) * n (t + 1) * (d t * d (t + 2)) = n t * n (t + 2) * (d (t + 1) * d (t + 1))

def StrictLogConvexAt (n d : Nat → Nat) (t : Nat) : Prop :=
  n (t + 1) * n (t + 1) * (d t * d (t + 2)) < n t * n (t + 2) * (d (t + 1) * d (t + 1))

def expNum (p t : Nat) : Nat := p ^ t

def expDen (q t : Nat) : Nat := q ^ t

def hypNum (a _t : Nat) : Nat := a

def hypDen (a t : Nat) : Nat := a + t

theorem exp_logLinear (p q t : Nat) : LogLinearAt (expNum p) (expDen q) t := by
  unfold LogLinearAt expNum expDen
  simp only [Nat.pow_succ]
  grind

theorem hyp_strictLogConvex {a : Nat} (ha : 0 < a) (t : Nat) :
    StrictLogConvexAt (hypNum a) (hypDen a) t := by
  unfold StrictLogConvexAt hypNum hypDen
  have h : 0 < a * a := Nat.mul_pos ha ha
  have e1 : a * a * ((a + t) * (a + (t + 2))) + a * a = a * a * ((a + (t + 1)) * (a + (t + 1))) := by grind
  omega

theorem exp_antitone {p q : Nat} (h : p ≤ q) (t : Nat) :
    expNum p (t + 1) * expDen q t ≤ expNum p t * expDen q (t + 1) := by
  unfold expNum expDen
  simp only [Nat.pow_succ]
  have := Nat.mul_le_mul_left (p ^ t * q ^ t) h
  grind

theorem hyp_antitone (a t : Nat) : hypNum a (t + 1) * hypDen a t ≤ hypNum a t * hypDen a (t + 1) := by
  unfold hypNum hypDen
  exact Nat.mul_le_mul_left a (by omega)

theorem hyp_mono_stability {a a' : Nat} (h : a ≤ a') (t : Nat) :
    hypNum a t * hypDen a' t ≤ hypNum a' t * hypDen a t := by
  unfold hypNum hypDen
  have := Nat.mul_le_mul_right t h
  grind

theorem hyp_half_at_stability (a : Nat) : hypDen a a = 2 * hypNum a a := by
  unfold hypDen hypNum; omega

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

theorem exp_cannot_match_hyp {a : Nat} (ha : 0 < a) {p q : Nat} (hq : 0 < q) :
    ¬ Matches (hypNum a) (hypDen a) (expNum p) (expDen q) :=
  exp_rejected_of_strictLogConvex (hyp_strictLogConvex ha 0) hq

def claim_murre_2015_ebbinghaus_replication (n d : Nat → Nat) : Prop :=
  ∃ t, StrictLogConvexAt n d t

theorem ebbinghaus_data_not_exponential {n d : Nat → Nat}
    (h : claim_murre_2015_ebbinghaus_replication n d) {p q : Nat} (hq : 0 < q) :
    ¬ Matches n d (expNum p) (expDen q) := by
  obtain ⟨t, ht⟩ := h
  exact exp_rejected_of_strictLogConvex ht hq

def powerNum (s e _t : Nat) : Nat := s ^ e

def powerDen (s e t : Nat) : Nat := (s + t) ^ e

theorem hyperbolic_is_power_one (s : Nat) : hypNum s = powerNum s 1 ∧ hypDen s = powerDen s 1 := by
  refine ⟨funext fun t => ?_, funext fun t => ?_⟩ <;> simp [hypNum, hypDen, powerNum, powerDen]

theorem power_strictLogConvex {s e : Nat} (hs : 0 < s) (he : 0 < e) (t : Nat) :
    StrictLogConvexAt (powerNum s e) (powerDen s e) t := by
  unfold StrictLogConvexAt powerNum powerDen
  have base : (s + t) * (s + (t + 2)) < (s + (t + 1)) * (s + (t + 1)) := by grind
  have hp := Nat.pow_lt_pow_left base (Nat.ne_of_gt he)
  rw [Nat.mul_pow, Nat.mul_pow] at hp
  have hpos : 0 < s ^ e * s ^ e := Nat.mul_pos (Nat.pow_pos hs) (Nat.pow_pos hs)
  have := Nat.mul_lt_mul_of_pos_left hp hpos
  grind

theorem power_antitone (s e t : Nat) :
    powerNum s e (t + 1) * powerDen s e t ≤ powerNum s e t * powerDen s e (t + 1) := by
  unfold powerNum powerDen
  exact Nat.mul_le_mul_left _ (Nat.pow_le_pow_left (by omega) e)

theorem power_steeper_with_exponent {s e e' t : Nat} (h : e ≤ e') :
    powerNum s e' t * powerDen s e t ≤ powerNum s e t * powerDen s e' t := by
  unfold powerNum powerDen
  obtain ⟨k, rfl⟩ : ∃ k, e' = e + k := ⟨e' - e, by omega⟩
  rw [Nat.pow_add, Nat.pow_add]
  have : s ^ k ≤ (s + t) ^ k := Nat.pow_le_pow_left (by omega) k
  have := Nat.mul_le_mul_left (s ^ e * (s + t) ^ e) this
  grind

theorem exp_cannot_match_power {s e : Nat} (hs : 0 < s) (he : 0 < e) {p q : Nat} (hq : 0 < q) :
    ¬ Matches (powerNum s e) (powerDen s e) (expNum p) (expDen q) :=
  exp_rejected_of_strictLogConvex (power_strictLogConvex hs he 0) hq

def claim_wixted_1991_form_of_forgetting (n d : Nat → Nat) : Prop :=
  ∃ s e, 0 < s ∧ 0 < e ∧ Matches n d (powerNum s e) (powerDen s e)

theorem wixted_data_not_exponential {n d : Nat → Nat} (h : claim_wixted_1991_form_of_forgetting n d)
    (hd : ∀ t, 0 < d t) {p q : Nat} (hq : 0 < q) : ¬ Matches n d (expNum p) (expDen q) := by
  obtain ⟨s, e, hs, he, hm⟩ := h
  intro hx
  have hpd : ∀ t, 0 < powerDen s e t := fun t => Nat.pow_pos (by omega)
  have hc := power_strictLogConvex hs he 0
  have hl := logLinear_of_matches_exp hq hx 0
  unfold StrictLogConvexAt LogLinearAt Matches at *
  have h0 := hm 0
  have h1 := hm 1
  have h2 := hm 2
  generalize powerNum s e 0 = a0 at *
  generalize powerNum s e 1 = a1 at *
  generalize powerNum s e 2 = a2 at *
  have p0 := hpd 0
  have p1 := hpd 1
  have p2 := hpd 2
  generalize powerDen s e 0 = b0 at *
  generalize powerDen s e 1 = b1 at *
  generalize powerDen s e 2 = b2 at *
  have d0 := hd 0
  have d1 := hd 1
  have d2 := hd 2
  have hK : 0 < d 0 * d 2 * (d 1 * d 1) := Nat.mul_pos (Nat.mul_pos d0 d2) (Nat.mul_pos d1 d1)
  have := Nat.mul_lt_mul_of_pos_right hc hK
  have e1 : a1 * a1 * (b0 * b2) * (d 0 * d 2 * (d 1 * d 1))
      = (n 1 * n 1 * (d 0 * d 2)) * (b0 * b2 * (b1 * b1)) := by
    have : a1 * d 1 = n 1 * b1 := by grind
    grind
  have e2 : a0 * a2 * (b1 * b1) * (d 0 * d 2 * (d 1 * d 1))
      = (n 0 * n 2 * (d 1 * d 1)) * (b0 * b2 * (b1 * b1)) := by grind
  rw [e1, e2, hl] at this
  exact Nat.lt_irrefl _ this

end BucketMath.Literature.Forgetting
