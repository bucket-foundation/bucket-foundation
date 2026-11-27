def lev : List Char → List Char → Nat
  | [], t => t.length
  | s, [] => s.length
  | a :: s, b :: t =>
    min (min (lev s (b :: t) + 1) (lev (a :: s) t + 1)) (lev s t + if a = b then 0 else 1)

theorem lev_nil_left (t : List Char) : lev [] t = t.length := by
  cases t <;> simp [lev]

theorem lev_nil_right (s : List Char) : lev s [] = s.length := by
  cases s <;> simp [lev]


def isCognate (d n k m : Nat) : Prop := d * m ≤ k * n

theorem isCognate_of_le {d d' n k m : Nat} (h : d' ≤ d) (hc : isCognate d n k m) :
    isCognate d' n k m :=
  Nat.le_trans (Nat.mul_le_mul_right m h) hc

def logHalfLife (base c x : Int) : Int := base + c * x

theorem logHalfLife_mono {base c x y : Int} (hc : 0 ≤ c) (hxy : x ≤ y) :
    logHalfLife base c x ≤ logHalfLife base c y :=
  Int.add_le_add_left (Int.mul_le_mul_of_nonneg_left hxy hc) base
