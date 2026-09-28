namespace BucketMath.Markets

structure Industry where
  roc : Int
  wacc : Int
  capital : Int

def spread (i : Industry) : Int := i.roc - i.wacc

def eva (i : Industry) : Int := spread i * i.capital

inductive Regime where
  | below
  | efficient
  | above
deriving DecidableEq

def classify (band : Int) (i : Industry) : Regime :=
  if spread i > band then .above
  else if spread i < -band then .below
  else .efficient

theorem eva_pos_iff (i : Industry) (h : 0 < i.capital) : 0 < eva i ↔ 0 < spread i := by
  unfold eva
  constructor
  · intro hp
    by_cases hs : 0 < spread i
    · exact hs
    · exact absurd hp (Int.not_lt.mpr (Int.mul_nonpos_of_nonpos_of_nonneg (Int.not_lt.mp hs) (Int.le_of_lt h)))
  · intro hs
    exact Int.mul_pos hs h

theorem eva_zero_iff (i : Industry) (h : 0 < i.capital) : eva i = 0 ↔ spread i = 0 := by
  unfold eva
  constructor
  · intro hz
    rcases Int.mul_eq_zero.mp hz with hs | hc
    · exact hs
    · omega
  · intro hs
    simp [hs]

theorem classify_efficient_iff (band : Int) (i : Industry) :
    classify band i = .efficient ↔ -band ≤ spread i ∧ spread i ≤ band := by
  unfold classify
  by_cases h1 : spread i > band
  · simp [h1] <;> omega
  · by_cases h2 : spread i < -band
    · simp [h1, h2] <;> omega
    · simp [h1, h2] <;> omega

theorem classify_above_iff (band : Int) (i : Industry) :
    classify band i = .above ↔ band < spread i := by
  unfold classify
  by_cases h1 : spread i > band
  · simp [h1]
  · by_cases h2 : spread i < -band
    · simp [h1, h2] <;> omega
    · simp [h1, h2] <;> omega

theorem zero_spread_is_efficient (band : Int) (hb : 0 ≤ band) (i : Industry)
    (h : spread i = 0) : classify band i = .efficient := by
  rw [classify_efficient_iff]
  omega

def entry (step : Int) (i : Industry) : Industry :=
  { i with roc := i.roc - step }

def compete (step : Int) : Nat → Industry → Industry
  | 0, i => i
  | n + 1, i => if spread i > 0 then compete step n (entry step i) else i

theorem spread_entry (step : Int) (i : Industry) : spread (entry step i) = spread i - step := by
  simp [spread, entry]; omega

theorem compete_bound (step : Int) :
    ∀ (n : Nat) (i : Industry), spread (compete step n i) ≤ max 0 (spread i - n * step) := by
  intro n
  induction n with
  | zero => intro i; simp [compete]; omega
  | succ n ih =>
    intro i
    unfold compete
    by_cases h : spread i > 0
    · simp only [h, ite_true]
      have := ih (entry step i)
      rw [spread_entry] at this
      have hmul : ((n + 1 : Nat) : Int) * step = (n : Int) * step + step := by
        push_cast; rw [Int.add_mul, Int.one_mul]
      rw [hmul]
      omega
    · simp only [h, ite_false]
      omega

theorem compete_reaches_efficiency (step : Int) (i : Industry) (n : Nat)
    (hn : spread i ≤ n * step) : spread (compete step n i) ≤ 0 := by
  have := compete_bound step n i
  omega

end BucketMath.Markets
