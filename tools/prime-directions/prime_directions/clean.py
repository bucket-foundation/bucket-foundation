from __future__ import annotations

import re
from collections import Counter

from .corpora import Doc


MARKUP = re.compile(
    r"https?://\S+|www\.\S+|\]\([^)]*\)|<[^>\n]{0,400}>|\$\$[^$]{0,2000}\$\$|\$[^$\n]{0,300}[\\^_{}][^$\n]{0,300}\$|\\[a-zA-Z]+"
)


def scrub(text: str) -> str:
    return MARKUP.sub(" ", text)


def line_threshold(n_docs: int, fraction: float = 0.002, floor: int = 5) -> int:
    return max(floor, int(fraction * n_docs))


def strip_boilerplate(
    docs: list[Doc],
    min_chars: int = 2000,
    max_line_docs: int | None = None,
    line_fraction: float = 0.002,
    line_floor: int = 5,
) -> tuple[list[Doc], dict]:
    threshold = max_line_docs if max_line_docs is not None else line_threshold(len(docs), line_fraction, line_floor)
    counts: Counter[str] = Counter()
    split = []
    for doc in docs:
        lines = [line.strip() for line in scrub(doc.text).splitlines()]
        lines = [line for line in lines if line]
        split.append(lines)
        counts.update(set(lines))
    boiler = {line for line, c in counts.items() if c > threshold}
    kept: list[Doc] = []
    removed_lines = 0
    for doc, lines in zip(docs, split):
        body_lines = [line for line in lines if line not in boiler]
        removed_lines += len(lines) - len(body_lines)
        body = "\n".join(body_lines)
        if len(body) >= min_chars:
            kept.append(Doc(doc.id, doc.title, body))
    stats = {
        "docs_in": len(docs),
        "docs_out": len(kept),
        "line_threshold": threshold,
        "boilerplate_lines": len(boiler),
        "lines_removed": removed_lines,
        "min_chars": min_chars,
    }
    return kept, stats
