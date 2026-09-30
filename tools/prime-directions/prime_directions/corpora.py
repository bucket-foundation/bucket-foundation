from __future__ import annotations

import json
import os
import re
import sqlite3
import subprocess
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

REGISTRY_PATH = Path(__file__).resolve().parent.parent / "corpora.json"
TOOL_REPO_ROOT = Path(__file__).resolve().parents[3]
HEADING = re.compile(r"^\s*#{1,3}\s+(.+?)\s*#*\s*$")
FRONT_TITLE = re.compile(r"^title:\s*[\"']?(.+?)[\"']?\s*$", re.MULTILINE)

@dataclass(frozen=True)
class Doc:
    id: str
    title: str
    text: str

@dataclass
class CorpusSpec:
    name: str
    kind: str
    path: str
    private: bool = False
    publish: bool = False
    license: str = ""
    description: str = ""
    options: dict = field(default_factory=dict)
    clean: dict = field(default_factory=dict)

class CorpusError(RuntimeError):
    pass

def data_root() -> Path:
    env = os.environ.get("PRIME_DATA_ROOT")
    if env:
        return Path(env).expanduser().resolve()
    try:
        common = subprocess.run(
            ["git", "-C", str(TOOL_REPO_ROOT), "rev-parse", "--path-format=absolute", "--git-common-dir"],
            capture_output=True, text=True, check=True, timeout=10,
        ).stdout.strip()
        return Path(common).parent
    except (OSError, subprocess.SubprocessError):
        return TOOL_REPO_ROOT

def resolve_path(path: str, root: Path | None = None) -> Path:
    p = Path(os.path.expandvars(path)).expanduser()
    if p.is_absolute():
        return p
    return (root or data_root()) / p

def load_registry(path: Path = REGISTRY_PATH) -> dict[str, CorpusSpec]:
    raw = json.loads(path.read_text())
    specs = {}
    for name, entry in raw["corpora"].items():
        entry = dict(entry)
        specs[name] = CorpusSpec(
            name=name,
            kind=entry.pop("kind"),
            path=entry.pop("path"),
            private=bool(entry.pop("private", False)),
            publish=bool(entry.pop("publish", False)),
            license=str(entry.pop("license", "")),
            description=entry.pop("description", ""),
            options=entry.pop("options", {}),
            clean=entry.pop("clean", {}),
        )
    return specs

def load(spec: CorpusSpec, root: Path | None = None) -> list[Doc]:
    loader = LOADERS.get(spec.kind)
    if loader is None:
        raise CorpusError(f"{spec.name}: unknown corpus kind {spec.kind!r}")
    path = resolve_path(spec.path, root)
    if not path.exists():
        raise CorpusError(f"{spec.name}: path {path} does not exist")
    return loader(path, **spec.options)

def load_sqlite(
    path: Path,
    query: str = "select url, title, body, transcript from texts",
    exclude_id_substrings: tuple[str, ...] = (),
    dedupe_titles: bool = True,
    max_chars: int = 20000,
) -> list[Doc]:
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        rows = con.execute(query).fetchall()
    finally:
        con.close()
    docs: list[Doc] = []
    seen: set[str] = set()
    for row in rows:
        doc_id, title = str(row[0]), (row[1] or "").strip()
        if any(s in doc_id for s in exclude_id_substrings):
            continue
        key = title if dedupe_titles else doc_id
        if not title or key in seen:
            continue
        seen.add(key)
        text = "\n".join(str(c) for c in row[2:] if c)[:max_chars]
        docs.append(Doc(doc_id, title, text))
    return docs

def _title_from_text(text: str, fallback: str) -> str:
    head = text[:4000]
    if head.startswith("---"):
        m = FRONT_TITLE.search(head)
        if m:
            return m.group(1).strip()
    for line in head.splitlines():
        m = HEADING.match(line)
        if m:
            return m.group(1).strip()
    return fallback

def pdf_text(path: Path, timeout: float = 120.0, max_chars: int = 200000) -> str:
    try:
        out = subprocess.run(
            ["pdftotext", "-q", "-enc", "UTF-8", str(path), "-"],
            capture_output=True, timeout=timeout, check=False,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return ""
    return out.decode("utf-8", "replace")[:max_chars]

def load_folder(
    path: Path,
    extensions: tuple[str, ...] = (".md", ".txt"),
    pdf: bool = False,
    exclude_dirs: tuple[str, ...] = (),
    max_chars: int = 20000,
    workers: int = 8,
) -> list[Doc]:
    exts = {e.lower() for e in extensions}
    if pdf:
        exts.add(".pdf")
    excluded = set(exclude_dirs)
    files = sorted(
        f for f in path.rglob("*")
        if f.is_file()
        and f.suffix.lower() in exts
        and not any(part in excluded or part.startswith(".") for part in f.relative_to(path).parts[:-1])
    )

    def read(f: Path) -> Doc | None:
        if f.suffix.lower() == ".pdf":
            text = pdf_text(f, max_chars=max_chars)
            title = f.stem
        else:
            text = f.read_text("utf-8", errors="replace")[:max_chars]
            title = _title_from_text(text, f.stem)
        if not text.strip():
            return None
        return Doc(str(f.relative_to(path)), title, text)

    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        return [d for d in pool.map(read, files) if d is not None]

def load_json_items(
    path: Path,
    pattern: str = "*.json",
    list_key: str = "atoms",
    id_key: str = "id",
    title_key: str = "title",
    text_keys: tuple[str, ...] = ("summary", "lesson"),
    max_chars: int = 20000,
) -> list[Doc]:
    docs = []
    for f in sorted(path.glob(pattern)):
        data = json.loads(f.read_text("utf-8"))
        items = data.get(list_key, []) if isinstance(data, dict) else data
        for item in items:
            if not isinstance(item, dict):
                continue
            parts = []
            for key in text_keys:
                value = item.get(key)
                if isinstance(value, str):
                    parts.append(value)
                elif isinstance(value, (list, dict)):
                    parts.append(json.dumps(value, ensure_ascii=False))
            text = "\n".join(parts)[:max_chars]
            if text.strip():
                docs.append(Doc(f"{f.stem}/{item.get(id_key, len(docs))}", str(item.get(title_key, "")), text))
    return docs

LOADERS = {
    "sqlite": load_sqlite,
    "folder": load_folder,
    "json_items": load_json_items,
}
