from __future__ import annotations

import subprocess
from pathlib import Path

NAMESPACE = "bucket-generation"
SIGNER = "gianyrox@gmail.com"
DEFAULT_KEY = Path.home() / ".ssh" / "id_ed25519"


def sig_path(path: Path) -> Path:
    return path.with_name(path.name + ".sig")


def sign(path: Path, key: Path = DEFAULT_KEY) -> Path:
    sig = sig_path(path)
    if sig.exists():
        sig.unlink()
    subprocess.run(
        ["ssh-keygen", "-Y", "sign", "-n", NAMESPACE, "-f", str(key.expanduser()), str(path)],
        check=True,
        capture_output=True,
    )
    return sig


def verify(path: Path, allowed_signers: Path, revoked: Path | None = None, identity: str = SIGNER) -> bool:
    cmd = ["ssh-keygen", "-Y", "verify", "-f", str(allowed_signers), "-I", identity, "-n", NAMESPACE]
    cmd += ["-s", str(sig_path(path))]
    if revoked is not None and revoked.exists() and revoked.read_text().strip():
        cmd += ["-r", str(revoked)]
    with path.open("rb") as fh:
        return subprocess.run(cmd, stdin=fh, capture_output=True, check=False).returncode == 0
