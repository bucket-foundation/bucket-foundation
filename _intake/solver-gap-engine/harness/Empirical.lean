import Mathlib

def sampleCheck (name : String) (lo hi : Nat) (p : Nat → Bool) : IO Nat := do
  let fails := (List.range (hi - lo)).map (· + lo) |>.filter (fun n => !p n)
  IO.println s!"{name}: {hi - lo} samples, {fails.length} failures {fails.take 5}"
  return fails.length

def wilson (n : Nat) : Bool := !(n.Prime) || n < 2 || ((n - 1).factorial + 1) % n == 0
def fermatLittle (n : Nat) : Bool := !(n.Prime) || (List.range 20).all (fun a => (a ^ n) % n == a % n)
def oddSum (n : Nat) : Bool := ((List.range n).map (fun k => 2 * k + 1)).sum == n ^ 2
def goldbach (n : Nat) : Bool := n % 2 == 1 || n < 4 || (List.range n).any (fun p => p.Prime && (n - p).Prime)

theorem oddSum_proved (n : Nat) : ((List.range n).map (fun k => 2 * k + 1)).sum = n ^ 2 := by
  induction n with
  | zero => simp
  | succ n ih => rw [List.range_succ, List.map_append, List.sum_append, ih]; simp; ring

theorem fermatLittle_proved (p a : Nat) (hp : p.Prime) : a ^ p ≡ a [MOD p] := by
  have := Fact.mk hp
  rw [← ZMod.natCast_eq_natCast_iff]; push_cast; exact ZMod.pow_card _

theorem wilson_proved (p : Nat) [Fact p.Prime] : ((p - 1).factorial : ZMod p) = -1 :=
  ZMod.wilsons_lemma p

def main : IO UInt32 := do
  let f ← [("wilson, proved as wilson_proved", 300, wilson), ("fermat little, proved as fermatLittle_proved", 300, fermatLittle),
    ("odd sum, proved as oddSum_proved", 300, oddSum), ("goldbach, open", 3000, goldbach)].mapM
    (fun (n, hi, p) => sampleCheck n 0 hi p)
  let total := f.foldl (· + ·) 0
  IO.println s!"total failures {total}"
  return if total == 0 then 0 else 1
