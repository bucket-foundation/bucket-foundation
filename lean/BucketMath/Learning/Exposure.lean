namespace BucketMath.Learning.Exposure

def gainCap : Int := 150

def gainUnit : Int := 1000

structure Card where
  s : Int
  due : Int
  last : Int
  isNew : Bool
  creditDay : Int
  deriving DecidableEq, Repr

structure Ctx where
  day : Int
  now : Int
  recallOk : Bool
  gain : Int
  ivl : Int → Int

def credited (x : Ctx) (c : Card) : Bool :=
  !c.isNew && x.recallOk && c.creditDay != x.day

def raise (x : Ctx) (s : Int) : Int := s + s * x.gain / gainUnit

def exposure (x : Ctx) (c : Card) : Card :=
  if credited x c then
    { c with s := raise x c.s, due := max c.due (c.last + x.ivl (raise x c.s)), creditDay := x.day }
  else c

def tap (x : Ctx) (c : Card) : Card := { c with due := x.now }

def row (x : Ctx) (tapped : Bool) (c : Card) : Card := if tapped then tap x c else exposure x c

def group (x : Ctx) (rows : List Bool) (c : Card) : Card :=
  (rows.filter (fun t => t)).foldl (fun c _ => tap x c) ((rows.filter (fun t => !t)).foldl (fun c _ => exposure x c) c)

theorem e1_skip (x : Ctx) (c : Card) (h : c.isNew = true ∨ x.recallOk = false) : (exposure x c).s = c.s := by
  unfold exposure credited
  rcases h with h | h <;> simp [h]

theorem e1_bounds (x : Ctx) (c : Card) (hs : 0 ≤ c.s) (hg0 : 0 ≤ x.gain) (hg : x.gain ≤ gainCap) :
    c.s ≤ (exposure x c).s ∧ gainUnit * (exposure x c).s ≤ (gainUnit + gainCap) * c.s := by
  have hm : c.s * x.gain ≤ c.s * gainCap := Int.mul_le_mul_of_nonneg_left hg hs
  have hn : 0 ≤ c.s * x.gain := Int.mul_nonneg hs hg0
  unfold exposure
  split
  · simp only [raise, gainUnit, gainCap] at *
    constructor <;> omega
  · simp only [gainUnit, gainCap]
    constructor <;> omega

theorem exposure_idem (x : Ctx) (c : Card) : exposure x (exposure x c) = exposure x c := by
  unfold exposure credited
  by_cases h : (!c.isNew && x.recallOk && c.creditDay != x.day) = true
  · simp only [h, if_true]
    simp
  · simp only [h]
    simp [h]

theorem e2_same_day (x : Ctx) (c : Card) (n : Nat) : Nat.repeat (exposure x) (n + 1) c = exposure x c := by
  induction n with
  | zero => rfl
  | succ k ih =>
    show exposure x (Nat.repeat (exposure x) (k + 1) c) = exposure x c
    rw [ih, exposure_idem]

theorem e3_due (x : Ctx) (c : Card) : c.due ≤ (exposure x c).due ∧ (exposure x c).last = c.last := by
  unfold exposure
  split
  · exact ⟨Int.le_max_left _ _, rfl⟩
  · exact ⟨Int.le_refl _, rfl⟩

theorem e3_tap (x : Ctx) (c : Card) : (row x true c).due = x.now ∧ (row x true c).last = c.last := by
  simp [row, tap]

theorem e4_tap_keeps_s (x : Ctx) (c : Card) : (row x true c).s = c.s := by
  simp [row, tap]

theorem fold_exposure (x : Ctx) (l : List Bool) (c : Card) :
    l.foldl (fun c _ => exposure x c) c = if l.length = 0 then c else exposure x c := by
  induction l generalizing c with
  | nil => simp
  | cons a t ih =>
    simp only [List.foldl_cons, List.length_cons]
    rw [ih]
    cases t with
    | nil => simp
    | cons b u => simp [exposure_idem]

theorem fold_tap (x : Ctx) (l : List Bool) (c : Card) :
    l.foldl (fun c _ => tap x c) c = if l.length = 0 then c else tap x c := by
  induction l generalizing c with
  | nil => simp
  | cons a t ih =>
    simp only [List.foldl_cons, List.length_cons]
    rw [ih]
    cases t with
    | nil => simp
    | cons b u => simp [tap]

theorem e5_order (x : Ctx) {r₁ r₂ : List Bool} (h : r₁.Perm r₂) (c : Card) : group x r₁ c = group x r₂ c := by
  unfold group
  rw [fold_exposure, fold_exposure, fold_tap, fold_tap,
    (h.filter (fun t => !t)).length_eq, (h.filter (fun t => t)).length_eq]

end BucketMath.Learning.Exposure
