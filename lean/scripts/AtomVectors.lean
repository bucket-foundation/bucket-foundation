import BucketMath.Atom

def main : IO Unit := do
  for (z, a) in [(1, 1), (1, 2), (6, 12), (6, 13), (8, 16), (26, 56), (28, 58), (92, 238), (118, 294)] do
    let (p, n, e) := BucketMath.Atom.counts z a
    IO.println s!"{z} {a} {p} {n} {e}"
