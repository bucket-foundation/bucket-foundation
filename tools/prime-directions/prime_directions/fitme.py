from __future__ import annotations

import argparse
import re
import shutil
import uuid
from pathlib import Path

import numpy as np

from . import advisors

MARKER = ".bucket-fit-marker"
VERSION = "fit-me/1"
HEADING = re.compile(r"^#{1,6}\s*research directions\b", re.I)
ITEM = re.compile(r"^\s*(?:\d+[.)]|[-*])\s+(.*\S)")


class FitError(Exception):
    pass


def _is_within(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def protected_roots(repo: Path) -> list[Path]:
    return [Path("/"), Path.home().resolve(), repo.resolve()]


def prepare_out(out: Path) -> Path:
    if out.is_symlink():
        raise FitError(f"{out} is a symlink; pass a real directory")
    if out.exists():
        if not out.is_dir():
            raise FitError(f"{out} exists and is not a directory")
        if not (out / MARKER).exists() and any(out.iterdir()):
            raise FitError(f"{out} is not empty and was not made by fit-me; pick a new directory")
    out.mkdir(parents=True, exist_ok=True)
    if not (out / MARKER).exists():
        (out / MARKER).write_text(f"{VERSION}\n{uuid.uuid4().hex}\n", encoding="utf-8")
    return out


def forget(out: Path, repo: Path) -> None:
    if out.is_symlink():
        raise FitError(f"{out} is a symlink; refusing to delete")
    target = out.resolve()
    if not (target / MARKER).is_file():
        raise FitError(f"{out} has no {MARKER}; refusing to delete a directory fit-me did not make")
    for root in protected_roots(repo):
        if target == root or _is_within(root, target):
            raise FitError(f"{out} is or contains {root}; refusing to delete")
    shutil.rmtree(target)


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
