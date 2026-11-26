namespace BucketMath.Learning.Selector

structure Plan where
  id : Nat
  tokens : Nat
  coverMilli : Nat
  newWords : Nat
  glossed : Nat
  media : Bool
  score : Int
  deriving DecidableEq, Repr

def minTokens : Nat := 40

def inBand (p : Plan) : Bool :=
  if p.media then 900 ≤ p.coverMilli else 950 ≤ p.coverMilli && p.coverMilli ≤ 980

def withinGlossBudget (p : Plan) : Bool := p.glossed ≤ 2 || 20 * p.glossed ≤ p.tokens

def eligible (p : Plan) : Bool :=
  minTokens ≤ p.tokens && inBand p && 1 ≤ p.newWords && p.newWords ≤ 3 && 20 * p.newWords ≤ p.tokens && withinGlossBudget p

def better (a b : Plan) : Plan := if b.score > a.score ∨ (b.score = a.score ∧ b.id < a.id) then b else a

def best : List Plan → Option Plan
  | [] => none
  | p :: ps => some (ps.foldl better p)

def select (ps : List Plan) : Option Plan := best (ps.filter eligible)

theorem better_mem (a b : Plan) : better a b = a ∨ better a b = b := by
  unfold better
  split <;> simp

theorem foldl_better_mem (ps : List Plan) (a : Plan) : ps.foldl better a = a ∨ ps.foldl better a ∈ ps := by
  induction ps generalizing a with
  | nil => simp
  | cons q qs ih =>
    simp only [List.foldl_cons, List.mem_cons]
    rcases ih (better a q) with h | h
    · rw [h]
      rcases better_mem a q with h' | h'
      · exact Or.inl h'
      · exact Or.inr (Or.inl h')
    · exact Or.inr (Or.inr h)

theorem best_mem {ps : List Plan} {p : Plan} (h : best ps = some p) : p ∈ ps := by
  cases ps with
  | nil => simp [best] at h
  | cons q qs =>
    simp only [best, Option.some.injEq] at h
    subst h
    rcases foldl_better_mem qs q with h' | h'
    · rw [h']
      exact List.mem_cons_self
    · exact List.mem_cons_of_mem _ h'

theorem select_eligible {ps : List Plan} {p : Plan} (h : select ps = some p) : eligible p = true := by
  have hm := best_mem h
  exact (List.mem_filter.mp hm).2

theorem c2_selected {ps : List Plan} {p : Plan} (h : select ps = some p) :
    minTokens ≤ p.tokens ∧ inBand p = true ∧ 1 ≤ p.newWords ∧ p.newWords ≤ 3 ∧ 20 * p.newWords ≤ p.tokens ∧ withinGlossBudget p = true := by
  have he := select_eligible h
  simp only [eligible, Bool.and_eq_true, decide_eq_true_eq] at he
  obtain ⟨⟨⟨⟨⟨h1, h2⟩, h3⟩, h4⟩, h5⟩, h6⟩ := he
  exact ⟨h1, h2, h3, h4, h5, h6⟩

theorem c2_gloss_budget {ps : List Plan} {p : Plan} (h : select ps = some p) : p.glossed ≤ 2 ∨ 100 * p.glossed ≤ 5 * p.tokens := by
  have hb := (c2_selected h).2.2.2.2.2
  simp only [withinGlossBudget, Bool.or_eq_true, decide_eq_true_eq] at hb
  omega

theorem c2_text_band {ps : List Plan} {p : Plan} (h : select ps = some p) (ht : p.media = false) :
    950 ≤ p.coverMilli ∧ p.coverMilli ≤ 980 := by
  have hb := (c2_selected h).2.1
  simp only [inBand, ht, Bool.false_eq_true, if_false, Bool.and_eq_true, decide_eq_true_eq] at hb
  exact hb

theorem c2_media_floor {ps : List Plan} {p : Plan} (h : select ps = some p) (hm : p.media = true) :
    900 ≤ p.coverMilli := by
  have hb := (c2_selected h).2.1
  simp only [inBand, hm, if_true, decide_eq_true_eq] at hb
  exact hb

theorem c2_new_share {ps : List Plan} {p : Plan} (h : select ps = some p) : 100 * p.newWords ≤ 5 * p.tokens := by
  have := (c2_selected h).2.2.2.2.1
  omega

theorem better_score (a b : Plan) : a.score ≤ (better a b).score ∧ b.score ≤ (better a b).score := by
  unfold better
  split <;> rename_i h <;> omega

theorem better_tie_lowest_id (a b : Plan) (h : a.score = b.score) : (better a b).id = min a.id b.id := by
  unfold better
  split <;> rename_i h' <;> omega

end BucketMath.Learning.Selector
