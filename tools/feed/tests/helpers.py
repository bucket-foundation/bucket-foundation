"""Helpers for tests: build an ephemeral git repo with synthetic commits."""
from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path


def _run(cmd, cwd):
    subprocess.run(cmd, cwd=cwd, check=True, capture_output=True, text=True)


def init_repo(tmp: Path) -> Path:
    _run(["git", "init", "-q", "-b", "main"], cwd=tmp)
    _run(["git", "config", "user.email", "test@example.com"], cwd=tmp)
    _run(["git", "config", "user.name", "Test"], cwd=tmp)
    _run(["git", "config", "commit.gpgsign", "false"], cwd=tmp)
    return tmp


def write(tmp: Path, rel: str, content: str) -> None:
    p = tmp / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def remove(tmp: Path, rel: str) -> None:
    p = tmp / rel
    if p.exists():
        p.unlink()


def move(tmp: Path, src: str, dst: str) -> None:
    s = tmp / src
    d = tmp / dst
    d.parent.mkdir(parents=True, exist_ok=True)
    s.rename(d)


def commit(tmp: Path, msg: str) -> str:
    _run(["git", "add", "-A"], cwd=tmp)
    _run(["git", "commit", "-q", "-m", msg, "--allow-empty"], cwd=tmp)
    sha = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=tmp, check=True,
        capture_output=True, text=True,
    ).stdout.strip()
    return sha


def make_tmp_repo() -> Path:
    return init_repo(Path(tempfile.mkdtemp(prefix="feedtest-")))
