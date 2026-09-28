namespace BucketMath.Discovery

structure Direction where
  p : Rat
  value : Rat

def expected : List Direction → Rat
  | [] => 0
  | d :: ds => d.p * d.value + expected ds

def Admissible (ds : List Direction) : Prop := ∀ d ∈ ds, 0 ≤ d.p ∧ 0 ≤ d.value

theorem expected_nil : expected [] = 0 := rfl

theorem expected_append (a b : List Direction) : expected (a ++ b) = expected a + expected b := by
  induction a with
  | nil => simp [expected] <;> grind
  | cons d ds ih => simp only [List.cons_append, expected, ih]; grind

theorem expected_nonneg (ds : List Direction) (h : Admissible ds) : 0 ≤ expected ds := by
  induction ds with
  | nil => simp [expected]
  | cons d ds ih =>
    have hd := h d (by simp)
    have hr := ih (fun e he => h e (by simp [he]))
    have := Rat.mul_nonneg hd.1 hd.2
    simp only [expected]
    grind

theorem expected_mono (ds extra : List Direction) (h : Admissible extra) :
    expected ds ≤ expected (ds ++ extra) := by
  rw [expected_append]
  have := expected_nonneg extra h
  grind

end BucketMath.Discovery
