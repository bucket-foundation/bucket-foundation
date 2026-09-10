/-!
# Belief as a subjective-logic opinion

`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §2 replaces the single truth score
`tau` with a subjective-logic opinion `(b, d, u, a)`: belief, disbelief,
uncertainty mass, and base rate, with `b + d + u = 1` and projected
probability `P = b + a·u`. `Opinion` below is the `Float` shape a running
system computes with; `Float` has no usable, provable algebra in Lean (no
`LinearOrder`, no `decide`-able equality that respects arithmetic), so no
theorem in this file is stated about it. `OpinionQ` carries the same
shape over `Rat`, where every theorem below lives.
-/

namespace Bucket.Belief

/-- A subjective-logic opinion over `Float`
(`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §2): belief, disbelief, uncertainty
mass, and base rate. This is the shape a running system computes with; see
`OpinionQ` below for the provable counterpart. -/
structure Opinion where
  b : Float
  d : Float
  u : Float
  a : Float
  deriving Repr

/-- Build an opinion from pooled supporting evidence weight `r`, pooled
refuting evidence weight `s`, the total-ignorance weight `W` (subjective
logic's standard constant, `W = 2` in `IDEAL-STATE-AND-UNKNOWNS-SPEC.md`
§2), and a base rate `a` computed upstream as `sigmoid(L_prior(h))`. -/
def fromEvidence (r s W a : Float) : Opinion :=
  { b := r / (r + s + W), d := s / (r + s + W), u := W / (r + s + W), a := a }

/-- The projected probability `P(h) = b + a·u`
(`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §2). -/
def project (ω : Opinion) : Float :=
  ω.b + ω.a * ω.u

/-- Cumulative fusion of two independent opinions sharing one base rate
(Jøsang's subjective logic; `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §3 pools
evidence the same way when it moves from raw counts to `n_eff`). The
denominator `u1 + u2 - u1*u2` vanishes only when both opinions are fully
dogmatic (`u1 = u2 = 0`); that case returns the neutral opinion
(`u := 1`) rather than dividing by zero, since cumulative fusion has no
standard reading for two opinions that both claim total certainty. -/
def fuse (ω1 ω2 : Opinion) : Opinion :=
  let denom := ω1.u + ω2.u - ω1.u * ω2.u
  if denom == 0 then
    { b := 0, d := 0, u := 1, a := ω1.a }
  else
    { b := (ω1.b * ω2.u + ω2.b * ω1.u) / denom
      d := (ω1.d * ω2.u + ω2.d * ω1.u) / denom
      u := (ω1.u * ω2.u) / denom
      a :=
        let adenom := ω1.u + ω2.u - 2 * ω1.u * ω2.u
        if adenom == 0 then (ω1.a + ω2.a) / 2
        else (ω1.a * ω2.u + ω2.a * ω1.u - (ω1.a + ω2.a) * ω1.u * ω2.u) / adenom }

/-- The `Rat` counterpart of `Opinion`, where every claim below is
proved. -/
structure OpinionQ where
  b : Rat
  d : Rat
  u : Rat
  a : Rat
  deriving Repr, DecidableEq

def fromEvidenceQ (r s W a : Rat) : OpinionQ :=
  { b := r / (r + s + W), d := s / (r + s + W), u := W / (r + s + W), a := a }

def projectQ (ω : OpinionQ) : Rat :=
  ω.b + ω.a * ω.u

/-- A nonnegative numerator over a positive denominator is nonnegative. -/
private theorem div_nonneg' {x y : Rat} (hx : 0 ≤ x) (hy : 0 < y) : 0 ≤ x / y := by
  rw [Rat.div_def]
  exact Rat.mul_nonneg hx (Rat.le_of_lt (Rat.inv_pos.mpr hy))

/-- A numerator bounded by a positive denominator divides to at most 1. -/
private theorem div_le_one' {x y : Rat} (hxy : x ≤ y) (hy : 0 < y) : x / y ≤ 1 := by
  rw [Rat.div_def]
  have hinv : 0 ≤ y⁻¹ := Rat.le_of_lt (Rat.inv_pos.mpr hy)
  calc x * y⁻¹ ≤ y * y⁻¹ := Rat.mul_le_mul_of_nonneg_right hxy hinv
    _ = 1 := by rw [← Rat.div_def]; grind

/-- `fromEvidenceQ`'s three masses sum to one, whenever the evidence
weights are nonnegative and the ignorance weight is positive
(`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §2). -/
theorem sum_eq_one (r s W a : Rat) (hr : 0 ≤ r) (hs : 0 ≤ s) (hW : 0 < W) :
    (fromEvidenceQ r s W a).b + (fromEvidenceQ r s W a).d +
      (fromEvidenceQ r s W a).u = 1 := by
  show r / (r + s + W) + s / (r + s + W) + W / (r + s + W) = 1
  grind

/-- The projected probability of a well-formed opinion (nonnegative
belief and disbelief, masses summing to one) stays in `[0, 1]` whenever
the base rate does. `b`, `d`, `u` are not free here: an opinion whose
masses do not sum to one or that carries a negative mass is not one
`fromEvidenceQ`, or subjective logic, would ever produce. -/
theorem project_mem_unit (ω : OpinionQ)
    (hb : 0 ≤ ω.b) (hd : 0 ≤ ω.d) (hu : 0 ≤ ω.u) (hsum : ω.b + ω.d + ω.u = 1)
    (ha0 : 0 ≤ ω.a) (ha1 : ω.a ≤ 1) :
    0 ≤ projectQ ω ∧ projectQ ω ≤ 1 := by
  show 0 ≤ ω.b + ω.a * ω.u ∧ ω.b + ω.a * ω.u ≤ 1
  have hau0 : 0 ≤ ω.a * ω.u := Rat.mul_nonneg ha0 hu
  have hau1 : ω.a * ω.u ≤ 1 * ω.u := Rat.mul_le_mul_of_nonneg_right ha1 hu
  grind

/-- With no evidence on either side, an opinion carries full uncertainty
mass and its projection is exactly its base rate: this is
`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §2's reading of a hypothesis nobody has
looked at yet, "the opinion form adds one missing tag: that number stands
in for evidence, and is not evidence itself." -/
theorem u_eq_one_of_no_evidence (W a : Rat) (hW : 0 < W) :
    (fromEvidenceQ 0 0 W a).u = 1 ∧ projectQ (fromEvidenceQ 0 0 W a) = a := by
  constructor
  · show W / (0 + 0 + W) = 1
    grind
  · show (0 : Rat) / (0 + 0 + W) + a * (W / (0 + 0 + W)) = a
    grind

end Bucket.Belief
