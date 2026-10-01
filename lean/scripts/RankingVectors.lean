import BucketMath.Ranking
open BucketMath.Ranking

def step (s : Nat) : Nat := (s * 6364136223846793005 + 1442695040888963407) % 18446744073709551616

def draw (s bound : Nat) : Nat := (s / 4294967296) % bound

def genCase (seed : Nat) (index : Nat) : Nat × List Result := Id.run do
  let mut s := step seed
  let n := draw s 13
  let radius := if index % 4 == 3 then 1000 else 2
  let mut l : List Result := []
  for k in [0:n] do
    s := step s
    let pos := draw s (l.length + 1)
    s := step s
    let score : Int := Int.ofNat (draw s (2 * radius + 1)) - Int.ofNat radius
    l := l.insertIdx pos (k, score)
  return (s, l)

def renderCase (l : List Result) : String :=
  " ".intercalate (l.map fun r => s!"{r.1}:{r.2}") ++ "|" ++ " ".intercalate ((rank l).map fun r => s!"{r.1}")

def main (args : List String) : IO Unit := do
  let path := args.headD "vectors/ranking-order.txt"
  let count := (args.getD 1 "10000").toNat!
  let mut s := 20261001
  let mut lines : Array String := #[]
  for i in [0:count] do
    let (s', l) := genCase s i
    s := s'
    lines := lines.push (renderCase l)
  IO.FS.writeFile path ("\n".intercalate lines.toList ++ "\n")
