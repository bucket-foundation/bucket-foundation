from __future__ import annotations

import os
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]

def data_home() -> Path:
    return Path(os.environ.get("BUCKET_DATA_HOME", Path.home() / ".local/share/bucket-profiles")).resolve()

def user_slug(email: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", email.strip().lower()).strip("-")
    return slug[:64] or "local"

def user_root(email: str) -> Path:
    return data_home() / user_slug(email) / "workbench"

def state_dir() -> Path:
    return data_home() / "workbench"

def allowed_roots(email: str) -> list[Path]:
    return [REPO.resolve(), data_home() / user_slug(email)]

def inside(path: Path, roots: list[Path]) -> bool:
    p = path.resolve()
    return any(p == r or r in p.parents for r in roots)
