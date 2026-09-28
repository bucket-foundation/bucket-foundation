namespace BucketMath.Graph

abbrev Edge := Nat × Nat

inductive Reach (E : List Edge) : Nat → Nat → Prop where
  | edge {a b : Nat} : (a, b) ∈ E → Reach E a b
  | trans {a b c : Nat} : Reach E a b → Reach E b c → Reach E a c

def Prereq (E : List Edge) (target a : Nat) : Prop := Reach E a target

def StrictRank (E : List Edge) (r : Nat → Nat) : Prop := ∀ e ∈ E, r e.1 < r e.2

theorem reach_rank_lt (E : List Edge) (r : Nat → Nat) (h : StrictRank E r) {a b : Nat}
    (p : Reach E a b) : r a < r b := by
  induction p with
  | edge he => exact h _ he
  | trans _ _ ih1 ih2 => exact Nat.lt_trans ih1 ih2

theorem acyclic_of_rank (E : List Edge) (r : Nat → Nat) (h : StrictRank E r) (a : Nat) :
    ¬ Reach E a a := fun p => Nat.lt_irrefl _ (reach_rank_lt E r h p)

theorem prereq_rank_lt (E : List Edge) (r : Nat → Nat) (h : StrictRank E r) {target a : Nat}
    (p : Prereq E target a) : r a < r target := reach_rank_lt E r h p

theorem prereq_trans (E : List Edge) {a b c : Nat} (h1 : Prereq E b a) (h2 : Prereq E c b) :
    Prereq E c a := Reach.trans h1 h2

end BucketMath.Graph
