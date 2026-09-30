from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

PROTECTED = ("main", "dev", "hte/integration", "ops/integration")
EXIT_REFUSED = 4
FILES = ("manifest.json", "chart.svg")


class PublishRefused(RuntimeError):
    pass


def _git(repo: Path, *args: str) -> str:
    r = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=False)
    if r.returncode != 0:
        raise PublishRefused(f"git {' '.join(args)} failed: {r.stderr.strip()}")
    return r.stdout


def check(repo: Path) -> str:
    branch = _git(repo, "rev-parse", "--abbrev-ref", "HEAD").strip()
    if branch == "HEAD":
        raise PublishRefused("detached HEAD; check out a feature branch")
    if branch in PROTECTED:
        raise PublishRefused(f"refusing to publish on {branch}; use a feature branch and a PR")
    if _git(repo, "status", "--porcelain").strip():
        raise PublishRefused("working tree is dirty; commit or remove changes first")
    return branch


def publish(run_dir: Path, repo: Path) -> Path:
    check(repo)
    manifest = json.loads((run_dir / "manifest.json").read_text())
    dest = repo / "public" / "helix" / manifest["slug"] / manifest["stamp"]
    dest.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        shutil.copy2(run_dir / name, dest / name)
    return dest
