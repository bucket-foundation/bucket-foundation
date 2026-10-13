def RETEST_MS : Nat := 7 * 24 * 60 * 60 * 1000

def retestDue (t : Nat) : Nat := t + RETEST_MS

theorem retestDue_gt (t : Nat) : t < retestDue t := by
  unfold retestDue RETEST_MS
  omega

structure Probe where
  correct : Nat
  items : Nat
  bounded : correct <= items

def Probe.numerator (p : Probe) : Int := 4 * (p.correct : Int) - p.items
def Probe.denominator (p : Probe) : Int := 3 * (p.items : Int)

theorem Probe.numerator_le_denominator (p : Probe) : p.numerator <= p.denominator := by
  unfold Probe.numerator Probe.denominator
  have h := p.bounded
  omega

theorem Probe.numerator_ge_neg_items (p : Probe) : -(p.items : Int) <= p.numerator := by
  unfold Probe.numerator
  omega

theorem Probe.numerator_zero_at_chance (p : Probe) (h : 4 * p.correct = p.items) :
    p.numerator = 0 := by
  unfold Probe.numerator
  omega

structure Interval where
  lo : Int
  hi : Int

def dependence (gain learning : Interval) : Prop := 0 < gain.lo ∧ learning.lo <= 0

theorem dependence_needs_gain (gain learning : Interval) (h : dependence gain learning) : 0 < gain.lo :=
  h.1

theorem no_dependence_when_learning_kept (gain learning : Interval) (h : 0 < learning.lo) :
    ¬ dependence gain learning :=
  fun d => absurd d.2 (Int.not_le.mpr h)
