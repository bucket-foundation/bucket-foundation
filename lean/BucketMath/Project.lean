import BucketMath.Vec

namespace BucketMath.Project

open BucketMath.Vec

def project : List (List Rat) → List Rat → List Rat
  | [], x => x.map (fun _ => 0)
  | v :: vs, x => add (smul (dot x v) v) (project vs x)

def Orthonormal (vs : List (List Rat)) : Prop :=
  ∀ a ∈ vs, ∀ b ∈ vs, dot a b = if a = b then 1 else 0

theorem length_add (a b : List Rat) (h : a.length = b.length) : (add a b).length = a.length := by
  induction a generalizing b with
  | nil => cases b <;> rfl
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      simp only [List.length_cons, Nat.add_right_cancel_iff] at h
      simp [add, ih ys h]

theorem dot_add_left (a b c : List Rat) (h : a.length = b.length) :
    dot (add a b) c = dot a c + dot b c := by
  induction a generalizing b c with
  | nil => cases b <;> cases c <;> simp_all [dot, add] <;> grind
  | cons x xs ih =>
    cases b with
    | nil => simp at h
    | cons y ys =>
      cases c with
      | nil => simp [dot, add] <;> grind
      | cons z zs =>
        simp only [List.length_cons, Nat.add_right_cancel_iff] at h
        simp only [add, dot, ih ys zs h]; grind

theorem dot_zeros (x w : List Rat) : dot (x.map fun _ => 0) w = 0 := by
  induction x generalizing w with
  | nil => simp [dot]
  | cons a as ih =>
    cases w with
    | nil => simp [dot]
    | cons b bs => simp [dot, ih bs] <;> grind

theorem length_project (x : List Rat) (vs : List (List Rat)) (hlen : ∀ v ∈ vs, v.length = x.length) :
    (project vs x).length = x.length := by
  induction vs with
  | nil => simp [project]
  | cons v vs ih =>
    have hv := hlen v (by simp)
    have hr := ih (fun u hu => hlen u (by simp [hu]))
    simp only [project]
    rw [length_add _ _ (by rw [length_smul, hv, hr]), length_smul, hv]

theorem dot_project_left (x w : List Rat) (vs : List (List Rat)) (hlen : ∀ v ∈ vs, v.length = x.length) :
    dot (project vs x) w = sum (vs.map fun v => dot x v * dot v w) := by
  induction vs with
  | nil => simp [project, sum, dot_zeros]
  | cons v vs ih =>
    have hv := hlen v (by simp)
    have hr := length_project x vs (fun u hu => hlen u (by simp [hu]))
    simp only [project, List.map_cons, sum]
    rw [dot_add_left _ _ _ (by rw [length_smul, hv, hr]), dot_smul_left,
      ih (fun u hu => hlen u (by simp [hu]))]

theorem sum_delta_absent (f : List Rat → Rat) (v : List Rat) (us : List (List Rat)) (h : v ∉ us) :
    sum (us.map fun u => f u * if u = v then 1 else 0) = 0 := by
  induction us with
  | nil => simp [sum]
  | cons u us ih =>
    simp only [List.mem_cons, not_or] at h
    have hne : u ≠ v := fun e => h.1 e.symm
    simp only [List.map_cons, sum, hne, if_false, ih h.2]
    grind

theorem sum_delta (f : List Rat → Rat) (v : List Rat) (us : List (List Rat)) (hv : v ∈ us) (hn : us.Nodup) :
    sum (us.map fun u => f u * if u = v then 1 else 0) = f v := by
  induction us with
  | nil => simp at hv
  | cons u us ih =>
    rw [List.nodup_cons] at hn
    by_cases huv : u = v
    · subst huv
      simp [sum, sum_delta_absent f u us hn.1] <;> grind
    · have hv' : v ∈ us := by
        rcases List.mem_cons.mp hv with e | e
        · exact absurd e.symm huv
        · exact e
      simp [sum, huv, ih hv' hn.2] <;> grind

theorem dot_basis_project (x v : List Rat) (vs : List (List Rat))
    (hlen : ∀ u ∈ vs, u.length = x.length) (h : Orthonormal vs) (hn : vs.Nodup) (hv : v ∈ vs) :
    dot v (project vs x) = dot x v := by
  rw [dot_comm, dot_project_left x v vs hlen]
  have : vs.map (fun u => dot x u * dot u v) = vs.map (fun u => dot x u * if u = v then 1 else 0) :=
    List.map_congr_left (fun u hu => by rw [h u hu v hv])
  rw [this, sum_delta (fun u => dot x u) v vs hv hn]

theorem pythagoras_orthonormal (x : List Rat) (vs : List (List Rat))
    (hlen : ∀ v ∈ vs, v.length = x.length) (h : Orthonormal vs) (hnodup : vs.Nodup) :
    dot x x = dot (project vs x) (project vs x) + dot (sub x (project vs x)) (sub x (project vs x)) := by
  have hp := length_project x vs hlen
  have hpp : dot (project vs x) (project vs x) = sum (vs.map fun v => dot x v * dot x v) := by
    rw [dot_project_left x _ vs hlen]
    congr 1
    exact List.map_congr_left (fun v hv => by rw [dot_basis_project x v vs hlen h hnodup hv])
  have hpx : dot (project vs x) x = sum (vs.map fun v => dot x v * dot x v) := by
    rw [dot_project_left x x vs hlen]
    congr 1
    exact List.map_congr_left (fun v _ => by rw [dot_comm v x])
  rw [dot_sub_left _ _ _ hp.symm, dot_sub_right _ _ _ hp.symm, dot_sub_right _ _ _ hp.symm,
    dot_comm x (project vs x), hpp, hpx]
  grind

end BucketMath.Project
