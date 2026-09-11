"""Provenance collection over a corpus, and the `MANIFEST.json` patch a
run's own campaign script applies with it (`docs/PRIVACY.md`).

`hte.evidence.EvidenceItem`/`Source` carry no `production_id`/`learner_id`
field of their own; `hte.corpus.research_os_outbox._stamp_corpus_
provenance` sets both as plain instance attributes on the objects it
hands back instead (a `research_os_outbox`-only responsibility, so every
other adapter's `EvidenceItem`/`Source` carries neither attribute).
Every function here reads them back through `getattr(..., None)`, so a
corpus this adapter never touched contributes nothing and raises nothing.

`hte.runner.run_campaign` is under review on another branch while this
module lands (`~/agfarms/bucket-foundation/CLAUDE.md`'s own working-tree
rules), so it is not this change's file to edit. `stamp_manifest` patches
`MANIFEST.json` after the fact instead, called from `scripts/
campaign_research_os.py` once `run_campaign` has already written it.
"""
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
    """`{"source_ids", "production_ids", "learner_ids"}`, each sorted and
    deduped, across `items`. `None` when `items` is empty: a role call
    that carries no evidence at all has nothing to attribute, and
    `hte.llm.complete`'s own `provenance=` contract treats `None` as "log
    nothing" rather than one more empty dict.  `source_ids` is populated
    whenever `items` is (`EvidenceItem.source_id` is a required field);
    `production_ids`/`learner_ids` are empty lists for a corpus `hte.
    corpus.research_os_outbox` never touched."""
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
    """The aggregate `collect(corpus.evidence)` shape, plus `by_production`:
    for every production id that appears anywhere in `corpus` (on an
    `EvidenceItem` or a `Source`), the `learner_id` it carries (`None` on
    every real `research_os_outbox` row today, see that module's own
    docstring) and the exact `quotes`/`labels` text tied to it, the
    redaction targets `hte.purge` needs to blot a production's own text
    out of a run's `timeline.json`/`self-report.json`/`run.log` without
    guessing at either file's own JSON shape: it matches by the literal
    text this function names, a substring search over each file's own
    raw content, with no field path of its own to walk."""
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
    """Patches `<run_dir>/MANIFEST.json` in place: a `provenance` block
    (`collect_from_corpus(corpus)`) always, and a `skipped_rows` block
    (PR #37's own per-row isolation, `hte.corpus.research_os_outbox._
    build`'s own `{"production_id", "reason"}` list) when `skipped_rows`
    is given. Returns the patched manifest dict. Raises `FileNotFoundError`
    if `run_dir` carries no `MANIFEST.json` yet (`hte.runner.run_campaign`
    must have already written one); this module never creates that file
    itself, only patches an existing one, since writing it is `hte.
    runner.run_campaign`'s own job."""
    manifest_path = Path(run_dir) / "MANIFEST.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["provenance"] = collect_from_corpus(corpus)
    if skipped_rows is not None:
        manifest["skipped_rows"] = list(skipped_rows)
    manifest_path.write_text(json.dumps(manifest, indent=2, default=str))
    return manifest


__all__ = ["collect", "collect_from_corpus", "stamp_manifest"]
