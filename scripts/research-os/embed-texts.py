#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

MODEL = os.environ.get("EMBED_MODEL", "BAAI/bge-small-en-v1.5")
CACHE = Path(__file__).resolve().parent / "ingest" / "out" / "embeddings-cache.json"

def key(text: str) -> str:
    return hashlib.sha256(f"{MODEL}\n{text}".encode()).hexdigest()[:24]

def main() -> int:
    items = json.load(sys.stdin)
    if not isinstance(items, list):
        print("expected a JSON array of {id, text}", file=sys.stderr)
        return 2
    cache: dict[str, list[float]] = {}
    if CACHE.exists():
        try:
            cache = json.loads(CACHE.read_text())
        except json.JSONDecodeError:
            cache = {}
    todo = [it for it in items if key(it["text"]) not in cache]
    if todo:
        os.environ.setdefault("HF_HUB_OFFLINE", "1")
        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(MODEL, device="cpu")
        vecs = model.encode([it["text"] for it in todo], batch_size=64, normalize_embeddings=True, show_progress_bar=False)
        for it, v in zip(todo, vecs):
            cache[key(it["text"])] = [round(float(x), 6) for x in v]
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE.with_suffix(".tmp")
        tmp.write_text(json.dumps(cache))
        tmp.replace(CACHE)
    json.dump({it["id"]: cache[key(it["text"])] for it in items}, sys.stdout)
    return 0

if __name__ == "__main__":
    sys.exit(main())
