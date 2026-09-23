from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence

from .corpus import Corpus
from .evidence import EvidenceItem

def _ids_of(obj: Any) -> tuple[str | None, str | None]:
    return getattr(obj, "production_id", None), getattr(obj, "learner_id", None)

def _labels_of(item: EvidenceItem) -> list[str]:
    return [v for v in (item.actor, item.action, item.object, item.place, item.mechanism) if v]

def collect(items: Sequence[EvidenceItem]) -> dict[str, list[str]] | None:
    if not items:
        return None
    source_ids: set[str] = set()
    production_ids: set[str] = set()
    learner_ids: set[str] = set()
    for item in items:
        if item.source_id:
            source_ids.add(item.source_id)
        production_id, learner_id = _ids_of(item)
        if production_id:
            production_ids.add(production_id)
        if learner_id:
            learner_ids.add(learner_id)
    return {
        "source_ids": sorted(source_ids),
        "production_ids": sorted(production_ids),
        "learner_ids": sorted(learner_ids),
    }

def collect_from_corpus(corpus: Corpus) -> dict[str, Any]:
    source_ids: set[str] = set()
    production_ids: set[str] = set()
    learner_ids: set[str] = set()
    by_production: dict[str, dict[str, Any]] = {}

    def _bucket(production_id: str) -> dict[str, Any]:
        return by_production.setdefault(production_id, {
            "learner_id": None, "source_ids": set(), "quotes": set(), "labels": set(),
        })

    for item in corpus.evidence:
        if item.source_id:
            source_ids.add(item.source_id)
        production_id, learner_id = _ids_of(item)
        if production_id:
            production_ids.add(production_id)
            bucket = _bucket(production_id)
            if item.source_id:
                bucket["source_ids"].add(item.source_id)
            if item.span is not None and item.span.quote:
                bucket["quotes"].add(item.span.quote)
            bucket["labels"].update(_labels_of(item))
            if learner_id:
                bucket["learner_id"] = learner_id
        if learner_id:
            learner_ids.add(learner_id)

    for source in corpus.sources.values():
        production_id, learner_id = _ids_of(source)
        if production_id:
            production_ids.add(production_id)
            bucket = _bucket(production_id)
            if learner_id:
                bucket["learner_id"] = learner_id
        if learner_id:
            learner_ids.add(learner_id)

    return {
        "source_ids": sorted(source_ids),
        "production_ids": sorted(production_ids),
        "learner_ids": sorted(learner_ids),
        "by_production": {
            production_id: {
                "learner_id": bucket["learner_id"],
                "source_ids": sorted(bucket["source_ids"]),
                "quotes": sorted(bucket["quotes"]),
                "labels": sorted(bucket["labels"]),
            }
            for production_id, bucket in by_production.items()
        },
    }

def stamp_manifest(
    run_dir: str | Path, corpus: Corpus, *, skipped_rows: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    manifest_path = Path(run_dir) / "MANIFEST.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["provenance"] = collect_from_corpus(corpus)
    if skipped_rows is not None:
        manifest["skipped_rows"] = list(skipped_rows)
    manifest_path.write_text(json.dumps(manifest, indent=2, default=str))
    return manifest

__all__ = ["collect", "collect_from_corpus", "stamp_manifest"]
