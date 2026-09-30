import Mathlib

def sampleCheck (name : String) (lo hi : Nat) (p : Nat → Bool) : IO Unit := do
  let fails := (List.range (hi - lo)).map (· + lo) |>.filter (fun n => !p n)
  IO.println s!"{name}: {hi - lo} samples, {fails.length} failures {fails.take 5}"

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

def main : IO Unit := do
  sampleCheck "wilson (proved in Mathlib)" 0 300 wilson
  sampleCheck "fermat little (proved above)" 0 300 fermatLittle
  sampleCheck "odd sum = n^2 (proved above)" 0 300 oddSum
  sampleCheck "goldbach (open)" 0 3000 goldbach
