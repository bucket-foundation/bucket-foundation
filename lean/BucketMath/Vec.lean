namespace BucketMath.Vec

def sum : List Rat → Rat
  | [] => 0
  | x :: xs => x + sum xs

def dot : List Rat → List Rat → Rat
  | x :: xs, y :: ys => x * y + dot xs ys
  | _, _ => 0

def smul (c : Rat) : List Rat → List Rat
  | [] => []
  | x :: xs => (c * x) :: smul c xs

def sub : List Rat → List Rat → List Rat
  | x :: xs, y :: ys => (x - y) :: sub xs ys
  | _, _ => []

def add : List Rat → List Rat → List Rat
  | x :: xs, y :: ys => (x + y) :: add xs ys
  | _, _ => []

theorem length_smul (c : Rat) (v : List Rat) : (smul c v).length = v.length := by
  induction v with
  | nil => rfl
  | cons x xs ih => simp [smul, ih]

theorem dot_comm (a b : List Rat) : dot a b = dot b a := by
  induction a generalizing b with
  | nil => cases b <;> rfl
  | cons x xs ih =>
    cases b with
    | nil => rfl
    | cons y ys => simp only [dot, ih ys]; grind

theorem dot_smul_right (c : Rat) (a b : List Rat) : dot a (smul c b) = c * dot a b := by
  induction a generalizing b with
  | nil => cases b <;> simp [dot] <;> grind
  | cons x xs ih =>
    cases b with
    | nil => simp [dot, smul]
    | cons y ys => simp only [smul, dot, ih ys]; grind

theorem dot_smul_left (c : Rat) (a b : List Rat) : dot (smul c a) b = c * dot a b := by
  rw [dot_comm, dot_smul_right, dot_comm]

theorem dot_sub_left (a b c : List Rat) (h : a.length = b.length) :
    dot (sub a b) c = dot a c - dot b c := by
  induction a generalizing b c with
  | nil => cases b <;> cases c <;> simp_all [dot, sub] <;> grind
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      cases c with
      | nil => simp [dot, sub]; grind
      | cons z zs =>
        simp only [List.length_cons, Nat.add_right_cancel_iff] at h
        simp only [sub, dot, ih ys zs h]; grind

theorem dot_sub_right (a b c : List Rat) (h : b.length = c.length) :
    dot a (sub b c) = dot a b - dot a c := by
  rw [dot_comm, dot_sub_left _ _ _ h, dot_comm b, dot_comm c]

theorem length_sub (a b : List Rat) (h : a.length = b.length) : (sub a b).length = a.length := by
  induction a generalizing b with
  | nil => cases b <;> rfl
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      simp only [List.length_cons, Nat.add_right_cancel_iff] at h
      simp [sub, ih ys h]

theorem sum_sub_const (xs : List Rat) (c : Rat) :
    sum (xs.map (· - c)) = sum xs - xs.length * c := by
  induction xs with
  | nil => simp [sum]; grind
  | cons x xs ih => simp only [List.map_cons, sum, ih, List.length_cons]; push_cast; grind

theorem centered_sum_zero (xs : List Rat) (h : xs ≠ []) :
    sum (xs.map (· - sum xs / xs.length)) = 0 := by
  rw [sum_sub_const]
  have hn : (xs.length : Rat) ≠ 0 := by
    have : xs.length ≠ 0 := by simpa [List.length_eq_zero_iff] using h
    exact_mod_cast this
  rw [Rat.div_def, Rat.mul_comm (sum xs), ← Rat.mul_assoc, Rat.mul_inv_cancel _ hn]
  grind

theorem sum_add (a b : List Rat) (h : a.length = b.length) : sum (add a b) = sum a + sum b := by
  induction a generalizing b with
  | nil => cases b <;> simp_all [sum, add] <;> grind
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      simp only [List.length_cons, Nat.add_right_cancel_iff] at h
      simp only [add, sum, ih ys h]; grind

theorem sum_smul (c : Rat) (a : List Rat) : sum (smul c a) = c * sum a := by
  induction a with
  | nil => simp [sum, smul]
  | cons x xs ih => simp only [smul, sum, ih]; grind

end BucketMath.Vec
