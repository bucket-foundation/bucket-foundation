namespace BucketMath.Fsrs

def clamp (lo hi x : Int) : Int := min (max x lo) hi

def floorAt (lo x : Int) : Int := max x lo

def roundHalfUp (n d : Int) : Int := (2 * n + d) / (2 * d)

def interval (cap n d : Int) : Int := min (max 1 (roundHalfUp n d)) cap

def difficultyUnit : Int := 1024

def stabilityUnit : Int := 6400

def clampD (x : Int) : Int := clamp difficultyUnit (10 * difficultyUnit) x

def stabilityFloor : Int := 64

def clampS (x : Int) : Int := floorAt stabilityFloor x

def schedule (n d : Int) : Int := interval 3650 n d

theorem clamp_bounds (lo hi x : Int) (h : lo ≤ hi) : lo ≤ clamp lo hi x ∧ clamp lo hi x ≤ hi := by
  unfold clamp; omega

theorem clamp_of_mem (lo hi x : Int) (h1 : lo ≤ x) (h2 : x ≤ hi) : clamp lo hi x = x := by
  unfold clamp; omega

theorem clamp_idem (lo hi x : Int) (h : lo ≤ hi) : clamp lo hi (clamp lo hi x) = clamp lo hi x := by
  unfold clamp; omega

theorem clamp_mono (lo hi : Int) {x y : Int} (h : x ≤ y) : clamp lo hi x ≤ clamp lo hi y := by
  unfold clamp; omega

theorem floorAt_ge (lo x : Int) : lo ≤ floorAt lo x := by
  unfold floorAt; omega

theorem floorAt_of_ge (lo x : Int) (h : lo ≤ x) : floorAt lo x = x := by
  unfold floorAt; omega

theorem interval_bounds (cap n d : Int) (h : 1 ≤ cap) : 1 ≤ interval cap n d ∧ interval cap n d ≤ cap := by
  unfold interval; omega

theorem interval_mono (cap : Int) {n n' d : Int} (hd : 0 < d) (h : n ≤ n') :
    interval cap n d ≤ interval cap n' d := by
  have hr : roundHalfUp n d ≤ roundHalfUp n' d :=
    Int.ediv_le_ediv (by omega) (by omega)
  unfold interval; omega

theorem clampD_bounds (x : Int) : difficultyUnit ≤ clampD x ∧ clampD x ≤ 10 * difficultyUnit :=
  clamp_bounds _ _ x (by decide)

theorem stabilityFloor_hundredth : 100 * stabilityFloor = stabilityUnit := by decide

theorem clampS_bounds (x : Int) : stabilityFloor ≤ clampS x := floorAt_ge _ x

theorem schedule_bounds (n d : Int) : 1 ≤ schedule n d ∧ schedule n d ≤ 3650 :=
  interval_bounds 3650 n d (by decide)

theorem review_bounds (rawD rawS n d : Int) :
    (difficultyUnit ≤ clampD rawD ∧ clampD rawD ≤ 10 * difficultyUnit) ∧ stabilityFloor ≤ clampS rawS ∧
      1 ≤ schedule n d ∧ schedule n d ≤ 3650 :=
  ⟨clampD_bounds rawD, clampS_bounds rawS, schedule_bounds n d⟩

end BucketMath.Fsrs
