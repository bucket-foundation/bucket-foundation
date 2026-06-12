#!/usr/bin/env python3
"""Build the sacred-history corpus search indexes.

  1. SQLite FTS5 (chunks table) → work/index.db
  2. Vector index → work/embeddings/vectors.npy + vectors_meta.json

Adapted from ~/jackkruse/build_index.py (Kruse Index reference
pattern). Idempotent + resumable: if vectors already exist for a
chunk_id, they are reused. Re-run after each ingest cycle.

Local AI stack: ollama nomic-embed-text (primary) → sentence-
transformers MiniLM-L6-v2 (fallback). No network AI calls (Anthropic,
OpenAI, Viatika x402 = OFF).

Rights gate: only chunks marked rights_tier == "A" are embedded.
Tier-B copyrighted content is not even fed to the embedder.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import time

import numpy as np

# Ensure we can import sh_search from same dir.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sh_search import (  # noqa: E402
    DB_PATH,
    META_PATH,
    VEC_PATH,
    EMBED_DIR,
    chunk_text,
    get_embedder,
    iter_corpus_chunks,
)


def build_fts(chunks: list[dict]) -> int:
    """Rebuild FTS5 from scratch (cheap; idempotent)."""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE VIRTUAL TABLE chunks USING fts5(
            chunk_id UNINDEXED,
            source_id UNINDEXED,
            locator UNINDEXED,
            title,
            tradition UNINDEXED,
            rights_tier UNINDEXED,
            body,
            tokenize = 'porter unicode61'
        )
        """
    )
    for c in chunks:
        conn.execute(
            "INSERT INTO chunks(chunk_id, source_id, locator, title, tradition, rights_tier, body) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (c["chunk_id"], c["source_id"], c["locator"], c["title"],
             c["tradition"], c["rights_tier"], c["text"]),
        )
    conn.commit()
    conn.close()
    return len(chunks)


def load_existing_vectors():
    """Resume support — load any prior vectors keyed by chunk_id."""
    if not (os.path.exists(VEC_PATH) and os.path.exists(META_PATH)):
        return {}, None
    try:
        vectors = np.load(VEC_PATH)
        with open(META_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)
        idx = {m["chunk_id"]: vectors[i] for i, m in enumerate(meta)}
        return idx, vectors.shape[1]
    except Exception:
        return {}, None


def build_vectors(chunks: list[dict]) -> tuple[int, int, str]:
    os.makedirs(EMBED_DIR, exist_ok=True)
    existing, prior_dim = load_existing_vectors()
    backend, embedder = get_embedder()
    print(f"  embed backend: {backend}")

    texts_to_embed: list[str] = []
    pending_idx: list[int] = []
    out_meta: list[dict] = []
    out_vecs: list[np.ndarray | None] = []

    for chunk in chunks:
        if chunk["rights_tier"] != "A":
            continue
        cid = chunk["chunk_id"]
        meta_entry = {
            "chunk_id": cid,
            "source_id": chunk["source_id"],
            "locator": chunk["locator"],
            "title": chunk["title"],
            "tradition": chunk["tradition"],
            "rights_tier": chunk["rights_tier"],
            "chunk_preview": chunk["text"][:240] + ("…" if len(chunk["text"]) > 240 else ""),
        }
        if cid in existing:
            out_meta.append(meta_entry)
            out_vecs.append(existing[cid])
        else:
            out_meta.append(meta_entry)
            out_vecs.append(None)
            pending_idx.append(len(out_vecs) - 1)
            texts_to_embed.append(chunk["text"])

    print(f"  reusing {len(out_vecs) - len(pending_idx)} prior vectors")
    print(f"  embedding {len(texts_to_embed)} new chunks…")

    if texts_to_embed:
        t0 = time.time()
        new_vecs = embedder.encode(
            texts_to_embed,
            batch_size=64,
            show_progress_bar=True,
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).astype(np.float32)
        print(f"  encoded in {time.time() - t0:.1f}s")
        for k, idx in enumerate(pending_idx):
            out_vecs[idx] = new_vecs[k]

    # If we had a prior dim mismatch (backend swap), drop the mismatched ones.
    if out_vecs:
        dims = {v.shape[0] for v in out_vecs if v is not None}
        if len(dims) > 1:
            # Backend mix — rebuild from scratch by clearing.
            print(f"  dim mismatch {dims} — rebuilding vectors clean")
            existing.clear()
            return build_vectors(chunks)

    vectors = np.stack([v if v is not None else np.zeros(768, dtype=np.float32) for v in out_vecs]).astype(np.float32)
    np.save(VEC_PATH, vectors)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(out_meta, f)
    dim = vectors.shape[1] if vectors.size else 0
    return len(out_meta), dim, backend


def main():
    os.makedirs(EMBED_DIR, exist_ok=True)
    print("[1/2] collecting corpus chunks (rights-gated to Tier A)…")
    chunks = list(iter_corpus_chunks())
    print(f"  {len(chunks)} chunks across {len({c['source_id'] for c in chunks})} sources")
    by_trad: dict[str, int] = {}
    for c in chunks:
        by_trad[c["tradition"]] = by_trad.get(c["tradition"], 0) + 1
    for t, n in sorted(by_trad.items()):
        print(f"    {t}: {n}")

    print("[2a/2] building FTS5 index…")
    n_docs = build_fts(chunks)
    print(f"  indexed {n_docs} chunks → {DB_PATH}")

    print("[2b/2] building vector index…")
    n_vecs, dim, backend = build_vectors(chunks)
    print(f"  wrote {n_vecs} vectors (dim={dim}, backend={backend}) → {VEC_PATH}")
    print("done.")


if __name__ == "__main__":
    main()
