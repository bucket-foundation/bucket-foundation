import BucketMath.Grade
open BucketMath.Grade

def step (s : Nat) : Nat := (s * 6364136223846793005 + 1442695040888963407) % 18446744073709551616

def draw (s bound : Nat) : Nat := (s / 4294967296) % bound

def nudge (base s : Nat) : Nat := base + draw s 5 - 2

def genPair (index s1 s2 s3 : Nat) : Nat × Nat :=
  let w := 1 + draw s1 4000
  match index % 8 with
  | 0 => (draw s1 1001, draw s2 1001)
  | 1 => (w, nudge (w * 3162277 / 1000000) s2)
  | 2 => (1 + draw s1 12000, nudge ((1 + draw s1 12000) * 1000000 / 3162277) s2)
  | 3 => (w, nudge (w * 1412537 / 1000000) s2)
  | 4 => (w, nudge (w * 1000000 / 1412537) s2)
  | 5 => (1 + draw s1 1000000, 1 + draw s1 1000000)
  | 6 =>
    let scale := 10 ^ (if index % 10 == 6 then draw s3 291 else draw s3 40)
    (w * scale, nudge (w * 3162277 / 1000000) s2 * scale)
  | _ =>
    let e1 := if index % 10 == 7 then draw s3 300 else draw s3 30
    ((1 + draw s1 999) * 10 ^ e1, (1 + draw s2 999) * 10 ^ (e1 + draw s2 3))

def bit (b : Bool) : String := if b then "1" else "0"

def main (args : List String) : IO Unit := do
  let path := args.headD "vectors/fermi-grade.txt"
  let count := (args.getD 1 "10000").toNat!
  let mut s := 20261001
  let mut lines : Array String := #[]
  for i in [0:count] do
    let s1 := step s
    let s2 := step s1
    let s3 := step s2
    s := s3
    let (want, got) := genPair i s1 s2 s3
    lines := lines.push s!"{want} {got} {bit (decide (Correct want got))} {bit (decide (Close want got))}"
  IO.FS.writeFile path ("\n".intercalate lines.toList ++ "\n")
