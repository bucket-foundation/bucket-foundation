from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from prov import cli, manifest, merkle, ots, seal, sign
from tests.conftest import DAY_ONE_ROOT

REPO = Path(__file__).resolve().parents[3]


def test_merkle_v1_reproduces_first_manifest(day_one: Path):
    assert cli.root_of(day_one / "manifest.jsonl") == DAY_ONE_ROOT
    assert (day_one / "merkle-root.txt").read_text().split()[0] == DAY_ONE_ROOT


def test_merkle_v1_inclusion_proof_every_row(day_one: Path):
    rows = manifest.read_rows(day_one / "manifest.jsonl")
    hashes = [r["sha256"] for r in rows]
    for i, h in enumerate(hashes):
        assert merkle.verify_v1(h, merkle.proof_v1(hashes, i), DAY_ONE_ROOT)
    assert not merkle.verify_v1("00" * 32, merkle.proof_v1(hashes, 0), DAY_ONE_ROOT)


def test_merkle_v2_domain_separation():
    rows = [b"a", b"b"]
    v2 = merkle.root_v2(rows)
    plain = hashlib.sha256(hashlib.sha256(b"a").digest() + hashlib.sha256(b"b").digest()).hexdigest()
    assert v2 != plain
    inner = hashlib.sha256(b"\x01" + merkle.leaf_v2(b"a") + merkle.leaf_v2(b"b")).hexdigest()
    assert v2 == inner
    assert merkle.root_v2([bytes.fromhex(inner)]) != inner


def test_odd_leaf_promotion():
    rows = [b"a", b"b", b"c"]
    left = hashlib.sha256(b"\x01" + merkle.leaf_v2(b"a") + merkle.leaf_v2(b"b")).digest()
    expected = hashlib.sha256(b"\x01" + left + merkle.leaf_v2(b"c")).hexdigest()
    assert merkle.root_v2(rows) == expected


@pytest.mark.parametrize("n", [1, 2, 3, 5, 8, 13])
def test_inclusion_proof_roundtrip(n: int):
    rows = [f"row{i}".encode() for i in range(n)]
    root = merkle.root_v2(rows)
    for i, r in enumerate(rows):
        assert merkle.verify_v2(r, merkle.proof_v2(rows, i), root)
    assert not merkle.verify_v2(b"forged", merkle.proof_v2(rows, 0), root)


def test_v1_author_mapping():
    base = {"path": "~/x", "sha256": "ab" * 32, "bytes": 1}
    got = {a: manifest.migrate_row({**base, "author": a}) for a in manifest.V1_AUTHOR}
    assert {a: (r["author"], r["visibility"]) for a, r in got.items()} == manifest.V1_AUTHOR
    with pytest.raises(manifest.ManifestError):
        manifest.migrate_row({**base, "author": "someone"})


def test_v2_schema_rejects_bad_rows():
    good = manifest.migrate_row({"path": "~/x", "sha256": "ab" * 32, "bytes": 1, "author": "mixed"})
    for bad in [
        {**good, "author": "robot"},
        {**good, "path": "/home/gian/x"},
        {**good, "sealed_sha256": "cd" * 32},
        {k: v for k, v in good.items() if k != "created"},
    ]:
        with pytest.raises(manifest.ManifestError):
            manifest.validate(bad)


def test_day_one_survives_migration(day_one: Path, tmp_path: Path):
    before = {p.name: p.read_bytes() for p in day_one.iterdir()}
    out = tmp_path / "v2"
    v2_root = cli.migrate(day_one, out)
    assert {p.name: p.read_bytes() for p in day_one.iterdir()} == before
    assert cli.root_of(day_one / "manifest.jsonl") == DAY_ONE_ROOT
    assert sign.verify(day_one / "manifest.jsonl", day_one / "allowed_signers")
    assert (
        ots.digest(day_one / "merkle-root.txt.ots")
        == hashlib.sha256((day_one / "merkle-root.txt").read_bytes()).hexdigest()
    )
    v1 = manifest.read_rows(day_one / "manifest.jsonl")
    v2 = manifest.read_rows(out / "manifest.jsonl")
    assert [r["sha256"] for r in v1] == [r["sha256"] for r in v2]
    assert json.loads((out / "migrated-from.json").read_text())["v1_root"] == DAY_ONE_ROOT
    assert cli.root_of(out / "manifest.jsonl") == v2_root != DAY_ONE_ROOT
    target = v1[7]["path"]
    assert cli.verify_proof(cli.prove(day_one / "manifest.jsonl", target), DAY_ONE_ROOT)
    assert cli.verify_proof(json.loads(json.dumps(cli.prove(out / "manifest.jsonl", target))), v2_root)


def test_sign_verify_roundtrip(tmp_path: Path, ssh_key):
    key, pub = ssh_key()
    f = tmp_path / "manifest.jsonl"
    f.write_text('{"a":1}\n')
    allowed = tmp_path / "allowed_signers"
    allowed.write_text(f"{sign.SIGNER} {pub}\n")
    sign.sign(f, key)
    assert sign.verify(f, allowed)
    f.write_text('{"a":2}\n')
    assert not sign.verify(f, allowed)


def test_revoked_signer_rejected(tmp_path: Path, ssh_key):
    old, old_pub = ssh_key("old")
    new, new_pub = ssh_key("new")
    allowed = tmp_path / "allowed_signers"
    allowed.write_text(f"{sign.SIGNER} {old_pub}\n{sign.SIGNER} {new_pub}\n")
    revoked = tmp_path / "revoked_signers"
    revoked.write_text(old_pub + "\n")
    a, b = tmp_path / "a.jsonl", tmp_path / "b.jsonl"
    a.write_text("a\n")
    b.write_text("b\n")
    sign.sign(a, old)
    sign.sign(b, new)
    assert sign.verify(a, allowed)
    assert not sign.verify(a, allowed, revoked)
    assert sign.verify(b, allowed, revoked)


def test_seal_roundtrip(tmp_path: Path, age_pair):
    online, online_pub = age_pair("online")
    backup, backup_pub = age_pair("backup")
    rec = tmp_path / "recipients.txt"
    rec.write_text(f"{online_pub}\n{backup_pub}\n")
    plain = tmp_path / "secret.json"
    plain.write_bytes(b'{"private": true}')
    sha = hashlib.sha256(plain.read_bytes()).hexdigest()
    out, sealed_sha = seal.seal(plain, sha, tmp_path / "store", rec)
    assert b"private" not in out.read_bytes()
    assert hashlib.sha256(out.read_bytes()).hexdigest() == sealed_sha
    assert seal.unseal(out, online) == plain.read_bytes()
    assert seal.unseal(out, backup) == plain.read_bytes()
    plain.write_bytes(b"changed")
    with pytest.raises(seal.SealError):
        seal.seal(plain, sha, tmp_path / "store", rec)


def test_reseal_rotation(tmp_path: Path, age_pair):
    a, a_pub = age_pair("a")
    backup, backup_pub = age_pair("backup")
    b, b_pub = age_pair("b")
    rec = tmp_path / "recipients.txt"
    rec.write_text(f"{a_pub}\n{backup_pub}\n")
    plain = tmp_path / "p.txt"
    plain.write_bytes(b"payload")
    sha = hashlib.sha256(b"payload").hexdigest()
    out, _ = seal.seal(plain, sha, tmp_path / "store", rec)
    rec.write_text(f"{b_pub}\n{backup_pub}\n")
    seal.reseal(out, sha, backup, rec)
    assert seal.unseal(out, b) == b"payload"
    with pytest.raises(seal.SealError):
        seal.unseal(out, a)


def test_seal_guards(tmp_path: Path, age_pair):
    ident, pub = age_pair("x")
    one = tmp_path / "one.txt"
    one.write_text(pub + "\n")
    with pytest.raises(seal.SealError, match="offline backup"):
        seal.recipients(one)
    leak = tmp_path / "leak.txt"
    leak.write_text(pub + "\n" + ident.read_text().splitlines()[-1] + "\n")
    with pytest.raises(seal.SealError, match="secret"):
        seal.recipients(leak)
    with pytest.raises(seal.SealError, match="inside the repo"):
        seal.outside_repo(REPO / "private" / "sealed")


def test_ots_receipt_parses(day_one: Path):
    if not shutil.which("ots"):
        pytest.skip("ots not installed; CI installs it")
    text = ots.info(day_one / "merkle-root.txt.ots")
    assert "PendingAttestation" in text or "BitcoinBlockHeaderAttestation" in text


def test_ots_respects_forbidden_urls(tmp_path: Path):
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps({"forbidden_urls": ["*.opentimestamps.org"]}))
    assert ots.forbidden("https://alice.btc.calendar.opentimestamps.org", cfg)
    assert not ots.forbidden("https://finney.calendar.eternitywall.com", cfg)


SECRET_PATTERNS = [
    re.compile("-----BEGIN (OPENSSH |RSA |EC )?" + "PRIVATE KEY-----"),
    re.compile("AGE-SECRET-" + "KEY-1[0-9A-Z]{58}"),
    re.compile('"d"\\s*:\\s*"[A-Za-z0-9_-]{43}"'),
]


def test_no_secrets_in_tree():
    scope = ["tools/provenance", "src/lib/provenance", "public/.well-known", "scripts/test-provenance-packet.ts"]
    cmd = ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", *scope]
    files = subprocess.run(cmd, cwd=REPO, capture_output=True, check=True).stdout.split(b"\0")
    hits = []
    for name in files:
        if not name:
            continue
        p = REPO / name.decode()
        if not p.is_file() or p.stat().st_size > 2_000_000:
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        hits += [f"{name.decode()}: {pat.pattern[:30]}" for pat in SECRET_PATTERNS if pat.search(text)]
    assert hits == []
