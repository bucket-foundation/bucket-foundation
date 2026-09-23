from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

from . import production
from . import Corpus

DEFAULT_TABLE = "research_os_productions_outbox"

def _resolve_credentials(url: str | None, key: str | None) -> tuple[str, str]:
    resolved_url = url if url is not None else os.environ.get("SUPABASE_URL")
    resolved_key = key if key is not None else os.environ.get("SUPABASE_SERVICE_KEY")
    if not resolved_url or not resolved_key:
        raise RuntimeError(
            "hte.corpus.research_os_outbox needs SUPABASE_URL and SUPABASE_SERVICE_KEY, "
            "from the environment or from explicit url=/key= arguments; at least one is "
            "unset. Neither value is ever printed or logged by this module, so there is "
            "nothing further to inspect here beyond your own environment."
        )
    return resolved_url.rstrip("/"), resolved_key

def fetch_unconsumed_rows(
    url: str | None = None, key: str | None = None, table: str = DEFAULT_TABLE,
) -> list[dict[str, Any]]:
    resolved_url, resolved_key = _resolve_credentials(url, key)
    endpoint = f"{resolved_url}/rest/v1/{table}?select=*&consumed_at=is.null&order=created_at.asc"
    request = urllib.request.Request(
        endpoint,
        headers={"apikey": resolved_key, "Authorization": f"Bearer {resolved_key}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase request to table {table!r} failed: {exc}") from exc

def mark_consumed(
    row_ids: list[str], url: str | None = None, key: str | None = None, table: str = DEFAULT_TABLE,
) -> None:
    ids = list(row_ids)
    if not ids:
        return
    resolved_url, resolved_key = _resolve_credentials(url, key)
    ids_filter = ",".join(ids)
    endpoint = f"{resolved_url}/rest/v1/{table}?id=in.({ids_filter})"
    body = json.dumps({"consumed_at": datetime.now(timezone.utc).isoformat()}).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="PATCH",
        headers={
            "apikey": resolved_key,
            "Authorization": f"Bearer {resolved_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase PATCH to table {table!r} failed: {exc}") from exc

def _stamp_corpus_provenance(corpus: Corpus, rows: list[dict[str, Any]]) -> None:
    for row in rows:
        production_id = row.get("id")
        if not production_id:
            continue
        learner_id = row.get("learner_id") or None
        source = corpus.sources.get(production_id)
        if source is not None:
            source.production_id = production_id
            source.learner_id = learner_id
        prefix = f"{production_id}-c"
        for item in corpus.evidence:
            if item.id.startswith(prefix):
                item.production_id = production_id
                item.learner_id = learner_id

def _build(rows: list[dict[str, Any]], table: str, status_min: str) -> tuple[Corpus, list[str], list[dict[str, str]]]:
    productions: list[production.Production] = []
    good_rows: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []
    for row in rows:
        try:
            productions.append(production.Production.from_dict(row))
        except Exception as exc:  # noqa: BLE001 - isolate one bad row, never poison the batch
            skipped.append({"production_id": str(row.get("id") or "(unknown)"), "reason": str(exc)})
            continue
        good_rows.append(row)

    corpus = production._build_corpus(
        productions,
        status_min=status_min,
        retrieval_run_id="production-adapter-research-os-outbox-ingest",
        source_path_for=lambda p: f"supabase:{table}/{p.id}",
    )
    _stamp_corpus_provenance(corpus, good_rows)
    return corpus, [row["id"] for row in good_rows], skipped

def fetch_and_build(
    url: str | None = None, key: str | None = None, table: str = DEFAULT_TABLE, *, status_min: str = "draft",
) -> tuple[list[str], Corpus, list[dict[str, str]]]:
    rows = fetch_unconsumed_rows(url, key, table)
    corpus, good_ids, skipped = _build(rows, table, status_min)
    return good_ids, corpus, skipped

def load(
    url: str | None = None, key: str | None = None, table: str = DEFAULT_TABLE, *, status_min: str = "draft",
) -> Corpus:
    _ids, corpus, _skipped = fetch_and_build(url, key, table, status_min=status_min)
    return corpus

def load_and_consume(
    url: str | None = None, key: str | None = None, table: str = DEFAULT_TABLE, *, status_min: str = "draft",
) -> Corpus:
    ids, corpus, _skipped = fetch_and_build(url, key, table, status_min=status_min)
    mark_consumed(ids, url, key, table)
    return corpus

__all__ = [
    "DEFAULT_TABLE", "fetch_unconsumed_rows", "mark_consumed", "fetch_and_build", "load", "load_and_consume",
]
