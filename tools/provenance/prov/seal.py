from __future__ import annotations

import hashlib
import shutil
import subprocess
from pathlib import Path

STORE = Path.home() / ".local" / "share" / "bucket-provenance" / "sealed"
IDENTITY = Path.home() / ".config" / "bucket-provenance" / "age-identity.txt"
RECIPIENTS = Path(__file__).resolve().parents[1] / "recipients.txt"
REPO = Path(__file__).resolve().parents[3]


class SealError(RuntimeError):
    pass


def require_age() -> str:
    exe = shutil.which("age")
    if not exe:
        raise SealError("age not found; see tools/provenance/INSTALL.md")
    return exe


def outside_repo(path: Path) -> Path:
    p = path.expanduser().resolve()
    if p == REPO or REPO in p.parents:
        raise SealError(f"{p} is inside the repo; sealed files and identities live outside it")
    return p


def recipients(path: Path = RECIPIENTS) -> list[str]:
    if not path.exists():
        raise SealError(f"{path} missing; the founder runs the setup in tools/provenance/INSTALL.md")
    keys = [ln.strip() for ln in path.read_text().splitlines() if ln.strip() and not ln.startswith("#")]
    if any(k.startswith("AGE-SECRET-KEY-") for k in keys):
        raise SealError("recipients file holds a secret key")
    if len(keys) < 2:
        raise SealError("recipients file needs the online identity and the offline backup")
    return keys


def _encrypt(data: bytes, out: Path, recipients_file: Path) -> None:
    subprocess.run([require_age(), "-R", str(recipients_file), "-o", str(out)], input=data, check=True)


def seal(plain: Path, sha256: str, store: Path = STORE, recipients_file: Path = RECIPIENTS) -> tuple[Path, str]:
    data = plain.expanduser().read_bytes()
    if hashlib.sha256(data).hexdigest() != sha256:
        raise SealError(f"{plain} changed since the manifest was written")
    recipients(recipients_file)
    out_dir = outside_repo(store)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{sha256}.age"
    _encrypt(data, out, recipients_file)
    return out, hashlib.sha256(out.read_bytes()).hexdigest()


def unseal(sealed: Path, identity: Path = IDENTITY) -> bytes:
    res = subprocess.run(
        [require_age(), "-d", "-i", str(identity.expanduser()), str(sealed)], capture_output=True, check=False
    )
    if res.returncode != 0:
        raise SealError(res.stderr.decode().strip() or "decrypt failed")
    return res.stdout


def reseal(sealed: Path, sha256: str, identity: Path, recipients_file: Path) -> str:
    data = unseal(sealed, identity)
    if hashlib.sha256(data).hexdigest() != sha256:
        raise SealError(f"{sealed} does not decrypt to {sha256}")
    recipients(recipients_file)
    tmp = sealed.with_name(sealed.name + ".new")
    _encrypt(data, tmp, recipients_file)
    tmp.replace(sealed)
    return hashlib.sha256(sealed.read_bytes()).hexdigest()
