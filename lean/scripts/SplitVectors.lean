import BucketMath.Split
open BucketMath.Split

def step (s : Nat) : Nat := (s * 6364136223846793005 + 1442695040888963407) % 18446744073709551616

def draw (s bound : Nat) : Nat := (s / 4294967296) % bound

def uint256Max : Nat := 2 ^ 256 - 1

def amountOf (index s : Nat) : Nat :=
  match index % 8 with
  | 0 => draw s 12
  | 1 => draw s 10000
  | 2 => 5 * draw s 1000000 + draw (step s) 3
  | 3 => draw s 1000000 * 1000000
  | 4 => draw s 4294967296 * draw (step s) 4294967296
  | 5 => uint256Max - draw s 20000
  | 6 => 2 ^ (draw s 257) - draw (step s) 2
  | _ => 10000 * draw s 100000 + draw (step s) 4 - 2

def nodeBpsOf (s : Nat) : Nat :=
  match draw s 5 with
  | 0 => 0
  | 1 => 2000
  | 2 => 500
  | _ => draw (step s) 2001

def nodeFloorOf (s : Nat) : Nat :=
  match draw s 4 with
  | 0 => 0
  | 1 => 10000
  | _ => draw (step s) 1000000

def main (args : List String) : IO Unit := do
  let path := args.headD "vectors/payment-split.txt"
  let count := (args.getD 1 "10000").toNat!
  let mut s := 20261001
  let mut lines : Array String := #["amount nodeBps nodeFloor author node operations"]
  for i in [0:count] do
    let s1 := step s
    let s2 := step s1
    let s3 := step s2
    s := s3
    let amount := amountOf i s1
    let nodeBps := nodeBpsOf s2
    let nodeFloor := nodeFloorOf s3
    let p := split nodeBps nodeFloor amount
    if p.total != amount || 100 * p.author < 80 * amount then throw (IO.userError s!"invariant broken at case {i}")
    lines := lines.push s!"{amount} {nodeBps} {nodeFloor} {p.author} {p.node} {p.operations}"
  IO.FS.writeFile path ("\n".intercalate lines.toList ++ "\n")
