from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from . import manifest, merkle, ots, seal, sign


def rows_and_version(path: Path) -> tuple[list[dict], int]:
    rows = manifest.read_rows(path)
    return rows, 1 if rows and "v" not in rows[0] else 2


def root_of(path: Path) -> str:
    rows, v = rows_and_version(path)
    if v == 1:
        return merkle.root_v1([r["sha256"] for r in rows])
    return merkle.root_v2([manifest.canonical(r) for r in rows])


def write_root(day: Path) -> str:
    root = root_of(day / "manifest.jsonl")
    (day / "merkle-root.txt").write_text(root + "\n")
    return root


def find(rows: list[dict], path: str) -> int:
    for i, r in enumerate(rows):
        if r["path"] == path or r["sha256"] == path:
            return i
    raise SystemExit(f"{path} is not in the manifest")


def prove(man: Path, target: str) -> dict:
    rows, v = rows_and_version(man)
    i = find(rows, target)
    if v == 1:
        return {"v": 1, "sha256": rows[i]["sha256"], "path": merkle.proof_v1([r["sha256"] for r in rows], i)}
    return {"v": 2, "row": rows[i], "path": merkle.proof_v2([manifest.canonical(r) for r in rows], i)}


def verify_proof(proof: dict, root: str) -> bool:
    path = [tuple(p) for p in proof["path"]]
    if proof["v"] == 1:
        return merkle.verify_v1(proof["sha256"], path, root)
    return merkle.verify_v2(manifest.canonical(proof["row"]), path, root)


def migrate(v1_day: Path, out_day: Path) -> str:
    out_day.mkdir(parents=True, exist_ok=True)
    rows = [manifest.migrate_row(r) for r in manifest.read_rows(v1_day / "manifest.jsonl")]
    manifest.write_rows(out_day / "manifest.jsonl", rows)
    (out_day / "migrated-from.json").write_text(
        json.dumps({"from": str(v1_day), "v1_root": root_of(v1_day / "manifest.jsonl")}, indent=1) + "\n"
    )
    return write_root(out_day)


def cmd_build(a) -> int:
    day = Path(a.day)
    day.mkdir(parents=True, exist_ok=True)
    rows = [manifest.file_row(Path(f), a.author, a.visibility) for f in a.files]
    man = day / "manifest.jsonl"
    if man.exists():
        old = manifest.read_rows(man)
        seen = {r["sha256"] for r in old}
        rows = old + [r for r in rows if r["sha256"] not in seen]
    manifest.write_rows(man, rows)
    print(write_root(day))
    return 0


def cmd_root(a) -> int:
    print(root_of(Path(a.manifest)))
    return 0


def cmd_prove(a) -> int:
    print(json.dumps(prove(Path(a.manifest), a.target)))
    return 0


def cmd_verify_proof(a) -> int:
    ok = verify_proof(json.loads(Path(a.proof).read_text()), a.root)
    print("ok" if ok else "mismatch")
    return 0 if ok else 1


def cmd_sign(a) -> int:
    print(sign.sign(Path(a.file), Path(a.key)))
    return 0


def cmd_verify(a) -> int:
    f = Path(a.file)
    allowed = Path(a.allowed_signers) if a.allowed_signers else f.with_name("allowed_signers")
    revoked = Path(a.revoked) if a.revoked else f.with_name("revoked_signers")
    ok = sign.verify(f, allowed, revoked)
    print("ok" if ok else "bad signature")
    return 0 if ok else 1


def cmd_stamp(a) -> int:
    print(ots.stamp(Path(a.file)))
    return 0


def cmd_upgrade(a) -> int:
    for r in sorted(Path(a.root).expanduser().rglob("*.ots")):
        print(f"{r}: {ots.upgrade(r)}")
    return 0


def cmd_seal(a) -> int:
    day = Path(a.day)
    man = day / "manifest.jsonl"
    rows = manifest.read_rows(man)
    for r in rows:
        if r["visibility"] != "private" or r["sealed_sha256"]:
            continue
        plain = Path(r["path"]).expanduser()
        out, sealed = seal.seal(plain, r["sha256"], Path(a.store), Path(a.recipients))
        r["sealed_sha256"] = sealed
        print(f"sealed {r['path']} -> {out}")
        if a.remove_plain:
            if hashlib.sha256(seal.unseal(out, Path(a.identity))).hexdigest() != r["sha256"]:
                raise SystemExit(f"round trip failed for {r['path']}; plaintext kept")
            plain.unlink()
    manifest.write_rows(man, rows)
    print(write_root(day))
    return 0


def cmd_reseal(a) -> int:
    for f in sorted(Path(a.store).expanduser().glob("*.age")):
        print(f"{f.name}: {seal.reseal(f, f.stem, Path(a.identity), Path(a.recipients))}")
    return 0


def cmd_migrate(a) -> int:
    print(migrate(Path(a.v1_day), Path(a.out_day)))
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="prov")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("day")
    b.add_argument("files", nargs="+")
    b.add_argument("--author", required=True, choices=sorted(manifest.AUTHORS))
    b.add_argument("--visibility", default="public", choices=sorted(manifest.VISIBILITY))
    b.set_defaults(fn=cmd_build)
    r = sub.add_parser("root")
    r.add_argument("manifest")
    r.set_defaults(fn=cmd_root)
    pr = sub.add_parser("prove")
    pr.add_argument("manifest")
    pr.add_argument("target")
    pr.set_defaults(fn=cmd_prove)
    vp = sub.add_parser("verify-proof")
    vp.add_argument("proof")
    vp.add_argument("root")
    vp.set_defaults(fn=cmd_verify_proof)
    s = sub.add_parser("sign")
    s.add_argument("file")
    s.add_argument("--key", default=str(sign.DEFAULT_KEY))
    s.set_defaults(fn=cmd_sign)
    v = sub.add_parser("verify")
    v.add_argument("file")
    v.add_argument("--allowed-signers")
    v.add_argument("--revoked")
    v.set_defaults(fn=cmd_verify)
    st = sub.add_parser("stamp")
    st.add_argument("file")
    st.set_defaults(fn=cmd_stamp)
    up = sub.add_parser("upgrade")
    up.add_argument("root")
    up.set_defaults(fn=cmd_upgrade)
    se = sub.add_parser("seal")
    se.add_argument("day")
    se.add_argument("--store", default=str(seal.STORE))
    se.add_argument("--recipients", default=str(seal.RECIPIENTS))
    se.add_argument("--identity", default=str(seal.IDENTITY))
    se.add_argument("--remove-plain", action="store_true")
    se.set_defaults(fn=cmd_seal)
    rs = sub.add_parser("reseal")
    rs.add_argument("--store", default=str(seal.STORE))
    rs.add_argument("--recipients", default=str(seal.RECIPIENTS))
    rs.add_argument("--identity", required=True)
    rs.set_defaults(fn=cmd_reseal)
    m = sub.add_parser("migrate")
    m.add_argument("v1_day")
    m.add_argument("out_day")
    m.set_defaults(fn=cmd_migrate)
    a = p.parse_args(argv)
    try:
        return a.fn(a)
    except (seal.SealError, ots.OtsError, manifest.ManifestError) as e:
        print(f"prov: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
