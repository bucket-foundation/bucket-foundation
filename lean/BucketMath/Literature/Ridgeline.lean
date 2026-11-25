import Std

namespace BucketMath.Literature.Ridgeline

def InBand (lo hi gap ri : Nat) : Prop := lo * ri ≤ 100 * gap ∧ 100 * gap ≤ hi * ri

def claim_cepeda_2008_spacing_temporal_ridgeline (opt : Nat → Nat) : Prop :=
  (∀ ri, 0 < ri → InBand 10 20 (opt ri) ri) ∧ ∀ ri ri', 0 < ri → ri ≤ ri' → opt ri' * ri ≤ opt ri * ri'

theorem fixed_gap_not_optimal {opt : Nat → Nat} (h : claim_cepeda_2008_spacing_temporal_ridgeline opt) (g : Nat) :
    opt (10 * g + 10) ≠ g := by
  have := (h.1 (10 * g + 10) (by omega)).1
  omega

theorem optimal_gap_at_least_tenth {opt : Nat → Nat} (h : claim_cepeda_2008_spacing_temporal_ridgeline opt) {ri : Nat}
    (hri : 0 < ri) : ri ≤ 10 * opt ri := by
  have := (h.1 ri hri).1
  omega

theorem optimal_gap_below_interval {opt : Nat → Nat} (h : claim_cepeda_2008_spacing_temporal_ridgeline opt) {ri : Nat}
    (hri : 0 < ri) : 5 * opt ri ≤ ri := by
  have := (h.1 ri hri).2
  omega

theorem ratio_band_shrinks_absolute {opt : Nat → Nat} (h : claim_cepeda_2008_spacing_temporal_ridgeline opt)
    {ri ri' : Nat} (hri : 0 < ri) (hle : ri ≤ ri') : opt ri' * ri ≤ opt ri * ri' :=
  h.2 ri ri' hri hle

theorem year_interval_gap (opt : Nat → Nat) (h : claim_cepeda_2008_spacing_temporal_ridgeline opt) :
    37 ≤ opt 365 ∧ opt 365 ≤ 73 := by
  have := h.1 365 (by decide)
  unfold InBand at this
  omega

end BucketMath.Literature.Ridgeline
