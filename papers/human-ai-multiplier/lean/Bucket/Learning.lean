import Std

namespace LearningSystem

variable {α : Type}

def Closed (edge : α → α → Prop) (known : α → Prop) : Prop :=
  ∀ p v, edge p v → known v → known p

inductive Required (edge : α → α → Prop) (target : α) : α → Prop where
  | target : Required edge target target
  | prerequisite {p v} : edge p v → Required edge target v → Required edge target p

def After (known : α → Prop) (steps : List α) (v : α) : Prop :=
  known v ∨ v ∈ steps

inductive Path (edge : α → α → Prop) : (α → Prop) → List α → Prop where
  | nil (known) : Path edge known []
  | cons {known v rest} : ¬ known v →
      (∀ p, edge p v → known p) →
      Path edge (fun p => known p ∨ p = v) rest →
      Path edge known (v :: rest)

def RestrictedKnown (edge : α → α → Prop) (target : α) (known : α → Prop)
    (v : α) : Prop := Required edge target v ∧ known v

theorem restricted_closed {edge : α → α → Prop} {target : α} {known : α → Prop}
    (localClosed : ∀ p v, Required edge target v → known v → edge p v → known p) :
    Closed edge (RestrictedKnown edge target known) := by
  intro p v hp hv
  exact ⟨Required.prerequisite hp hv.1, localClosed p v hv.1 hv.2 hp⟩

theorem restricted_remaining {edge : α → α → Prop} {target v : α} {known : α → Prop} :
    (Required edge target v ∧ ¬ RestrictedKnown edge target known v) ↔
      (Required edge target v ∧ ¬ known v) := by
  constructor
  · intro h
    exact ⟨h.1, fun hk => h.2 ⟨h.1, hk⟩⟩
  · intro h
    exact ⟨h.1, fun hk => h.2 hk.2⟩

theorem required_known {edge : α → α → Prop} {known : α → Prop}
    {target v : α} (closed : Closed edge known) (ht : known target)
    (hr : Required edge target v) : known v := by
  induction hr with
  | target => exact ht
  | prerequisite hp _ ih => exact closed _ _ hp ih

theorem after_closed {edge : α → α → Prop} {known : α → Prop} {steps : List α}
    (hc : Closed edge known) (hp : Path edge known steps) : Closed edge (After known steps) := by
  induction hp with
  | nil => simpa [Closed, After] using hc
  | @cons known v rest _ ready tail ih =>
      have hc' : Closed edge (fun p => known p ∨ p = v) := by
        intro p q he hq
        rcases hq with hq | rfl
        · exact Or.inl (hc p q he hq)
        · exact Or.inl (ready p he)
      have h := ih hc'
      simpa [Closed, After, List.mem_cons, or_assoc, or_left_comm, or_comm] using h

theorem remaining_necessary {edge : α → α → Prop} {known : α → Prop}
    {target v : α} {steps : List α} (hc : Closed edge known)
    (hp : Path edge known steps) (ht : After known steps target)
    (hr : Required edge target v) (hu : ¬ known v) : v ∈ steps := by
  exact (required_known (after_closed hc hp) ht hr).resolve_left hu

def Enumerates (edge : α → α → Prop) (known : α → Prop) (target : α)
    (remaining : List α) : Prop :=
  remaining.Nodup ∧ ∀ v, v ∈ remaining ↔ Required edge target v ∧ ¬ known v

def Earlier (edge : α → α → Prop) (known : α → Prop) (order : List α) : Prop :=
  ∀ before v rest, order = before ++ v :: rest →
    ∀ p, edge p v → known p ∨ p ∈ before

theorem earlier_path {edge : α → α → Prop} {known : α → Prop} {order : List α}
    (nd : order.Nodup) (fresh : ∀ v, v ∈ order → ¬ known v)
    (earlier : Earlier edge known order) : Path edge known order := by
  induction order generalizing known with
  | nil => exact Path.nil known
  | cons v rest ih =>
      apply Path.cons (fresh v (by simp))
      · intro p he
        simpa using earlier [] v rest rfl p he
      · apply ih (List.nodup_cons.mp nd).2
        · intro p hp h
          rcases h with h | h
          · exact fresh p (by simp [hp]) h
          · subst p
            exact (List.nodup_cons.mp nd).1 hp
        · intro before q after eq p he
          have h := earlier (v :: before) q after (by simp [eq]) p he
          simpa [List.mem_cons, or_assoc, or_left_comm, or_comm] using h

theorem minimum_unit_distance {edge : α → α → Prop} {known : α → Prop}
    {target : α} {order : List α} (hc : Closed edge known)
    (en : Enumerates edge known target order) (earlier : Earlier edge known order) :
    Path edge known order ∧ After known order target ∧
      ∀ steps, Path edge known steps → After known steps target → order.length ≤ steps.length := by
  refine ⟨earlier_path en.1 (fun v hv => ((en.2 v).mp hv).2) earlier, ?_, ?_⟩
  · by_cases h : known target
    · exact Or.inl h
    · exact Or.inr ((en.2 target).mpr ⟨Required.target, h⟩)
  · intro steps hp ht
    apply en.1.length_le_of_subset
    intro v hv
    have hv' := (en.2 v).mp hv
    exact remaining_necessary hc hp ht hv'.1 hv'.2

def Effort (weight : α → Nat) (steps : List α) : Nat := (steps.map weight).sum

theorem effort_subset (weight : α → Nat) {required steps : List α}
    (nd : required.Nodup) (sub : required ⊆ steps) : Effort weight required ≤ Effort weight steps := by
  classical
  induction required generalizing steps with
  | nil => simp [Effort]
  | cons v rest ih =>
      have hv : v ∈ steps := sub (by simp)
      have hs : rest ⊆ steps.erase v := by
        intro p hp
        have hn : p ≠ v := by
          intro h
          subst p
          exact (List.nodup_cons.mp nd).1 hp
        exact (List.mem_erase_of_ne hn).mpr (sub (by simp [hp]))
      have bound := ih (List.nodup_cons.mp nd).2 hs
      have eq := (List.perm_cons_erase hv).map weight |>.sum_nat
      have cost : Effort weight steps = weight v + Effort weight (steps.erase v) := by
        simpa [Effort] using eq
      rw [cost]
      exact Nat.add_le_add_left bound (weight v)

theorem minimum_weighted_effort {edge : α → α → Prop} {known : α → Prop}
    {target : α} {order : List α} (weight : α → Nat) (hc : Closed edge known)
    (en : Enumerates edge known target order) (earlier : Earlier edge known order) :
    Path edge known order ∧ After known order target ∧
      ∀ steps, Path edge known steps → After known steps target →
        Effort weight order ≤ Effort weight steps := by
  have unit := minimum_unit_distance hc en earlier
  refine ⟨unit.1, unit.2.1, ?_⟩
  intro steps hp ht
  apply effort_subset weight en.1
  intro v hv
  have h := (en.2 v).mp hv
  exact remaining_necessary hc hp ht h.1 h.2

theorem remaining_antitone {edge : α → α → Prop} {small large : α → Prop}
    {target v : α} (growth : ∀ x, small x → large x)
    (remaining : Required edge target v ∧ ¬ large v) :
    Required edge target v ∧ ¬ small v := by
  exact ⟨remaining.1, fun h => remaining.2 (growth v h)⟩

theorem distance_antitone {edge : α → α → Prop} {small large : α → Prop}
    {target : α} {oldOrder newOrder : List α} (growth : ∀ x, small x → large x)
    (oldEn : Enumerates edge small target oldOrder)
    (newEn : Enumerates edge large target newOrder) : newOrder.length ≤ oldOrder.length := by
  apply newEn.1.length_le_of_subset
  intro v hv
  exact (oldEn.2 v).mpr (remaining_antitone growth ((newEn.2 v).mp hv))

def Coverage (catalog : List α) (known : α → Bool) (weight : α → Nat) : Nat :=
  ((catalog.filter known).map weight).sum

theorem coverage_monotone (catalog : List α) (small large : α → Bool) (weight : α → Nat)
    (growth : ∀ v, small v = true → large v = true) :
    Coverage catalog small weight ≤ Coverage catalog large weight := by
  induction catalog with
  | nil => simp [Coverage]
  | cons v rest ih =>
      by_cases hs : small v = true
      · have hl := growth v hs
        simpa [Coverage, hs, hl] using Nat.add_le_add_left ih (weight v)
      · by_cases hl : large v = true
        · simpa [Coverage, hs, hl] using Nat.le_trans ih (Nat.le_add_left _ _)
        · simpa [Coverage, hs, hl] using ih

def SquaredExtent (coordinates : List Nat) : Nat := (coordinates.map (fun n => n * n)).sum

inductive CoordinateGrowth : List Nat → List Nat → Prop where
  | nil : CoordinateGrowth [] []
  | cons {a b as bs} : a ≤ b → CoordinateGrowth as bs → CoordinateGrowth (a :: as) (b :: bs)

theorem squared_extent_monotone {small large : List Nat}
    (growth : CoordinateGrowth small large) : SquaredExtent small ≤ SquaredExtent large := by
  induction growth with
  | nil => simp [SquaredExtent]
  | @cons a b as bs hab _ ih =>
      simpa [SquaredExtent] using Nat.add_le_add (Nat.mul_le_mul hab hab) ih

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

#print axioms restricted_closed
#print axioms restricted_remaining
#print axioms minimum_weighted_effort
#print axioms minimum_unit_distance
#print axioms distance_antitone
#print axioms coverage_monotone
#print axioms squared_extent_monotone
#print axioms diamond_ready
#print axioms diamond_minimum
#print axioms diamond_chain_insufficient

end LearningSystem
