import Std

namespace BucketMath.Learning.Capacity

variable {ι : Type}

def lastHold (R : Nat → Nat → Nat) (r S : Nat) : Nat → Nat
  | 0 => 0
  | n + 1 => if r ≤ R (n + 1) S then n + 1 else lastHold R r S n

theorem lastHold_le (R : Nat → Nat → Nat) (r S n : Nat) : lastHold R r S n ≤ n := by
  induction n with
  | zero => simp [lastHold]
  | succ n ih => unfold lastHold; split <;> omega

theorem lastHold_holds (R : Nat → Nat → Nat) (r S n : Nat) (h : 0 < lastHold R r S n) :
    r ≤ R (lastHold R r S n) S := by
  induction n with
  | zero => simp [lastHold] at h
  | succ n ih =>
      unfold lastHold at h ⊢
      by_cases hn : r ≤ R (n + 1) S
      · rw [if_pos hn]; exact hn
      · rw [if_neg hn] at h ⊢; exact ih h

theorem lastHold_mono_stability (R : Nat → Nat → Nat) (r n : Nat)
    (hR : ∀ t S S', S ≤ S' → R t S ≤ R t S') {S S' : Nat} (h : S ≤ S') :
    lastHold R r S n ≤ lastHold R r S' n := by
  induction n with
  | zero => simp [lastHold]
  | succ n ih =>
      have hle := lastHold_le R r S n
      unfold lastHold
      by_cases h1 : r ≤ R (n + 1) S
      · have h2 : r ≤ R (n + 1) S' := Nat.le_trans h1 (hR _ _ _ h)
        rw [if_pos h1, if_pos h2]; exact Nat.le_refl _
      · rw [if_neg h1]
        split <;> omega

theorem held_retention (R : Nat → Nat → Nat) (r S n t : Nat)
    (hT : ∀ t t' S, t ≤ t' → R t' S ≤ R t S)
    (hpos : 0 < lastHold R r S n) (ht : t ≤ lastHold R r S n) : r ≤ R t S :=
  Nat.le_trans (lastHold_holds R r S n hpos) (hT _ _ _ ht)

def maintenance (c W I : Nat) : Nat := c * W / I

theorem maintenance_antitone (c W : Nat) {I I' : Nat} (hI : 0 < I) (h : I ≤ I') :
    maintenance c W I' ≤ maintenance c W I :=
  Nat.div_le_div_left h hI

def upkeep (R : Nat → Nat → Nat) (r n c W S : Nat) : Nat :=
  maintenance c W (lastHold R r S n)

theorem upkeep_antitone (R : Nat → Nat → Nat) (r n c W : Nat)
    (hR : ∀ t S S', S ≤ S' → R t S ≤ R t S') {S S' : Nat}
    (hpos : 0 < lastHold R r S n) (h : S ≤ S') :
    upkeep R r n c W S' ≤ upkeep R r n c W S :=
  maintenance_antitone c W hpos (lastHold_mono_stability R r n hR h)

def load (cost : ι → Nat) (held : List ι) : Nat := (held.map cost).sum

theorem length_mul_le_load (cost : ι → Nat) (m : Nat) (held : List ι)
    (hmin : ∀ i ∈ held, m ≤ cost i) : held.length * m ≤ load cost held := by
  induction held with
  | nil => simp [load]
  | cons i rest ih =>
      have hi := hmin i (by simp)
      have hr := ih (fun j hj => hmin j (by simp [hj]))
      simp only [load, List.map_cons, List.sum_cons, List.length_cons] at hr ⊢
      rw [Nat.succ_mul]; omega

theorem capacity_bound (cost : ι → Nat) (held : List ι) {m B : Nat} (hm : 0 < m)
    (hmin : ∀ i ∈ held, m ≤ cost i) (hB : load cost held ≤ B) : held.length ≤ B / m :=
  (Nat.le_div_iff_mul_le hm).mpr (Nat.le_trans (length_mul_le_load cost m held hmin) hB)

theorem load_const (cost : ι → Nat) (m : Nat) (held : List ι)
    (hc : ∀ i ∈ held, cost i = m) : load cost held = held.length * m := by
  induction held with
  | nil => simp [load]
  | cons i rest ih =>
      have hi := hc i (by simp)
      have hr := ih (fun j hj => hc j (by simp [hj]))
      simp only [load, List.map_cons, List.sum_cons, List.length_cons] at hr ⊢
      rw [Nat.succ_mul]; omega

theorem capacity_tight (cost : ι → Nat) (pool : List ι) {m B : Nat}
    (hpool : B / m ≤ pool.length) (hc : ∀ i ∈ pool, cost i = m) :
    (pool.take (B / m)).length = B / m ∧ load cost (pool.take (B / m)) ≤ B := by
  have hlen : (pool.take (B / m)).length = B / m := by simp; omega
  refine ⟨hlen, ?_⟩
  rw [load_const cost m _ (fun i hi => hc i (List.mem_of_mem_take hi)), hlen]
  exact Nat.div_mul_le_self B m

theorem load_mono (cost cost' : ι → Nat) (held : List ι) (h : ∀ i ∈ held, cost' i ≤ cost i) :
    load cost' held ≤ load cost held := by
  induction held with
  | nil => simp [load]
  | cons i rest ih =>
      have hi := h i (by simp)
      have hr := ih (fun j hj => h j (by simp [hj]))
      simp only [load, List.map_cons, List.sum_cons] at hr ⊢
      omega

theorem capacity_bound_mono {m m' : Nat} (B : Nat) (hm' : 0 < m') (h : m' ≤ m) :
    B / m ≤ B / m' :=
  Nat.div_le_div_left h hm'

theorem capacity_rises (R : Nat → Nat → Nat) (r n c W B : Nat)
    (hR : ∀ t S S', S ≤ S' → R t S ≤ R t S') (stab : Nat → ι → Nat) (held : List ι)
    {w w' : Nat} (hgrow : ∀ i ∈ held, stab w i ≤ stab w' i)
    (hpos : ∀ i ∈ held, 0 < lastHold R r (stab w i) n)
    (hB : load (fun i => upkeep R r n c W (stab w i)) held ≤ B) :
    load (fun i => upkeep R r n c W (stab w' i)) held ≤ B :=
  Nat.le_trans
    (load_mono _ _ held (fun i hi => upkeep_antitone R r n c W hR (hpos i hi) (hgrow i hi))) hB

def powerRetention (U t S : Nat) : Nat := 9 * S * U / (9 * S + t)

theorem powerRetention_antitone_time (U S : Nat) {t t' : Nat} (hS : 0 < S) (h : t ≤ t') :
    powerRetention U t' S ≤ powerRetention U t S :=
  Nat.div_le_div_left (by omega) (by omega)

end BucketMath.Learning.Capacity
