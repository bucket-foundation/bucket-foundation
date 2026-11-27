import BucketMath.Learning

namespace BucketMath.Literature.KnowledgeSpace

open BucketMath.Learning

variable {α : Type}

structure UnionClosed (K : (α → Prop) → Prop) : Prop where
  empty : K (fun _ => False)
  union : ∀ A B, K A → K B → K (fun x => A x ∨ B x)

theorem closed_empty (edge : α → α → Prop) : Closed edge (fun _ => False) :=
  fun _ _ _ h => h.elim

theorem closed_union (edge : α → α → Prop) {A B : α → Prop} (hA : Closed edge A) (hB : Closed edge B) :
    Closed edge (fun x => A x ∨ B x) := by
  intro p v he hv
  rcases hv with h | h
  · exact Or.inl (hA p v he h)
  · exact Or.inr (hB p v he h)

theorem closed_inter (edge : α → α → Prop) {A B : α → Prop} (hA : Closed edge A) (hB : Closed edge B) :
    Closed edge (fun x => A x ∧ B x) :=
  fun p v he hv => ⟨hA p v he hv.1, hB p v he hv.2⟩

theorem quasiOrdinal_is_space (edge : α → α → Prop) : UnionClosed (Closed edge) :=
  ⟨closed_empty edge, fun _ _ => closed_union edge⟩

theorem remove_maximal (edge : α → α → Prop) [DecidableEq α] {K : α → Prop} (hK : Closed edge K) {m : α}
    (hmax : ∀ v, K v → ¬ edge m v) : Closed edge (fun x => K x ∧ x ≠ m) := by
  intro p v he hv
  refine ⟨hK p v he hv.1, ?_⟩
  intro hpm
  subst hpm
  exact hmax v hv.1 he

theorem add_ready (edge : α → α → Prop) [DecidableEq α] {K : α → Prop} (hK : Closed edge K) {v : α}
    (hready : ∀ p, edge p v → K p) : Closed edge (fun x => K x ∨ x = v) := by
  intro p w he hw
  rcases hw with h | h
  · exact Or.inl (hK p w he h)
  · subst h; exact Or.inl (hready p he)

def claim_doignon_1985_knowledge_spaces (K : (α → Prop) → Prop) : Prop := UnionClosed K

def claim_falmagne_2006_aleks_knowledge_space (edge : α → α → Prop) (K : (α → Prop) → Prop) : Prop :=
  ∀ S, K S ↔ Closed edge S

theorem aleks_states_form_space {edge : α → α → Prop} {K : (α → Prop) → Prop}
    (h : claim_falmagne_2006_aleks_knowledge_space edge K) : claim_doignon_1985_knowledge_spaces K := by
  refine ⟨(h _).mpr (closed_empty edge), fun A B hA hB => (h _).mpr ?_⟩
  exact closed_union edge ((h A).mp hA) ((h B).mp hB)

end BucketMath.Literature.KnowledgeSpace
