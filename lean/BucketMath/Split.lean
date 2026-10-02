namespace BucketMath.Split

structure Parts where
  author : Nat
  node : Nat
  operations : Nat
deriving DecidableEq, Repr

def bpsDenominator : Nat := 10000

def nonAuthorBps : Nat := 2000

def nonAuthor (amount : Nat) : Nat := amount * nonAuthorBps / bpsDenominator

def nodePart (nodeBps nodeFloor amount : Nat) : Nat :=
  if amount < nodeFloor then 0 else amount * nodeBps / bpsDenominator

def split (nodeBps nodeFloor amount : Nat) : Parts :=
  { author := amount - nonAuthor amount
    node := nodePart nodeBps nodeFloor amount
    operations := nonAuthor amount - nodePart nodeBps nodeFloor amount }

def Parts.total (p : Parts) : Nat := p.author + p.node + p.operations

theorem nonAuthor_le (amount : Nat) : nonAuthor amount ≤ amount := by
  unfold nonAuthor nonAuthorBps bpsDenominator; omega

theorem nodePart_le (nodeBps nodeFloor amount : Nat) (h : nodeBps ≤ nonAuthorBps) :
    nodePart nodeBps nodeFloor amount ≤ nonAuthor amount := by
  unfold nodePart nonAuthor
  split
  · exact Nat.zero_le _
  · exact Nat.div_le_div_right (Nat.mul_le_mul_left amount h)

theorem split_total (nodeBps nodeFloor amount : Nat) (h : nodeBps ≤ nonAuthorBps) :
    (split nodeBps nodeFloor amount).total = amount := by
  have h1 := nonAuthor_le amount
  have h2 := nodePart_le nodeBps nodeFloor amount h
  unfold Parts.total split; simp only; omega

theorem author_floor (nodeBps nodeFloor amount : Nat) :
    80 * amount ≤ 100 * (split nodeBps nodeFloor amount).author := by
  unfold split nonAuthor nonAuthorBps bpsDenominator; simp only; omega

theorem author_tight (nodeBps nodeFloor amount : Nat) :
    100 * (split nodeBps nodeFloor amount).author < 80 * amount + 100 := by
  unfold split nonAuthor nonAuthorBps bpsDenominator; simp only; omega

theorem node_share_le (nodeBps nodeFloor amount : Nat) :
    bpsDenominator * (split nodeBps nodeFloor amount).node ≤ nodeBps * amount := by
  unfold split nodePart; simp only
  split
  · exact Nat.zero_le _
  · rw [Nat.mul_comm nodeBps amount]; exact Nat.mul_div_le _ _

theorem node_zero_below_floor (nodeBps nodeFloor amount : Nat) (h : amount < nodeFloor) :
    (split nodeBps nodeFloor amount).node = 0 := by
  unfold split nodePart; simp [h]

theorem dust_to_author (nodeBps nodeFloor amount : Nat) (h : amount < 5) :
    (split nodeBps nodeFloor amount).author = amount := by
  unfold split nonAuthor nonAuthorBps bpsDenominator; simp only; omega

end BucketMath.Split
