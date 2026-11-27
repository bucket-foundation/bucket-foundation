import Std

namespace BucketMath.Literature.Bkt

def learn (T L : Rat) : Rat := L + (1 - L) * T

def learnN (T L : Rat) : Nat → Rat
  | 0 => L
  | n + 1 => learn T (learnN T L n)

theorem learn_ge {T L : Rat} (hT : 0 ≤ T) (hL : L ≤ 1) : L ≤ learn T L := by
  unfold learn
  have : 0 ≤ (1 - L) * T := Rat.mul_nonneg (by grind) hT
  grind

theorem learn_le_one {T L : Rat} (hT : T ≤ 1) (hL : L ≤ 1) : learn T L ≤ 1 := by
  unfold learn
  have : 0 ≤ (1 - L) * (1 - T) := Rat.mul_nonneg (by grind) (by grind)
  grind

theorem unlearned_closed_form (T L : Rat) (n : Nat) :
    1 - learnN T L n = (1 - L) * (1 - T) ^ n := by
  induction n with
  | zero => simp [learnN]
  | succ n ih =>
      simp only [learnN, learn, Rat.pow_succ]
      grind

def evidenceNum (L s : Rat) : Rat := L * (1 - s)

def evidenceDen (L s g : Rat) : Rat := L * (1 - s) + (1 - L) * g

theorem correct_raises_belief {L s g : Rat} (h0 : 0 ≤ L) (hL : L ≤ 1) (hg : g ≤ 1 - s) :
    L * evidenceDen L s g ≤ evidenceNum L s := by
  unfold evidenceNum evidenceDen
  have h1 : 0 ≤ L * (1 - L) * ((1 - s) - g) := Rat.mul_nonneg (Rat.mul_nonneg h0 (by grind)) (by grind)
  grind

def claim_corbett_1994_knowledge_tracing (s g : Rat) : Prop :=
  evidenceDen 0 s g < evidenceDen 1 s g

theorem corbett_identifiable {s g : Rat} (h : claim_corbett_1994_knowledge_tracing s g) : g + s < 1 := by
  unfold claim_corbett_1994_knowledge_tracing evidenceDen at h
  grind

theorem corbett_correct_raises {L s g : Rat} (h0 : 0 ≤ L) (hL : L ≤ 1)
    (h : claim_corbett_1994_knowledge_tracing s g) : L * evidenceDen L s g ≤ evidenceNum L s :=
  correct_raises_belief h0 hL (by have := corbett_identifiable h; grind)

end BucketMath.Literature.Bkt
