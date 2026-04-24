"""BibTeX emitter."""
from __future__ import annotations
import re
from typing import Iterable

_SAFE = re.compile(r"[^A-Za-z0-9]")
_STOPWORDS = {"the", "a", "an", "of", "on", "in", "for", "and", "to"}


def cite_key(record: dict) -> str:
    authors = record.get("authors") or []
    last = "anon"
    if authors:
        first = authors[0]
        last = (first.get("family") if isinstance(first, dict) else str(first)) or "anon"
    year = str(record.get("year") or "nd")
    title_words = re.findall(r"[A-Za-z]+", record.get("title") or "")
    tw = next((w for w in title_words if w.lower() not in _STOPWORDS), title_words[0] if title_words else "untitled")
    return (_SAFE.sub("", last).lower() + year + _SAFE.sub("", tw).lower()) or "unknown"


def _fmt_authors(authors) -> str:
    parts = []
    for a in authors or []:
        if isinstance(a, dict):
            fam = a.get("family") or ""
            giv = a.get("given") or ""
            parts.append(f"{fam}, {giv}".strip(", "))
        else:
            parts.append(str(a))
    return " and ".join(p for p in parts if p)


def _escape(s: str) -> str:
    if s is None:
        return ""
    return s.replace("{", "\\{").replace("}", "\\}").replace("\\", "\\\\").replace("{\\\\}", "\\")


def to_bibtex(record: dict) -> str:
    key = cite_key(record)
    typ = "article"
    cr = (record.get("_crossref_type") or "").lower()
    if cr.startswith("book"):
        typ = "book"
    elif cr == "proceedings-article":
        typ = "inproceedings"
    fields = {
        "title": record.get("title"),
        "author": _fmt_authors(record.get("authors")),
        "year": record.get("year"),
        "journal": (record.get("venue") or {}).get("name"),
        "publisher": (record.get("venue") or {}).get("publisher"),
        "doi": record.get("doi"),
        "url": record.get("canonical_url"),
    }
    lines = [f"@{typ}{{{key},"]
    for k, v in fields.items():
        if v:
            lines.append(f"  {k} = {{{_escape(str(v))}}},")
    lines.append("}")
    return "\n".join(lines)


def to_bibfile(records: Iterable[dict]) -> str:
    return "\n\n".join(to_bibtex(r) for r in records) + "\n"
