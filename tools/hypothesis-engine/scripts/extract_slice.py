#!/usr/bin/env python3
"""A bounded, live, resumable slice of `hte.corpus.sacred_history_texts`'s
pre-filtered, figure-attested passage subset (`docs/SACRED-HISTORY-TEXTS.md`'s
own 7,161-passage floor estimate; this script's own filter below lands on a
different total, `docs/SACRED-HISTORY-TEXTS.md`'s own "Slice one, live"
section names why).

Filter: for each `hte.corpus.sacred_history_texts.TEXT_RECORDS` edition,
`split_passages()` it, then keep a passage iff it names (`\\bLabel\\b`,
case-insensitive) at least one `src/data/sacred-history.json` figure whose
own `traditions` list includes that edition's own mapped tradition (the
same restriction `TextRecord.tradition` already carries: the KJV Bible,
`christianity`, is checked against abraham/david/jesus/moses/noah only,
never krishna or confucius). Ordered by `TEXT_RECORDS`' own tuple order,
then passage order within each edition: a fixed, reproducible total order;
`--offset`/`--limit` slice a contiguous window of it.

Each triple in the window is warmed through `hte.roles.extract` (via
`sacred_history_texts._passage_evidence`, this package's own three-pass
extractor ensemble, haiku per `hte/data/model-policy.json`, opus escalation
on ensemble disagreement) through `hte.parallel.pmap` at `HTE_LLM_WORKERS`
workers, one chunk of `--chunk-size` passages at a time: a rate/spend-limit
abort or any other exception stops after the in-flight chunk rather than
mid-batch, and every already-completed chunk is flushed to `--progress`
before the next one starts. Every passage's own cache entry
(`sacred_history_texts.DEFAULT_CACHE_DIR`, sha256-of-(model,prompt) keyed,
content-addressed) survives a restart regardless of where a run stopped, so
a rerun with the same `--offset`/`--limit` resumes for free through the
cache and pays only for whatever is still missing.

On a clean or partial finish, the passages completed are re-read
back through `ingest_passages(..., replay_only=True)` (all cache hits, no
new calls) to build one `hte.corpus.Corpus` the ordinary way this module
already builds one, and saved to `--out`.

Run (from `tools/hypothesis-engine`):
    HTE_LLM_WORKERS=4 python3 scripts/extract_slice.py --limit 1000 --offset 0
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

_HTE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HTE_ROOT))

from hte import parallel  # noqa: E402
from hte.corpus import sacred_history_texts as sht  # noqa: E402
from hte.corpus.sacred_history import DEFAULT_CORPUS_PATH, load_vocab  # noqa: E402
from hte.llm import stats as llm_stats  # noqa: E402

Triple = tuple[str, str, str]

def attested_subset() -> list[Triple]:
    figures = json.loads(DEFAULT_CORPUS_PATH.read_text())["figures"]
    by_tradition: dict[str, list[dict]] = {}
    for fig in figures:
        for tradition in fig["traditions"]:
            by_tradition.setdefault(tradition, []).append(fig)

    triples: list[Triple] = []
    for record in sht.TEXT_RECORDS:
        raw = record.path.read_text(encoding="utf-8", errors="replace")
        patterns = [
            re.compile(r"\b" + re.escape(fig["label"]) + r"\b", re.IGNORECASE)
            for fig in by_tradition.get(record.tradition, [])
        ]
        for passage_id, passage_text in sht.split_passages(raw):
            if any(p.search(passage_text) for p in patterns):
                triples.append((record.text_id, passage_id, passage_text))
    return triples

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--limit", type=int, default=1000)
    ap.add_argument("--chunk-size", type=int, default=25)
    ap.add_argument("--cache-dir", default=str(sht.DEFAULT_CACHE_DIR))
    ap.add_argument("--out", default=str(_HTE_ROOT / "hte" / "data" / "sacred-history-texts-slice-1-corpus.json"))
    ap.add_argument("--progress", default=str(_HTE_ROOT / "runs" / "sacred-history" / "slice-1" / "progress.jsonl"))
    args = ap.parse_args(argv)

    full = attested_subset()
    window = full[args.offset : args.offset + args.limit]
    print(f"attested_subset_total={len(full)} window={len(window)} offset={args.offset} limit={args.limit}", flush=True)

    progress_path = Path(args.progress)
    progress_path.parent.mkdir(parents=True, exist_ok=True)
    workers = parallel.configure()
    print(f"workers={workers} cache_dir={args.cache_dir}", flush=True)

    def _one(triple: Triple):
        text_id, passage_id, passage_text = triple
        return sht._passage_evidence(text_id, passage_id, passage_text, cache_dir=args.cache_dir, replay_only=False)

    done: list[Triple] = []
    t0 = time.monotonic()
    for start in range(0, len(window), args.chunk_size):
        chunk = window[start : start + args.chunk_size]
        try:
            results = parallel.pmap(_one, chunk, workers=workers)
        except parallel.RateLimitAborted as exc:
            print(f"RATE_LIMIT_ABORTED after {len(done)}/{len(window)} passages: {exc}", flush=True)
            break
        except Exception as exc:  # noqa: BLE001 - report exactly, then stop, per the run's own contract
            print(f"ERROR after {len(done)}/{len(window)} passages: {type(exc).__name__}: {exc}", flush=True)
            break
        with progress_path.open("a") as fh:
            for triple, items in zip(chunk, results):
                fh.write(json.dumps({"text_id": triple[0], "passage_id": triple[1], "n_items": len(items)}) + "\n")
        done.extend(chunk)
        elapsed = time.monotonic() - t0
        print(f"progress {len(done)}/{len(window)} elapsed_s={elapsed:.1f} stats={llm_stats()}", flush=True)

    corpus = sht.ingest_passages(done, cache_dir=args.cache_dir, replay_only=True)
    corpus.save(args.out)
    print(f"DONE done={len(done)}/{len(window)} out={args.out} stats={llm_stats()}", flush=True)
    return 0 if len(done) == len(window) else 2

if __name__ == "__main__":
    raise SystemExit(main())
