/-!
# Godel prime encoding for hypothesis addresses

`TIMELINE-AND-COMBINATORICS-SPEC.md` Section 3 fixes the first six primes
(2, 3, 5, 7, 11, 13) to the six placement slots in order and addresses a
hypothesis as the product of `prime_slot ^ (vocab_index + 1)` over its
slots. The fundamental theorem of arithmetic (every natural number has
exactly one prime factorization) is why two hypotheses with distinct
slot-index tuples never share an address: the exponent of each fixed
prime in the product recovers that slot's index uniquely.

`encode_injective` proves this in core Lean by peeling one prime at a time:
each prime is coprime to the product of the others, so equal addresses force
equal exponents.
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

theorem peel {p x y : Nat} (hp : 1 < p) (hx : Nat.Coprime p x) (hy : Nat.Coprime p y) :
    forall  {a b : Nat}, x * p ^ a = y * p ^ b -> a = b /\ x = y
  | 0, 0, h => by simpa using h
  | 0, b + 1, h => by
      have hd : p [U+2223] x := <y * p ^ b, by rw [Nat.pow_succ] at h; simp at h; rw [h]; grind>
      have := Nat.Coprime.eq_one_of_dvd hx hd
      omega
  | a + 1, 0, h => by
      have hd : p [U+2223] y := <x * p ^ a, by rw [Nat.pow_succ] at h; simp at h; rw [<- h]; grind>
      have := Nat.Coprime.eq_one_of_dvd hy hd
      omega
  | a + 1, b + 1, h => by
      have h' : p * (x * p ^ a) = p * (y * p ^ b) := by rw [Nat.pow_succ, Nat.pow_succ] at h; grind
      have <hab, hxy> := peel hp hx hy (Nat.eq_of_mul_eq_mul_left (by omega) h')
      exact <by omega, hxy>

theorem encode_injective : Function.Injective encode := by
  intro t u h
  unfold encode at h
  have c13 : forall  a b c d e : Nat, Nat.Coprime 13 (2 ^ a * 3 ^ b * 5 ^ c * 7 ^ d * 11 ^ e) := fun a b c d e =>
    Nat.Coprime.mul_right (Nat.Coprime.mul_right (Nat.Coprime.mul_right (Nat.Coprime.mul_right
      (Nat.Coprime.pow_right _ (by decide)) (Nat.Coprime.pow_right _ (by decide)))
      (Nat.Coprime.pow_right _ (by decide))) (Nat.Coprime.pow_right _ (by decide))) (Nat.Coprime.pow_right _ (by decide))
  have c11 : forall  a b c d : Nat, Nat.Coprime 11 (2 ^ a * 3 ^ b * 5 ^ c * 7 ^ d) := fun a b c d =>
    Nat.Coprime.mul_right (Nat.Coprime.mul_right (Nat.Coprime.mul_right
      (Nat.Coprime.pow_right _ (by decide)) (Nat.Coprime.pow_right _ (by decide)))
      (Nat.Coprime.pow_right _ (by decide))) (Nat.Coprime.pow_right _ (by decide))
  have c7 : forall  a b c : Nat, Nat.Coprime 7 (2 ^ a * 3 ^ b * 5 ^ c) := fun a b c =>
    Nat.Coprime.mul_right (Nat.Coprime.mul_right
      (Nat.Coprime.pow_right _ (by decide)) (Nat.Coprime.pow_right _ (by decide))) (Nat.Coprime.pow_right _ (by decide))
  have c5 : forall  a b : Nat, Nat.Coprime 5 (2 ^ a * 3 ^ b) := fun a b =>
    Nat.Coprime.mul_right (Nat.Coprime.pow_right _ (by decide)) (Nat.Coprime.pow_right _ (by decide))
  have c3 : forall  a : Nat, Nat.Coprime 3 (2 ^ a) := fun a => Nat.Coprime.pow_right _ (by decide)
  obtain <hf, h> := peel (by decide) (c13 _ _ _ _ _) (c13 _ _ _ _ _) h
  obtain <he, h> := peel (by decide) (c11 _ _ _ _) (c11 _ _ _ _) h
  obtain <hd, h> := peel (by decide) (c7 _ _ _) (c7 _ _ _) h
  obtain <hc, h> := peel (by decide) (c5 _ _) (c5 _ _) h
  obtain <hb, h> := peel (by decide) (c3 _) (c3 _) h
  have ha := (peel (p := 2) (x := 1) (y := 1) (by decide) (by decide) (by decide) (by simpa using h)).1
  cases t; cases u
  simp_all

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
