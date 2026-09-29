from __future__ import annotations

import fnmatch
import json
import shutil
import subprocess
from pathlib import Path

CALENDARS = [
    "https://alice.btc.calendar.opentimestamps.org",
    "https://bob.btc.calendar.opentimestamps.org",
    "https://finney.calendar.eternitywall.com",
]
CONFIG = Path.home() / "agfarms" / ".nucleus" / "config.json"


class OtsError(RuntimeError):
    pass


def forbidden(url: str, config: Path = CONFIG) -> bool:
    try:
        patterns = json.loads(config.read_text()).get("forbidden_urls", [])
    except (OSError, ValueError):
        patterns = []
    host = url.split("://", 1)[-1].split("/", 1)[0]
    return any(fnmatch.fnmatch(url, p) or fnmatch.fnmatch(host, p) for p in patterns)


def _ots() -> str:
    exe = shutil.which("ots")
    if not exe:
        raise OtsError("ots not found; see tools/provenance/INSTALL.md")
    return exe


def stamp(path: Path, config: Path = CONFIG) -> Path:
    allowed = [c for c in CALENDARS if not forbidden(c, config)]
    if not allowed:
        raise OtsError("every calendar is forbidden")
    cmd = [_ots(), "stamp"]
    for c in allowed:
        cmd += ["-c", c]
    subprocess.run(cmd + [str(path)], check=True, capture_output=True)
    return path.with_name(path.name + ".ots")


def upgrade(receipt: Path) -> str:
    res = subprocess.run([_ots(), "upgrade", str(receipt)], capture_output=True, text=True, check=False)
    return (res.stdout + res.stderr).strip()


def info(receipt: Path) -> str:
    return subprocess.run([_ots(), "info", str(receipt)], capture_output=True, text=True, check=True).stdout


def digest(receipt: Path) -> str:
    for line in info(receipt).splitlines():
        if line.startswith("File sha256 hash:"):
            return line.split(":", 1)[1].strip()
    raise OtsError("no file hash in receipt")
