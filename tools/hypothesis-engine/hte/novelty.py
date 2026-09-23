from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

_TOKEN_RE = re.compile(r"[a-z0-9]+")

NOVELTY_STAGE = "ideation"

_MAX_CHARS_PER_FILE = 4000

def _tokenize(text: str) -> set[str]:
    return set(_TOKEN_RE.findall(text.lower()))

def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    union = len(a | b)
    return (len(a & b) / union) if union else 0.0

def _bucket_for(path: Path) -> str:
    return "engine" if "hypotheses" in path.parts else "canon"

def _iter_corpus_files(canon_root: Path) -> Iterator[Path]:
    if not canon_root.is_dir():
        return
    yield from sorted(canon_root.rglob("*.md"))

@dataclass(frozen=True)
class NoveltyResult:
    score: float
    closest_path: str | None
    closest_similarity: float
    closest_bucket: str | None
    n_compared: int
    stage: str = NOVELTY_STAGE

    def to_dict(self) -> dict:
        return {
            "score": self.score, "closest_path": self.closest_path,
            "closest_similarity": self.closest_similarity, "closest_bucket": self.closest_bucket,
            "n_compared": self.n_compared, "stage": self.stage,
        }

def check_novelty(statement: str, *, repo_root: Path, canon_dirname: str = "bucket-canon") -> NoveltyResult:
    query = _tokenize(statement)
    canon_root = Path(repo_root) / canon_dirname

    best_path: Path | None = None
    best_similarity = 0.0
    best_bucket: str | None = None
    n_compared = 0

    for path in _iter_corpus_files(canon_root):
        n_compared += 1
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")[:_MAX_CHARS_PER_FILE]
        except OSError:
            continue
        similarity = _jaccard(query, _tokenize(text))
        if best_path is None or similarity > best_similarity:
            best_similarity = similarity
            best_path = path
            best_bucket = _bucket_for(path)

    if best_path is None:
        return NoveltyResult(score=1.0, closest_path=None, closest_similarity=0.0, closest_bucket=None, n_compared=n_compared)

    try:
        rel_path = str(best_path.relative_to(repo_root))
    except ValueError:
        rel_path = str(best_path)
    return NoveltyResult(
        score=1.0 - best_similarity, closest_path=rel_path,
        closest_similarity=best_similarity, closest_bucket=best_bucket, n_compared=n_compared,
    )

__all__ = ["NoveltyResult", "check_novelty"]
