from __future__ import annotations

import fcntl
import json
import os
import re
import resource
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

import numpy as np

from . import advisors

MARKER = ".bucket-fit-marker"
VERSION = "fit-me/1"
HEADING = re.compile(r"^#{1,6}\s*research directions\b", re.I)
ITEM = re.compile(r"^\s*(?:\d+[.)]|[-*])\s+(.*\S)")


MAX_BYTES = 20 * 1024 * 1024
MAX_PAGES = 40
MAX_SECONDS = 30
MAX_CHARS = 200_000
MIN_CHARS = 200


class FitError(Exception):
    pass


def registry_path(data_root: Path) -> Path:
    return data_root / "fit-me-registry.json"


MAX_MEMORY = 1024 * 1024 * 1024


def _registry(data_root: Path) -> dict:
    f = registry_path(data_root)
    if not f.exists():
        return {}
    try:
        reg = json.loads(f.read_text(encoding="utf-8"))
    except ValueError as exc:
        raise FitError(f"{f} is damaged ({exc}); fix or remove it by hand") from exc
    if not isinstance(reg, dict):
        raise FitError(f"{f} is damaged; fix or remove it by hand")
    return reg


class _Locked:
    def __init__(self, data_root: Path):
        data_root.mkdir(parents=True, exist_ok=True)
        self.path = data_root / "fit-me-registry.lock"

    def __enter__(self):
        self.fh = open(self.path, "a")
        fcntl.flock(self.fh, fcntl.LOCK_EX)
        return self

    def __exit__(self, *exc):
        fcntl.flock(self.fh, fcntl.LOCK_UN)
        self.fh.close()


def _save_registry(data_root: Path, reg: dict) -> None:
    data_root.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=data_root, prefix=".fit-me-registry.", suffix=".tmp")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(reg, fh, indent=1)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, registry_path(data_root))
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def _limits() -> None:
    resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORY, MAX_MEMORY))
    resource.setrlimit(resource.RLIMIT_CPU, (MAX_SECONDS, MAX_SECONDS))


def _bounded(cmd: list[str]) -> tuple[int, str, str]:
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, preexec_fn=_limits)
    try:
        out, err = proc.communicate(timeout=MAX_SECONDS)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        raise FitError(f"reading the PDF took over {MAX_SECONDS} s")
    return proc.returncode, out[: MAX_CHARS * 4].decode("utf-8", errors="replace"), err[:2000].decode("utf-8", errors="replace")


def read_text(path: Path) -> str:
    if path.is_symlink() or not path.is_file():
        raise FitError(f"{path} is not a regular file")
    if path.stat().st_size > MAX_BYTES:
        raise FitError(f"{path} is over {MAX_BYTES // (1024 * 1024)} MB")
    if path.suffix.lower() == ".pdf":
        text = pdf_text(path)
    else:
        text = path.read_text(encoding="utf-8", errors="replace")
    text = text[:MAX_CHARS]
    if len(text.strip()) < MIN_CHARS:
        raise FitError(f"{path} has under {MIN_CHARS} characters of text; if it is a scanned PDF, export it with a text layer or pass Markdown")
    return text


def pdf_text(path: Path) -> str:
    code, out, err = _bounded([sys.executable, "-m", "prime_directions.pdfworker", str(path)])
    if code == 3 and err.startswith("pages:"):
        raise FitError(f"{path} has {err.split(':')[1].strip()} pages; the limit is {MAX_PAGES}")
    if code == 0 and len(out.strip()) >= MIN_CHARS:
        return out[:MAX_CHARS]
    if not shutil.which("pdftotext"):
        raise FitError(f"{path} could not be read with pypdf and pdftotext is not installed; install poppler-utils or pass Markdown")
    code, out2, _ = _bounded(["pdftotext", "-l", str(MAX_PAGES), "--", str(path), "-"])
    return (out2 if len(out2.strip()) > len(out.strip()) else out)[:MAX_CHARS]


def _is_within(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def protected_roots(repo: Path, data_root: Path | None = None) -> list[Path]:
    roots = [Path("/"), Path.home().resolve(), repo.resolve()]
    if data_root is not None:
        roots.append(Path(data_root).resolve())
    return roots


def prepare_out(out: Path, data_root: Path) -> Path:
    if out.is_symlink():
        raise FitError(f"{out} is a symlink; pass a real directory")
    if out.exists():
        if not out.is_dir():
            raise FitError(f"{out} exists and is not a directory")
        if not (out / MARKER).exists() and any(out.iterdir()):
            raise FitError(f"{out} is not empty and was not made by fit-me; pick a new directory")
    target = out.resolve() if out.exists() else out.absolute()
    if _is_within(target, Path(data_root).resolve()):
        raise FitError(f"{out} is inside the tool's data directory; pick another")
    out.mkdir(parents=True, exist_ok=True)
    if not (out / MARKER).exists():
        with _Locked(data_root):
            reg = _registry(data_root)
            mark = uuid.uuid4().hex
            (out / MARKER).write_text(f"{VERSION}\n{mark}\n", encoding="utf-8")
            reg[str(out.resolve())] = mark
            _save_registry(data_root, reg)
    return out


def marker_id(out: Path) -> str:
    lines = (out / MARKER).read_text(encoding="utf-8").splitlines()
    return lines[1].strip() if len(lines) > 1 else ""


def forget(out: Path, repo: Path, data_root: Path) -> None:
    if out.is_symlink():
        raise FitError(f"{out} is a symlink; refusing to delete")
    target = out.resolve()
    if not (target / MARKER).is_file():
        raise FitError(f"{out} has no {MARKER}; refusing to delete a directory fit-me did not make")
    for root in protected_roots(repo, data_root):
        if target == root or _is_within(root, target):
            raise FitError(f"{out} is or contains {root}; refusing to delete")
    with _Locked(data_root):
        reg = _registry(data_root)
        if reg.get(str(target)) != marker_id(target):
            raise FitError(f"{out} has a marker this machine did not record; refusing to delete")
        shutil.rmtree(target)
        reg.pop(str(target), None)
        _save_registry(data_root, reg)


def direction_items(text: str, fallback: int = 6) -> list[str]:
    lines = text.splitlines()
    items, inside = [], False
    for line in lines:
        if HEADING.match(line.strip()):
            inside = True
            continue
        if inside and line.lstrip().startswith("#"):
            break
        if inside:
            m = ITEM.match(line)
            if m:
                items.append(m.group(1))
    if items:
        return items
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if len(p.strip()) >= 120 and not p.lstrip().startswith("#")]
    return sorted(paras, key=len, reverse=True)[:fallback]


def keyword_label(model: advisors.AdvisorModel, text: str, n: int = 3) -> str:
    row = model.embed([text])
    if row.nnz == 0:
        return ""
    order = np.argsort(-row.data)[:n]
    return " ".join(str(model.vocab[row.indices[i]]) for i in order)


def statement_directions(model: advisors.AdvisorModel, text: str) -> list[tuple[str, str]]:
    out, seen = [], set()
    for item in direction_items(text):
        label = keyword_label(model, item)
        if label and label not in seen:
            seen.add(label)
            out.append((label, item))
    return out
