import BucketMath.Learning

namespace BucketMath.Learning

inductive Diamond where
  | foundation | left | right | target
  deriving DecidableEq, Repr

def diamondEdge (p v : Diamond) : Prop :=
  (p = .foundation ∧ (v = .left ∨ v = .right)) ∨
  ((p = .left ∨ p = .right) ∧ v = .target)

instance (p v : Diamond) : Decidable (diamondEdge p v) := inferInstanceAs (Decidable (_ ∨ _))

def diamondOrder : List Diamond := [.foundation, .left, .right, .target]

def diamondChain : List Diamond := [.foundation, .left, .target]

theorem diamond_required (v : Diamond) : Required diamondEdge .target v := by
  cases v with
  | target => exact Required.target
  | left => exact Required.prerequisite (by decide) Required.target
  | right => exact Required.prerequisite (by decide) Required.target
  | foundation =>
      exact Required.prerequisite (v := Diamond.left) (by decide)
        (Required.prerequisite (by decide) Required.target)

theorem diamond_enumerates : Enumerates diamondEdge (fun _ => False) .target diamondOrder := by
  constructor
  · decide
  · intro v
    constructor
    · intro _
      exact ⟨diamond_required v, id⟩
    · intro _
      cases v <;> decide

theorem diamond_ready : Path diamondEdge (fun _ => False) diamondOrder := by
  apply Path.cons (by simp)
  · intro p h
    cases p <;> simp [diamondEdge] at h
  · apply Path.cons (by simp)
    · intro p h
      cases p <;> simp_all [diamondEdge]
    · apply Path.cons (by simp)
      · intro p h
        cases p <;> simp_all [diamondEdge]
      · apply Path.cons (by simp)
        · intro p h
          cases p <;> simp_all [diamondEdge]
        · exact Path.nil _

theorem diamond_minimum : ∀ steps, Path diamondEdge (fun _ => False) steps →
    After (fun _ => False) steps .target → 4 ≤ steps.length := by
  intro steps hp ht
  have h : diamondOrder.length ≤ steps.length := diamond_enumerates.1.length_le_of_subset
    (fun v hv => remaining_necessary (by intro p q _ h; exact h) hp ht
      ((diamond_enumerates.2 v).mp hv).1 (by simp))
  exact h

theorem diamond_chain_insufficient : ¬ Path diamondEdge (fun _ => False) diamondChain := by
  intro hp
  have h := diamond_minimum diamondChain hp (by simp [After, diamondChain])
  simp [diamondChain] at h

end BucketMath.Learning
