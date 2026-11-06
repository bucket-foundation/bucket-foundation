def dot : List Int → List Int → Int
  | a :: as, b :: bs => a * b + dot as bs
  | _, _ => 0

def jointScore (w c : List Int) : Int := dot w c

theorem jointScore_meaning_only (s p c m : Int) :
    jointScore [0, 0, 0, 1] [s, p, c, m] = m := by
  simp [jointScore, dot]

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
