import BucketMath.Learning.Sequencing

namespace BucketMath.Etymology

open BucketMath.Learning.Sequencing

structure RankedForest (α : Type) where
  parent : α → Option α
  rank : α → Nat
  descends : ∀ a p, parent a = some p → rank p < rank a

def ancestorIter {α : Type} (F : RankedForest α) : Nat → α → Option α
  | 0, a => some a
  | n + 1, a => match F.parent a with
    | none => none
    | some p => ancestorIter F n p

theorem ancestorIter_rank {α : Type} (F : RankedForest α) :
    ∀ (n : Nat) (a b : α), ancestorIter F (n + 1) a = some b → F.rank b < F.rank a
  | 0, a, b, h => by
      simp only [ancestorIter] at h
      cases hp : F.parent a with
      | none => rw [hp] at h; cases h
      | some p =>
          rw [hp] at h
          simp only [Option.some.injEq] at h
          subst h
          exact F.descends a p hp
  | n + 1, a, b, h => by
      simp only [ancestorIter] at h
      cases hp : F.parent a with
      | none => rw [hp] at h; cases h
      | some p =>
          rw [hp] at h
          have := ancestorIter_rank F n p b h
          have := F.descends a p hp
          omega

theorem forest_acyclic {α : Type} (F : RankedForest α) (n : Nat) (a : α) :
    ancestorIter F (n + 1) a ≠ some a := by
  intro h
  have := ancestorIter_rank F n a a h
  omega

def depth (a : List Nat) : Nat := a.length

def parentAddr : List Nat → Option (List Nat)
  | [] => none
  | [_] => none
  | a => some a.dropLast

theorem parentAddr_depth : ∀ a p, parentAddr a = some p → depth p < depth a
  | [], _, h => by cases h
  | [_], _, h => by cases h
  | _ :: _ :: _, p, h => by
      simp only [parentAddr, Option.some.injEq] at h
      subst h
      simp [depth]

def addressForest : RankedForest (List Nat) := ⟨parentAddr, depth, parentAddr_depth⟩

theorem address_acyclic (n : Nat) (a : List Nat) : ancestorIter addressForest (n + 1) a ≠ some a :=
  forest_acyclic addressForest n a

def lcaDepth (a b : List Nat) : Nat := lcp a b

theorem lcp_le_depth : ∀ a b : List Nat, lcp a b ≤ depth a
  | [], _ => by simp [lcp, depth]
  | _ :: _, [] => by simp [lcp]
  | x :: xs, y :: ys => by
      have ih := lcp_le_depth xs ys
      simp only [lcp, depth, List.length_cons] at ih ⊢
      split <;> omega

theorem lcp_common_prefix : ∀ a b : List Nat, a.take (lcp a b) = b.take (lcp a b)
  | [], _ => by simp [lcp]
  | _ :: _, [] => by simp [lcp]
  | x :: xs, y :: ys => by
      simp only [lcp]
      by_cases h : x = y
      · subst h; simp [lcp_common_prefix xs ys]
      · simp [h]

theorem lcp_deepest : ∀ (p a b : List Nat), p <+: a → p <+: b → depth p ≤ lcp a b
  | [], _, _, _, _ => by simp [depth]
  | _ :: _, [], _, ha, _ => by simp at ha
  | _ :: _, _ :: _, [], _, hb => by simp at hb
  | z :: zs, x :: xs, y :: ys, ha, hb => by
      rw [List.cons_prefix_cons] at ha hb
      obtain ⟨rfl, ha⟩ := ha
      obtain ⟨rfl, hb⟩ := hb
      have := lcp_deepest zs xs ys ha hb
      simp only [lcp, depth, List.length_cons, if_true] at this ⊢
      omega

theorem lcaDepth_ultra (a b c : List Nat) : min (lcaDepth a b) (lcaDepth b c) ≤ lcaDepth a c :=
  lcp_ultra a b c

def rootDist (H : Nat) (a b : List Nat) : Nat := H - lcaDepth a b

theorem rootDist_ultrametric (H : Nat) (a b c : List Nat) :
    rootDist H a c ≤ max (rootDist H a b) (rootDist H b c) := by
  have := lcaDepth_ultra a b c
  simp only [rootDist]
  omega

theorem rootDist_symm (H : Nat) (a b : List Nat) : rootDist H a b = rootDist H b a := by
  simp only [rootDist, lcaDepth, lcp_symm a b]

theorem lcp_self : ∀ a : List Nat, lcp a a = a.length
  | [] => rfl
  | x :: xs => by simp [lcp, lcp_self xs]

theorem rootDist_self (H : Nat) (a : List Nat) (h : depth a = H) : rootDist H a a = 0 := by
  have := lcp_self a
  simp only [rootDist, lcaDepth, this]
  simp [depth] at h
  omega

def fmax {β : Type} (f : β → Nat) (l : List β) : Nat := l.foldr (fun x acc => max (f x) acc) 0

theorem le_fmax {β : Type} (f : β → Nat) : ∀ (l : List β) (x : β), x ∈ l → f x ≤ fmax f l
  | [], _, h => by cases h
  | y :: ys, x, h => by
      simp only [fmax, List.foldr_cons] at *
      rcases List.mem_cons.mp h with rfl | h
      · omega
      · have := le_fmax f ys x h
        simp only [fmax] at this
        omega

theorem fmax_attained {β : Type} (f : β → Nat) :
    ∀ l : List β, l ≠ [] → ∃ x ∈ l, fmax f l = f x
  | [], h => absurd rfl h
  | [y], _ => ⟨y, by simp, by simp [fmax]⟩
  | y :: z :: zs, _ => by
      obtain ⟨x, hx, he⟩ := fmax_attained f (z :: zs) (by simp)
      simp only [fmax, List.foldr_cons] at he ⊢
      by_cases hle : f y ≤ f x
      · exact ⟨x, List.mem_cons_of_mem _ hx, by rw [he]; omega⟩
      · exact ⟨y, by simp, by rw [he]; omega⟩

def setSim (A B : List (List Nat)) : Nat := fmax (fun x => fmax (lcp x) B) A

theorem setSim_nil_left (B : List (List Nat)) : setSim [] B = 0 := rfl

theorem single_address_ultra (A C : List (List Nat)) (b : List Nat) :
    min (setSim A [b]) (setSim [b] C) ≤ setSim A C := by
  by_cases hA : A = []
  · subst hA; simp [setSim_nil_left]
  by_cases hC : C = []
  · subst hC; simp [setSim, fmax]
  obtain ⟨x, hx, hxe⟩ := fmax_attained (fun x => fmax (lcp x) [b]) A hA
  obtain ⟨z, hz, hze⟩ := fmax_attained (lcp b) C hC
  have hfb : fmax (lcp x) [b] = lcp x b := by simp [fmax]
  have hab : setSim A [b] = lcp x b := by
    show fmax (fun x => fmax (lcp x) [b]) A = _
    rw [hxe, hfb]
  have hbc : setSim [b] C = lcp b z := by
    have : setSim [b] C = fmax (lcp b) C := by simp [setSim, fmax]
    rw [this, hze]
  have hu := lcp_ultra x b z
  have h1 := le_fmax (lcp x) C z hz
  have h2 := le_fmax (fun x => fmax (lcp x) C) A x hx
  simp only [setSim] at *
  omega

def inherited : List (List Nat) := [[0, 0, 0]]

def borrowed : List (List Nat) := [[0, 0, 1], [1, 0, 1]]

def otherFamily : List (List Nat) := [[1, 0, 0]]

theorem borrowing_breaks_ultra :
    setSim inherited otherFamily < min (setSim inherited borrowed) (setSim borrowed otherFamily) := by
  decide

theorem borrowing_needs_two_addresses :
    ¬ ∀ A B C : List (List Nat), min (setSim A B) (setSim B C) ≤ setSim A C := by
  intro h
  have := h inherited borrowed otherFamily
  have := borrowing_breaks_ultra
  omega

end BucketMath.Etymology
