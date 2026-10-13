import BucketMath.Ranking
open BucketMath.Ranking

def step (s : Nat) : Nat := (s * 6364136223846793005 + 1442695040888963407) % 18446744073709551616

def draw (s bound : Nat) : Nat := (s / 4294967296) % bound

def edgeScores : Array Int := #[0, 1, -1, 16777216, -16777216, 16777215, -16777215]

def idOf (index k : Nat) : Nat :=
  match index % 5 with
  | 3 => k * 1000003 + 7
  | 4 => 9007199254740991 - k * 97
  | _ => k

def scoreOf (index s : Nat) : Int :=
  match index % 4 with
  | 2 => edgeScores[draw s edgeScores.size]!
  | 3 => Int.ofNat (draw s 2001) - 1000
  | _ => Int.ofNat (draw s 5) - 2

def genCase (seed : Nat) (index : Nat) : Nat × List Result := Id.run do
  let mut s := step seed
  let n := if index % 29 == 28 then 51 + draw s 30 else draw s 13
  let mut l : List Result := []
  for k in [0:n] do
    s := step s
    let pos := draw s (l.length + 1)
    s := step s
    l := l.insertIdx pos (idOf index k, scoreOf index s)
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
