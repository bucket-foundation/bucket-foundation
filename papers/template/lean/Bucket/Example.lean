/-!
# Example lemma for the Bucket Foundation paper template

Bucket rule: every lemma stated in a paper's body is either proved here in
Lean 4, or left as `sorry` with a `TODO:` comment naming the gap (see
papers/PAPER-STANDARDS.md, "Lean rule"). `main.tex`'s Lemma 1 states that the
overlap of two unit vectors is bounded by one in absolute value; the
one-line fact below is the Lean-core stand-in this template checks in full
so `lake build` has something real to verify without fetching Mathlib.
-/

/-- Stand-in for the paper's Lemma 1: doubling a natural number is the same
as adding it to itself. Uses only `Nat.two_mul` from Lean 4's core library,
so `lake build` needs no network access and no Mathlib checkout. -/
theorem double_eq_add_self (n : Nat) : 2 * n = n + n :=
  Nat.two_mul n
