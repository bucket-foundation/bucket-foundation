namespace BucketMath.Profile

structure Pair where
  re : Int
  im : Int
  deriving DecidableEq, Repr

def quarter (p : Pair) : Pair := ⟨-p.im, p.re⟩

def dot (a b : Pair) : Int := a.re * b.re + a.im * b.im

def norm2 (p : Pair) : Int := dot p p

def turns : Nat → Pair → Pair
  | 0, p => p
  | n + 1, p => quarter (turns n p)

theorem quarter_perpendicular (p : Pair) : dot p (quarter p) = 0 := by
  simp only [dot, quarter]
  rw [Int.mul_neg, Int.mul_comm p.im p.re]
  exact Int.add_left_neg _

theorem quarter_twice (p : Pair) : quarter (quarter p) = ⟨-p.re, -p.im⟩ := by
  simp [quarter]

theorem quarter_four (p : Pair) : quarter (quarter (quarter (quarter p))) = p := by
  cases p; simp [quarter]

theorem quarter_norm (p : Pair) : norm2 (quarter p) = norm2 p := by
  simp only [norm2, dot, quarter]
  rw [Int.neg_mul_neg, Int.add_comm]

theorem turns_norm (n : Nat) (p : Pair) : norm2 (turns n p) = norm2 p := by
  induction n with
  | zero => rfl
  | succ n ih => simp only [turns, quarter_norm, ih]

theorem turns_period (n : Nat) (p : Pair) : turns (n + 4) p = turns n p := by
  induction n with
  | zero => simp only [turns, quarter_four]
  | succ n ih => simp only [turns] at ih ⊢; rw [ih]

abbrev Slice := List Pair

def rotate (n : Nat) (s : Slice) : Slice := s.map (turns n)

def energy : Slice → Int
  | [] => 0
  | p :: ps => norm2 p + energy ps

theorem rotate_energy (n : Nat) (s : Slice) : energy (rotate n s) = energy s := by
  induction s with
  | nil => rfl
  | cons p ps ih => simp only [rotate, List.map_cons, energy] at ih ⊢; rw [turns_norm, ih]

theorem rotate_period (n : Nat) (s : Slice) : rotate (n + 4) s = rotate n s := by
  simp only [rotate]
  congr 1
  funext p
  exact turns_period n p

def coil (s : Slice) (steps : Nat) : List Slice := (List.range steps).map (fun k => rotate k s)

theorem coil_length (s : Slice) (steps : Nat) : (coil s steps).length = steps := by
  simp [coil]

theorem coil_energy (s : Slice) (steps : Nat) : ∀ t ∈ coil s steps, energy t = energy s := by
  intro t ht
  simp only [coil, List.mem_map] at ht
  obtain ⟨k, _, rfl⟩ := ht
  exact rotate_energy k s

end BucketMath.Profile
