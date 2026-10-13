import BucketMath.Fsrs
open BucketMath.Fsrs

def step (s : Nat) : Nat := (s * 6364136223846793005 + 1442695040888963407) % 18446744073709551616

def draw (s bound : Nat) : Nat := (s / 4294967296) % bound

def signed (s bound : Nat) : Int := Int.ofNat (draw s (2 * bound + 1)) - Int.ofNat bound

def difficultyInput (index s : Nat) : Int :=
  match index % 4 with
  | 0 => signed s 20480
  | 1 => 1024 + signed s 2
  | 2 => 10240 + signed s 2
  | _ => signed s 1073741824

def stabilityInput (index s : Nat) : Int :=
  match index % 4 with
  | 0 => signed s 12800
  | 1 => 64 + signed s 2
  | 2 => Int.ofNat (draw s 6400000000)
  | _ => signed s 1073741824

def intervalInput (index s : Nat) : Int :=
  let whole : Int :=
    match index % 4 with
    | 0 => signed s 40
    | 1 => 3650 + signed s 3
    | 2 => Int.ofNat (draw s 5000)
    | _ => signed s 1000000
  4 * whole + (match draw (step s) 3 with | 0 => 0 | 1 => 1 | _ => 3)

def main (args : List String) : IO Unit := do
  let path := args.headD "vectors/fsrs-bounds.txt"
  let count := (args.getD 1 "9999").toNat!
  let mut s := 20261001
  let mut lines : Array String := #[]
  for i in [0:count] do
    s := step s
    let k := i / 3
    lines := lines.push <| match i % 3 with
      | 0 => let x := difficultyInput k s; s!"D {x} {clampD x}"
      | 1 => let x := stabilityInput k s; s!"S {x} {clampS x}"
      | _ => let x := intervalInput k s; s!"I {x} {schedule x 4}"
  IO.FS.writeFile path ("\n".intercalate lines.toList ++ "\n")
