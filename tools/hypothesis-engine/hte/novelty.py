"""Novelty check against the corpus, before a hypothesis is written back
(`PLAN.md` section 10's diversity concern; Si, Yang, and Hashimoto 2024,
doi:10.48550/arxiv.2409.04109, find LLM idea generators repeat themselves
across their own outputs more than human researchers do, the exact risk
a fixed slot vocabulary and a combinatorial generator both carry).

This module compares one candidate hypothesis's own statement against
every markdown file already under `bucket-canon/`, `bucket-canon`'s
foundation-tier dossiers and axioms (`"canon"`) and every previously
written-back hypothesis card (`"engine"`, any file under a `hypotheses/`
directory, `hte.canon_writeback`'s own output shape), and reports a
novelty score plus the single closest match.

Lexical only: token-set Jaccard similarity over lowercased word tokens,
no external model, no network, deterministic. `PLAN.md` section 10 and
this task both call for an embedding comparison when an offline
embedding path exists; as of this module's own writing `hte.llm` reaches
Claude only through the `claude` CLI, `hte/data/model-policy.json` names
no embedding model, and no vector index ships anywhere under `tools/
hypothesis-engine/` (checked: no offline embedding path exists), so this
module falls back to the lexical form the task names as the default. A
caller who wires an offline embedding path in later can add an
`embedding_similarity` alongside `_jaccard` below without changing this
module's own return shape.

`_tokenize` drops no stop words: "the," "a," and similar common tokens
count toward overlap the same as any other word. Two unrelated
statements that happen to share ordinary function words read as having
some overlap, never zero, which is why this module reports a continuous
`score` and a `closest_path` rather than a binary novel/duplicate
verdict, and why the closest match is always worth a human's own read
before the recorded score is trusted on its own.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

_TOKEN_RE = re.compile(r"[a-z0-9]+")

# Read only the first slice of each file: a novelty check compares this
# candidate's own one-sentence statement against another document's own
# title-and-opening material only, and capping the read keeps a
# several-hundred-file corpus scan fast (`bucket-canon/` already carries
# 700+ markdown files as of this module's own writing).
_MAX_CHARS_PER_FILE = 4000


def _tokenize(text: str) -> set[str]:
    return set(_TOKEN_RE.findall(text.lower()))


def _jaccard(a: set[str], b: set[str]) -> float:
    """0.0 for two empty sets or two sets sharing nothing, `|a & b| / |a
    | b|` otherwise. Never raises on an empty set."""
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
    """`score` is a novelty reading, `1.0 - closest_similarity`: `1.0`
    means nothing on disk shares a token with this statement, `0.0` means
    the closest match is a token-for-token duplicate. `closest_path` is
    `None` (and `closest_similarity` `0.0`) only when `bucket-canon/`
    holds no markdown file at all to compare against, the fresh-checkout
    case, never a "found nothing similar" case (that reads as `score`
    near `1.0` with a real `closest_path` instead)."""
    score: float
    closest_path: str | None
    closest_similarity: float
    closest_bucket: str | None  # "canon" | "engine" | None
    n_compared: int

    def to_dict(self) -> dict:
        return {
            "score": self.score, "closest_path": self.closest_path,
            "closest_similarity": self.closest_similarity, "closest_bucket": self.closest_bucket,
            "n_compared": self.n_compared,
        }


def check_novelty(statement: str, *, repo_root: Path, canon_dirname: str = "bucket-canon") -> NoveltyResult:
    """`statement`'s own novelty against every markdown file under
    `<repo_root>/<canon_dirname>/`. Pure and read-only: opens files, never
    writes one. A file it cannot decode as text is skipped instead of
    raising, so one corrupt or binary-named `.md` file never blocks a
    write-back run; that file still counts toward `n_compared`, since
    it was found on disk before the read itself failed."""
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
