import BucketMath.Vec

namespace BucketMath.Open

open BucketMath.Vec

def project : List (List Rat) → List Rat → List Rat
  | [], x => x.map (fun _ => 0)
  | v :: vs, x => add (smul (dot x v) v) (project vs x)

def Orthonormal (vs : List (List Rat)) : Prop :=
  ∀ a ∈ vs, ∀ b ∈ vs, dot a b = if a = b then 1 else 0

theorem pythagoras_orthonormal (x : List Rat) (vs : List (List Rat))
    (hlen : ∀ v ∈ vs, v.length = x.length) (h : Orthonormal vs) (hnodup : vs.Nodup) :
    dot x x = dot (project vs x) (project vs x) + dot (sub x (project vs x)) (sub x (project vs x)) := by
  sorry

end BucketMath.Open
