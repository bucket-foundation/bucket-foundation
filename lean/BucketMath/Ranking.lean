namespace BucketMath.Ranking

abbrev Result := Nat × Int

def before (a b : Result) : Prop := b.2 < a.2 ∨ (a.2 = b.2 ∧ a.1 < b.1)

instance (a b : Result) : Decidable (before a b) := by unfold before; exact inferInstance

theorem before_trichotomy (a b : Result) (h : a.1 ≠ b.1) : before a b ∨ before b a := by
  unfold before; omega

theorem before_trans {a b c : Result} (hab : before a b) (hbc : before b c) : before a c := by
  unfold before at *; omega

theorem before_asymm {a b : Result} (hab : before a b) : ¬ before b a := by
  unfold before at *; omega

def insert (a : Result) : List Result → List Result
  | [] => [a]
  | b :: l => if before a b then a :: b :: l else b :: insert a l

def rank : List Result → List Result
  | [] => []
  | a :: l => insert a (rank l)

def UniqueIds (l : List Result) : Prop := (l.map (·.1)).Nodup

def Ordered (l : List Result) : Prop := l.Pairwise before

theorem insert_perm (a : Result) (l : List Result) : (insert a l).Perm (a :: l) := by
  induction l with
  | nil => exact List.Perm.refl _
  | cons b l ih =>
    unfold insert
    split
    · exact List.Perm.refl _
    · exact (List.Perm.cons b ih).trans (List.Perm.swap a b l)

theorem rank_perm (l : List Result) : (rank l).Perm l := by
  induction l with
  | nil => exact List.Perm.refl _
  | cons a l ih => exact (insert_perm a (rank l)).trans (List.Perm.cons a ih)

theorem insert_ordered (a : Result) (l : List Result) (hne : ∀ b ∈ l, a.1 ≠ b.1)
    (hl : Ordered l) : Ordered (insert a l) := by
  induction l with
  | nil => exact List.pairwise_singleton _ _
  | cons b l ih =>
    have hb := List.pairwise_cons.mp hl
    unfold insert
    split
    · rename_i hab
      refine List.pairwise_cons.mpr ⟨fun c hc => ?_, hl⟩
      rcases List.mem_cons.mp hc with rfl | hc
      · exact hab
      · exact before_trans hab (hb.1 c hc)
    · rename_i hab
      have hba : before b a := (before_trichotomy a b (hne b (List.mem_cons_self ..))).resolve_left hab
      refine List.pairwise_cons.mpr ⟨fun c hc => ?_, ih (fun c hc => hne c (List.mem_cons_of_mem _ hc)) hb.2⟩
      rcases List.mem_cons.mp ((insert_perm a l).mem_iff.mp hc) with rfl | hc
      · exact hba
      · exact hb.1 c hc

theorem rank_ordered (l : List Result) (h : UniqueIds l) : Ordered (rank l) := by
  induction l with
  | nil => exact List.Pairwise.nil
  | cons a l ih =>
    have hn := List.nodup_cons.mp h
    refine insert_ordered a (rank l) (fun b hb heq => hn.1 ?_) (ih hn.2)
    exact List.mem_map.mpr ⟨b, (rank_perm l).mem_iff.mp hb, heq.symm⟩

theorem ordered_perm_unique {l₁ l₂ : List Result} (hp : l₁.Perm l₂) (h₁ : Ordered l₁)
    (h₂ : Ordered l₂) : l₁ = l₂ :=
  hp.eq_of_pairwise (fun _ _ _ _ hab hba => absurd hba (before_asymm hab)) h₁ h₂

theorem rank_unique (l out : List Result) (h : UniqueIds l) (hp : out.Perm l)
    (ho : Ordered out) : out = rank l :=
  ordered_perm_unique (hp.trans (rank_perm l).symm) ho (rank_ordered l h)

end BucketMath.Ranking
