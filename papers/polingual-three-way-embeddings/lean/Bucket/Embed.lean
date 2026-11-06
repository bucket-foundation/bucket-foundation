structure Lexicon (W E : Type) where
  english : W → List E
  gloss : W → List E
  targets : E → List W

def Lexicon.shown {W E : Type} (lex : Lexicon W E) (w : W) : List E :=
  if (lex.english w).isEmpty then (lex.gloss w).take 3 else (lex.english w).take 3

theorem Lexicon.shown_length_le {W E : Type} (lex : Lexicon W E) (w : W) :
    (lex.shown w).length ≤ 3 := by
  unfold Lexicon.shown
  split <;> simp [Nat.min_le_left]

def Lexicon.firstTarget {W E : Type} (lex : Lexicon W E) (e : E) : Option W :=
  (lex.targets e).head?

def dot : List Int → List Int → Int
  | a :: as, b :: bs => a * b + dot as bs
  | _, _ => 0

theorem dot_comm : ∀ a b : List Int, dot a b = dot b a
  | [], [] => rfl
  | [], _ :: _ => by simp [dot]
  | _ :: _, [] => by simp [dot]
  | x :: xs, y :: ys => by simp [dot, dot_comm xs ys, Int.mul_comm]

def Modality (W : Type) := W → List Int

def Modality.cos {W : Type} (m : Modality W) (a b : W) : Int := dot (m a) (m b)

theorem Modality.cos_symm {W : Type} (m : Modality W) (a b : W) : m.cos a b = m.cos b a :=
  dot_comm (m a) (m b)

def jointScore (w c : List Int) : Int := dot w c

def jointOf {W : Type} (w : List Int) (ms : List (Modality W)) (a b : W) : Int :=
  jointScore w (ms.map fun m => m.cos a b)

theorem jointScore_meaning_only (s p c m : Int) :
    jointScore [0, 0, 0, 1] [s, p, c, m] = m := by
  simp [jointScore, dot]

theorem jointOf_symm {W : Type} (w : List Int) (ms : List (Modality W)) (a b : W) :
    jointOf w ms a b = jointOf w ms b a := by
  unfold jointOf
  congr 2
  funext m
  exact Modality.cos_symm m a b

def precisionPct (right judged : Nat) : Nat := right * 100 / judged

theorem precisionPct_le (right judged : Nat) (h : right ≤ judged) :
    precisionPct right judged ≤ 100 := by
  unfold precisionPct
  rcases Nat.eq_zero_or_pos judged with hz | hp
  · simp [hz]
  · exact Nat.div_le_of_le_mul (by rw [Nat.mul_comm judged 100, Nat.mul_comm right 100]; exact Nat.mul_le_mul_left 100 h)

def keepSenses {α : Type} (keep : α → Bool) (senses : List α) : List α := senses.filter keep

theorem keepSenses_length {α : Type} (keep : α → Bool) (senses : List α) :
    (keepSenses keep senses).length ≤ senses.length :=
  List.length_filter_le keep senses
