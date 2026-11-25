import Std

namespace BucketMath.Learning.Sequencing

variable {α : Type}

def lcp : List Nat → List Nat → Nat
  | x :: xs, y :: ys => if x = y then lcp xs ys + 1 else 0
  | _, _ => 0

theorem lcp_symm : ∀ a b : List Nat, lcp a b = lcp b a
  | [], [] => rfl
  | [], _ :: _ => rfl
  | _ :: _, [] => rfl
  | x :: xs, y :: ys => by
      simp only [lcp]
      by_cases h : x = y
      · subst h; simp [lcp_symm xs ys]
      · rw [if_neg h, if_neg (Ne.symm h)]

theorem lcp_ultra : ∀ a b c : List Nat, min (lcp a b) (lcp b c) ≤ lcp a c
  | [], _, _ => by simp [lcp]
  | _ :: _, [], _ => by simp [lcp]
  | _ :: _, _ :: _, [] => by simp [lcp]
  | x :: xs, y :: ys, z :: zs => by
      have ih := lcp_ultra xs ys zs
      simp only [lcp]
      by_cases h1 : x = y <;> by_cases h2 : y = z <;> simp_all <;> omega

def shared (sim : α → α → Nat) (d : α) (held : List α) : Nat :=
  held.foldr (fun h acc => max (sim d h) acc) 0

def totalShared (sim : α → α → Nat) : List α → List α → Nat
  | _, [] => 0
  | held, d :: ds => shared sim d held + totalShared sim (d :: held) ds

def totalCost (sim : α → α → Nat) (base : α → Nat) (held order : List α) : Int :=
  ((order.map base).sum : Int) - totalShared sim held order

structure Ultra (sim : α → α → Nat) : Prop where
  symm : ∀ a b, sim a b = sim b a
  ultra : ∀ a b c, min (sim a b) (sim b c) ≤ sim a c

theorem lcp_isUltra : Ultra lcp := ⟨lcp_symm, lcp_ultra⟩

theorem shared_ge_min {sim : α → α → Nat} (hu : Ultra sim) (a b : α) :
    ∀ held : List α, min (sim a b) (shared sim b held) ≤ shared sim a held
  | [] => by simp [shared]
  | h :: rest => by
      have ih := shared_ge_min hu a b rest
      have hu1 := hu.ultra a b h
      simp only [shared, List.foldr_cons] at ih ⊢
      omega

theorem shared_swap {sim : α → α → Nat} (hu : Ultra sim) (a b : α) (held : List α) :
    shared sim a held + shared sim b (a :: held) = shared sim b held + shared sim a (b :: held) := by
  have h1 := shared_ge_min hu a b held
  have h2 := shared_ge_min hu b a held
  have hs := hu.symm a b
  simp only [shared, List.foldr_cons] at h1 h2 ⊢
  omega

theorem totalShared_congr (sim : α → α → Nat) :
    ∀ (order held held' : List α), (∀ d, shared sim d held = shared sim d held') →
      totalShared sim held order = totalShared sim held' order
  | [], _, _, _ => rfl
  | d :: ds, held, held', h => by
      simp only [totalShared]
      rw [h d, totalShared_congr sim ds (d :: held) (d :: held') (fun e => by
        simp only [shared, List.foldr_cons]; rw [show List.foldr _ 0 held = shared sim e held from rfl,
          show List.foldr _ 0 held' = shared sim e held' from rfl, h e])]

theorem totalShared_perm {sim : α → α → Nat} (hu : Ultra sim) {l l' : List α}
    (hp : l.Perm l') : ∀ held, totalShared sim held l = totalShared sim held l' := by
  induction hp with
  | nil => intro _; rfl
  | cons x _ ih => intro held; simp only [totalShared]; rw [ih]
  | swap x y l =>
      intro held
      simp only [totalShared]
      have hc := totalShared_congr sim l (x :: y :: held) (y :: x :: held) (fun e => by
        simp only [shared, List.foldr_cons]; omega)
      have hs := shared_swap hu y x held
      omega
  | trans _ _ ih1 ih2 => intro held; rw [ih1, ih2]

theorem totalCost_perm {sim : α → α → Nat} (hu : Ultra sim) (base : α → Nat) (held : List α)
    {l l' : List α} (hp : l.Perm l') : totalCost sim base held l = totalCost sim base held l' := by
  unfold totalCost
  rw [totalShared_perm hu hp held, (hp.map base).sum_nat]

def isGreedy (sim : α → α → Nat) : List α → List α → Bool
  | _, [] => true
  | held, d :: ds => ds.all (fun e => decide (shared sim e held ≤ shared sim d held)) && isGreedy sim (d :: held) ds

theorem greedy_optimal {sim : α → α → Nat} (hu : Ultra sim) (base : α → Nat) (held : List α)
    {g l : List α} (_hg : isGreedy sim held g = true) (hp : g.Perm l) :
    totalCost sim base held g ≤ totalCost sim base held l :=
  Int.le_of_eq (totalCost_perm hu base held hp)

def prefixCost (base : List Nat → Nat) (held order : List (List Nat)) (k : Nat) : Int :=
  totalCost lcp base held (order.take k)

def depthBase (d : List Nat) : Nat := d.length

def budgetHeld : List (List Nat) := [[0, 0, 0, 0]]

def budgetGreedy : List (List Nat) := [[0, 1, 0, 0], [1, 0, 0, 0], [1, 0, 0, 1], [1, 0, 0, 2]]

def budgetCluster : List (List Nat) := [[1, 0, 0, 0], [1, 0, 0, 1], [1, 0, 0, 2], [0, 1, 0, 0]]

theorem budget_greedy_is_greedy : isGreedy lcp budgetHeld budgetGreedy = true := by decide

theorem budget_same_pool : budgetGreedy.Perm budgetCluster := by decide

theorem greedy_fails_under_budget :
    prefixCost depthBase budgetHeld budgetCluster 3 < prefixCost depthBase budgetHeld budgetGreedy 3 := by
  decide

end BucketMath.Learning.Sequencing
