from __future__ import annotations

import json
import re
import shutil
import subprocess
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


def _registry(data_root: Path) -> dict:
    f = registry_path(data_root)
    try:
        return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    except ValueError:
        return {}


def _save_registry(data_root: Path, reg: dict) -> None:
    data_root.mkdir(parents=True, exist_ok=True)
    registry_path(data_root).write_text(json.dumps(reg, indent=1), encoding="utf-8")


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
    text = ""
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        if len(reader.pages) > MAX_PAGES:
            raise FitError(f"{path} has {len(reader.pages)} pages; the limit is {MAX_PAGES}")
        parts = []
        for page in reader.pages[:MAX_PAGES]:
            parts.append(page.extract_text() or "")
            if sum(map(len, parts)) > MAX_CHARS:
                break
        text = "\n".join(parts)
    except FitError:
        raise
    except Exception:
        text = ""
    if len(text.strip()) >= MIN_CHARS:
        return text
    try:
        done = subprocess.run(["pdftotext", "-l", str(MAX_PAGES), "--", str(path), "-"], capture_output=True, timeout=MAX_SECONDS, check=False)
        return done.stdout.decode("utf-8", errors="replace")[:MAX_CHARS]
    except (OSError, subprocess.TimeoutExpired):
        return text


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
    reg = _registry(data_root)
    key = str(out.resolve())
    if not (out / MARKER).exists():
        mark = uuid.uuid4().hex
        (out / MARKER).write_text(f"{VERSION}\n{mark}\n", encoding="utf-8")
        reg[key] = mark
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
