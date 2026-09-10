/-!
# Missing-mass estimation: Good-Turing and Chao1

`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` Section 6b: "Good-Turing estimates the unseen
share of the hypothesis space as `f1/N`... Chao1 estimates total
richness: `S_est = S_obs + f1^2 / (2 * f2)`," with `f2 = 0` handled by the
fallback `S_obs + f1(f1-1)/2`.
-/

namespace Bucket.Unknowns

/-- The Good-Turing missing-mass estimate: the share of the hypothesis
space made of things seen exactly once, `n1 / N`
(`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` Section 6b). `Rat`'s division convention
(`x / 0 = 0`) makes `missingMass n1 0 = 0`, matching an empty corpus
having no missing mass to speak of. -/
def missingMass (n1 N : Nat) : Rat :=
  (n1 : Rat) / (N : Rat)

/-- The Chao1 richness estimate over observed species count `sObs`,
singleton count `f1`, and doubleton count `f2`
(`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` Section 6b). The `f2 = 0` case falls back to
`sObs + f1(f1-1)/2`; the subtraction `f1 - 1` happens in `Nat` (truncating
to `0` when `f1 = 0`) before the cast to `Rat`, so the fallback term never
goes negative. -/
def chao1 (sObs f1 f2 : Nat) : Rat :=
  if f2 = 0 then
    (sObs : Rat) + ((f1 * (f1 - 1) : Nat) : Rat) / 2
  else
    (sObs : Rat) + ((f1 ^ 2 : Nat) : Rat) / (2 * (f2 : Rat))

private theorem div_nonneg' {x y : Rat} (hx : 0 <= x) (hy : 0 < y) : 0 <= x / y := by
  rw [Rat.div_def]
  exact Rat.mul_nonneg hx (Rat.le_of_lt (Rat.inv_pos.mpr hy))

private theorem div_le_one' {x y : Rat} (hxy : x <= y) (hy : 0 < y) : x / y <= 1 := by
  rw [Rat.div_def]
  have hinv : 0 <= y^-1 := Rat.le_of_lt (Rat.inv_pos.mpr hy)
  calc x * y^-1 <= y * y^-1 := Rat.mul_le_mul_of_nonneg_right hxy hinv
    _ = 1 := by rw [<- Rat.div_def]; grind

/-- The missing-mass estimate never exceeds one, whenever the singleton
count is at most the total count (as it always is: `n1` counts a subset
of the `N` observations). -/
theorem missingMass_le_one (n1 N : Nat) (h : n1 <= N) : missingMass n1 N <= 1 := by
  show (n1 : Rat) / (N : Rat) <= 1
  by_cases hN : N = 0
  . have hn1 : n1 = 0 := by omega
    subst hN; subst hn1
    grind
  . have hNpos : 0 < N := Nat.pos_of_ne_zero hN
    have hNpos' : (0 : Rat) < (N : Rat) := by exact_mod_cast hNpos
    have hle : (n1 : Rat) <= (N : Rat) := by exact_mod_cast h
    exact div_le_one' hle hNpos'

/-- Chao1 never estimates less richness than what was directly observed:
the correction term is always nonnegative, in both the `f2 = 0` fallback
and the general case. -/
theorem chao1_ge_sObs (sObs f1 f2 : Nat) : (sObs : Rat) <= chao1 sObs f1 f2 := by
  show (sObs : Rat) <= chao1 sObs f1 f2
  unfold chao1
  split
  . have : (0 : Rat) <= ((f1 * (f1 - 1) : Nat) : Rat) / 2 :=
      div_nonneg' (by exact_mod_cast Nat.zero_le _) (by decide)
    grind
  . rename_i hf2
    have hf2pos : 0 < f2 := Nat.pos_of_ne_zero hf2
    have h2f2pos : (0 : Rat) < 2 * (f2 : Rat) := by
      have : (0 : Rat) < (f2 : Rat) := by exact_mod_cast hf2pos
      grind
    have : (0 : Rat) <= ((f1 ^ 2 : Nat) : Rat) / (2 * (f2 : Rat)) :=
      div_nonneg' (by exact_mod_cast Nat.zero_le _) h2f2pos
    grind

end Bucket.Unknowns
