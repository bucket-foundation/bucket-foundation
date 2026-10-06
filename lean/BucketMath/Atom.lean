namespace BucketMath.Atom

def counts (z a : Nat) : Nat × Nat × Nat := (z, a - z, z)

theorem neutral (z a : Nat) : (counts z a).1 = (counts z a).2.2 := by
  rfl

theorem nucleons (z a : Nat) (h : z ≤ a) : (counts z a).1 + (counts z a).2.1 = a := by
  dsimp [counts]
  omega

theorem total (z a : Nat) (h : z ≤ a) : (counts z a).1 + (counts z a).2.1 + (counts z a).2.2 = a + z := by
  dsimp [counts]
  omega

end BucketMath.Atom
