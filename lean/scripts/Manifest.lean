import Lean
import BucketMathAll
open Lean Meta

def roots : List Name := [`BucketMath, `Bucket]

def skipName (n : Name) : Bool :=
  n.isInternal || n.components.any fun c =>
    let s := c.toString
    s.startsWith "match_" || s.startsWith "proof_" || s.startsWith "eq_" || s == "rec" || s == "recOn" ||
      s == "casesOn" || s == "noConfusion" || s == "noConfusionType" || s == "below" || s == "brecOn" ||
      s == "binductionOn" || s == "ibelow" || s == "sizeOf_spec" || s == "mk" || s == "ctorIdx" || s.startsWith "_"

def kindOf : ConstantInfo → Option String
  | .thmInfo _ => some "theorem"
  | .defnInfo _ => some "def"
  | .inductInfo _ => some "inductive"
  | _ => none

#eval show MetaM Unit from do
  let env ← getEnv
  let mut rows : Array Json := #[]
  for (n, ci) in env.constants.toList do
    if skipName n then continue
    let some kind := kindOf ci | continue
    let some idx := env.getModuleIdxFor? n | continue
    let mod := env.header.moduleNames[idx.toNat]!
    unless roots.contains mod.getRoot do continue
    if isInstanceCore env n then continue
    if (← isMatcher n) then continue
    if kind == "def" && (getStructureInfo? env n.getPrefix).isSome && (getStructureFields env n.getPrefix).contains (Name.mkSimple (n.componentsRev.headD Name.anonymous).toString) then continue
    let axioms ← collectAxioms n
    let line := (← findDeclarationRanges? n).map (·.range.pos.line) |>.getD 0
    let sig ← ppExpr ci.type
    rows := rows.push <| Json.mkObj [
      ("name", toJson n.toString), ("kind", toJson kind), ("module", toJson mod.toString),
      ("line", toJson line), ("type", toJson (toString sig)),
      ("axioms", toJson (axioms.map (·.toString)))]
  IO.println (Json.compress (toJson rows))
