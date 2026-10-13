import BucketMath.Vec

namespace BucketMath.Marketing

open BucketMath.Vec

def ratio (num den : Rat) : Option Rat := if den = 0 then none else some (num / den)

def ctr (clicks impressions : Rat) : Option Rat := ratio clicks impressions

def cpc (spend clicks : Rat) : Option Rat := ratio spend clicks

def cpa (spend conversions : Rat) : Option Rat := ratio spend conversions

def roas (revenue spend : Rat) : Option Rat := ratio revenue spend

def cac (spend newCustomers : Rat) : Option Rat := ratio spend newCustomers

def ltvHist (revenue customers : Rat) : Option Rat := ratio revenue customers

def retention (active cohort : Rat) : Option Rat := ratio active cohort

def shares (xs : List Rat) : List Rat := xs.map (· / sum xs)

def linearCredits (path : List Nat) : List Rat := List.replicate path.length (1 / (path.length : Rat))

def lastTouchCredits (path : List Nat) : List Rat := if path = [] then [] else [1]

def totalCredit (credits : List Nat → List Rat) (paths : List (List Nat)) : Rat := sum (paths.map fun p => sum (credits p))

theorem ratio_mul {num den x : Rat} (h : ratio num den = some x) : x * den = num := by
  unfold ratio at h
  split at h
  · contradiction
  · rename_i hd
    cases h
    exact Rat.div_mul_cancel hd

theorem cpa_mul {spend conversions x : Rat} (h : cpa spend conversions = some x) : x * conversions = spend :=
  ratio_mul h

theorem ratio_le_one {num den x : Rat} (hn : 0 ≤ num) (hle : num ≤ den) (h : ratio num den = some x) : x ≤ 1 := by
  have hm := ratio_mul h
  unfold ratio at h
  split at h
  · contradiction
  · rename_i hd
    have hpos : 0 < den := by grind
    apply Classical.byContradiction
    intro hx
    have hx' : 1 < x := Rat.not_le.mp hx
    have : den < x * den := by
      have := Rat.mul_lt_mul_of_pos_right hx' hpos
      simpa using this
    rw [hm] at this
    exact absurd hle (Rat.not_le.mpr this)

theorem ctr_le_one {clicks impressions x : Rat} (hc : 0 ≤ clicks) (hle : clicks ≤ impressions)
    (h : ctr clicks impressions = some x) : x ≤ 1 :=
  ratio_le_one hc hle h

theorem retention_le_one {active cohort x : Rat} (ha : 0 ≤ active) (hle : active ≤ cohort)
    (h : retention active cohort = some x) : x ≤ 1 :=
  ratio_le_one ha hle h

theorem roas_ge_one_iff {revenue spend : Rat} (hs : 0 < spend) :
    roas revenue spend = some (revenue / spend) ∧ (1 ≤ revenue / spend ↔ spend ≤ revenue) := by
  have hne : spend ≠ 0 := fun e => by rw [e] at hs; exact Rat.lt_irrefl hs
  refine ⟨by simp [roas, ratio, hne], ?_⟩
  constructor
  · intro h
    have := Rat.mul_le_mul_of_nonneg_right h (Rat.le_of_lt hs)
    rwa [Rat.one_mul, Rat.div_mul_cancel hne] at this
  · intro h
    apply Classical.byContradiction
    intro hx
    have hx' : revenue / spend < 1 := Rat.not_le.mp hx
    have := Rat.mul_lt_mul_of_pos_right hx' hs
    rw [Rat.div_mul_cancel hne, Rat.one_mul] at this
    exact absurd h (Rat.not_le.mpr this)

theorem sum_map_div (xs : List Rat) (t : Rat) : sum (xs.map (· / t)) = sum xs / t := by
  induction xs with
  | nil => simp only [List.map_nil, sum]; grind
  | cons x xs ih =>
    simp only [List.map_cons, sum, ih]
    grind

theorem mix_sum_one {xs : List Rat} (h : sum xs ≠ 0) : sum (shares xs) = 1 := by
  unfold shares
  rw [sum_map_div]
  grind

theorem sum_replicate (n : Nat) (c : Rat) : sum (List.replicate n c) = n * c := by
  induction n with
  | zero => simp [sum]
  | succ k ih => simp only [List.replicate_succ, sum, ih]; grind

theorem linear_path_one {path : List Nat} (h : path ≠ []) : sum (linearCredits path) = 1 := by
  unfold linearCredits
  rw [sum_replicate]
  have : (path.length : Rat) ≠ 0 := by
    have hl : path.length ≠ 0 := fun e => h (List.length_eq_zero_iff.mp e)
    exact_mod_cast hl
  grind

theorem last_touch_path_one {path : List Nat} (h : path ≠ []) : sum (lastTouchCredits path) = 1 := by
  simp [lastTouchCredits, h, sum]
  grind

theorem credit_conserves (credits : List Nat → List Rat) (hc : ∀ p, p ≠ [] → sum (credits p) = 1)
    (paths : List (List Nat)) (hp : ∀ p ∈ paths, p ≠ []) : totalCredit credits paths = paths.length := by
  induction paths with
  | nil => simp [totalCredit, sum]
  | cons p ps ih =>
    have h1 := hc p (hp p List.mem_cons_self)
    have h2 := ih (fun q hq => hp q (List.mem_cons_of_mem p hq))
    simp only [totalCredit, List.map_cons, sum] at h2 ⊢
    rw [h1, h2]
    simp only [List.length_cons]
    grind

theorem linear_conserves (paths : List (List Nat)) (hp : ∀ p ∈ paths, p ≠ []) :
    totalCredit linearCredits paths = paths.length :=
  credit_conserves linearCredits (fun _ h => linear_path_one h) paths hp

theorem last_touch_conserves (paths : List (List Nat)) (hp : ∀ p ∈ paths, p ≠ []) :
    totalCredit lastTouchCredits paths = paths.length :=
  credit_conserves lastTouchCredits (fun _ h => last_touch_path_one h) paths hp

end BucketMath.Marketing
