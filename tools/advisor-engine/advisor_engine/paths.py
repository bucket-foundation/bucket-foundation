from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import shutil
import sqlite3
import unicodedata
from pathlib import Path
from urllib.parse import quote

DEFAULT_HOME = Path.home() / ".local" / "share" / "advisor-engine"
MIN_FREE_GB = 20
BUSY_MS = 30000
CHUNK = 900


class EngineError(Exception):
    pass


def in_git_tree(path: Path) -> bool:
    p = path.resolve()
    return any((d / ".git").exists() for d in (p, *p.parents))


def engine_home(create: bool = True) -> Path:
    home = Path(os.environ.get("ADVISOR_ENGINE_HOME") or DEFAULT_HOME).expanduser().resolve()
    if in_git_tree(home):
        raise EngineError("the engine directory sits inside a git working tree, so nothing is written")
    if create:
        home.mkdir(parents=True, exist_ok=True)
        os.chmod(home, 0o700)
    elif not home.is_dir():
        raise EngineError(f"no engine directory at {home}. The founder creates it at mode 0700 with {ACK_FILE} inside, see the README")
    return home


def inside(home: Path, target: Path) -> Path:
    t = target.expanduser().resolve()
    h = home.resolve()
    if t != h and h not in t.parents:
        raise EngineError("output paths must sit inside the engine directory")
    if in_git_tree(t.parent):
        raise EngineError("output paths must sit outside every git working tree")
    return t


def write_private(home: Path, target: Path, data: bytes, append: bool = False) -> Path:
    t = inside(home, target)
    t.parent.mkdir(parents=True, exist_ok=True)
    os.chmod(t.parent, 0o700)
    fd = os.open(t, os.O_WRONLY | os.O_CREAT | (os.O_APPEND if append else os.O_TRUNC), 0o600)
    with os.fdopen(fd, "ab" if append else "wb") as f:
        f.write(data)
    os.chmod(t, 0o600)
    return t


ACK_FILE = "founder-acknowledgement.txt"
ACK_DOCUMENTS = "docs/advisors"
ACK_LINES = (
    "I have read the slice 0 documents in docs/advisors.",
    "This tool is for my own use on this machine.",
)


def require_acknowledgement(home: Path) -> None:
    p = home / ACK_FILE
    text = " ".join(p.read_text(encoding="utf-8", errors="replace").split()) if p.is_file() else ""
    if not all(line in text for line in ACK_LINES):
        raise EngineError(
            f"the founder has not acknowledged the governance drafts. Read every document in {ACK_DOCUMENTS}, "
            f"then create {p} yourself holding these two lines: {' '.join(ACK_LINES)} This tool never writes that file."
        )


def free_guard(home: Path) -> None:
    need = float(os.environ.get("ADVISOR_ENGINE_MIN_FREE_GB", MIN_FREE_GB))
    free = shutil.disk_usage(home).free / 1024**3
    if free < need:
        raise EngineError(f"{free:.1f} GB free, under the {need:.0f} GB floor")


def engine_key(home: Path) -> bytes:
    p = home / "key"
    if not p.exists():
        write_private(home, p, secrets.token_bytes(32))
    return p.read_bytes()


def keyed(key: bytes, scheme: str, value: str) -> str:
    return hmac.new(key, f"{scheme}:{value}".encode(), hashlib.sha256).hexdigest()


def open_store(path: str | None = None) -> sqlite3.Connection:
    p = path or os.environ.get("BKT_CONTACT_STORE")
    if not p:
        raise EngineError("set BKT_CONTACT_STORE to the contact store path")
    if not Path(p).is_file():
        raise EngineError("the contact store path does not exist")
    con = sqlite3.connect(f"file:{quote(str(Path(p).resolve()))}?mode=ro", uri=True, timeout=BUSY_MS / 1000, isolation_level=None)
    con.execute(f"PRAGMA busy_timeout = {BUSY_MS}")
    return con


def current_build(home: Path) -> Path:
    cur = home / "current"
    if not cur.is_file():
        raise EngineError("no build yet, run build first")
    d = home / "builds" / cur.read_text().strip()
    if not (d / "engine.sqlite").is_file():
        raise EngineError("the current build is missing, run build again")
    return d


def open_engine(build: Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{quote(str(build / 'engine.sqlite'))}?mode=ro", uri=True, isolation_level=None)
    return con


def chunks(items, size: int = CHUNK):
    items = list(items)
    for i in range(0, len(items), size):
        yield items[i : i + size]


def marks(n: int) -> str:
    return ",".join("?" * n)


def keyset(con: sqlite3.Connection, sql: str, size: int = 5000, start=0):
    last = start
    while True:
        rows = con.execute(sql, (last, size)).fetchall()
        if not rows:
            return
        yield rows
        last = rows[-1][0]


def norm_name(name: str | None) -> str:
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(ch for ch in s if not unicodedata.combining(ch)).lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def norm_orcid(raw: str | None) -> str | None:
    if not raw:
        return None
    m = re.search(r"(\d{4}-\d{4}-\d{4}-\d{3}[\dX])", raw.strip().upper())
    return m.group(1) if m else None


def norm_openalex(raw: str | None) -> str | None:
    if not raw:
        return None
    m = re.search(r"(A\d{4,12})$", raw.strip())
    return m.group(1) if m else None


def norm_email(raw: str | None) -> str | None:
    if not raw:
        return None
    e = raw.strip().lower()
    return e if "@" in e else None
