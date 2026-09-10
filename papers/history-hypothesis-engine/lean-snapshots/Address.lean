/-!
# Godel prime encoding for hypothesis addresses

`TIMELINE-AND-COMBINATORICS-SPEC.md` Section 3 fixes the first six primes
(2, 3, 5, 7, 11, 13) to the six placement slots in order and addresses a
hypothesis as the product of `prime_slot ^ (vocab_index + 1)` over its
slots. The fundamental theorem of arithmetic (every natural number has
exactly one prime factorization) is why two hypotheses with distinct
slot-index tuples never share an address: the exponent of each fixed
prime in the product recovers that slot's index uniquely.

The general injectivity theorem below needs Mathlib's `Nat.factorization`
(or an equivalent unique-factorization development) to go through for an
arbitrary vocabulary size; that is unavailable in this Mathlib-free build
(`papers/PAPER-STANDARDS.md`, "Lean rule": depend on Mathlib only when a
lemma needs it, and this project stays in core Lean to keep `lake build`
network-free). `encode_injective` is stated and left `sorry`, with a TODO
naming exactly what closes it. `encode_injective_bounded` proves the same
injectivity for small, fixed vocabulary sizes in full, by direct
computation, standing in for the general result until Mathlib is
available.
-/

namespace Bucket.Address

/-- A hypothesis's six-slot vocabulary-index tuple, in
ACTOR/ACTION/OBJECT/PLACE/TIME_BIN/MECHANISM order
(`TIMELINE-AND-COMBINATORICS-SPEC.md` Section 3). Each field is the slot's
vocabulary index, per an injective, per-slot `index : concept id -> Nat`
assignment (`vocab_index` in the spec) that this structure's caller is
responsible for constructing; `SlotTuple` only carries the resulting
numbers. -/
structure SlotTuple where
  actor : Nat
  action : Nat
  object : Nat
  place : Nat
  timeBin : Nat
  mechanism : Nat
  deriving DecidableEq, Repr

/-- The Godel address of a slot-index tuple: the product of each slot's
fixed prime raised to the tuple's index at that slot, plus one
(`TIMELINE-AND-COMBINATORICS-SPEC.md` Section 3, `address(slots)`). -/
def encode (t : SlotTuple) : Nat :=
  2 ^ (t.actor + 1) * 3 ^ (t.action + 1) * 5 ^ (t.object + 1) *
    7 ^ (t.place + 1) * 11 ^ (t.timeBin + 1) * 13 ^ (t.mechanism + 1)

/-- Distinct slot tuples give distinct addresses: `encode` never collides.
TODO: this needs unique prime factorization (Mathlib's `Nat.factorization`
or equivalent) to prove for arbitrary tuples, since the argument is "the
exponent of 2 in `encode t` is `t.actor + 1`, of 3 is `t.action + 1`, and
so on, by uniqueness of factorization, so equal addresses force equal
exponents force equal tuples." That argument is not available without
Mathlib in this build; see `encode_injective_bounded` below for the same
fact proved directly for small tuples. -/
theorem encode_injective : Function.Injective encode := by
  sorry

/-- The bounded case, proved in full: two tuples whose every field stays
below 2 (so every exponent stays below 3) collide only when equal.
Settled by exhaustive computation over the 2^6 x 2^6 grid of tuples, no
factorization theory needed. This is the concrete fact
`encode_injective`'s general statement reduces to once the vocabulary
size at every slot is fixed and small, and is the load-bearing sanity
check that the encoding scheme is sound before the general theorem is
available. -/
theorem encode_injective_bounded
    (a1 b1 c1 d1 e1 f1 a2 b2 c2 d2 e2 f2 : Fin 2)
    (h : 2 ^ (a1.val + 1) * 3 ^ (b1.val + 1) * 5 ^ (c1.val + 1) *
           7 ^ (d1.val + 1) * 11 ^ (e1.val + 1) * 13 ^ (f1.val + 1) =
         2 ^ (a2.val + 1) * 3 ^ (b2.val + 1) * 5 ^ (c2.val + 1) *
           7 ^ (d2.val + 1) * 11 ^ (e2.val + 1) * 13 ^ (f2.val + 1)) :
    a1 = a2 /\ b1 = b2 /\ c1 = c2 /\ d1 = d2 /\ e1 = e2 /\ f1 = f2 := by
  revert h
  revert a1 b1 c1 d1 e1 f1 a2 b2 c2 d2 e2 f2
  decide

end Bucket.Address
