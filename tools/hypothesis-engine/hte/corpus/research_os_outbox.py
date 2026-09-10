"""`hte.corpus.research_os_outbox`: the outbox reader `learning/research-os/
ENGINE-BRIDGE.md`'s own "Stubs, open items" names as missing (ros-12 item
2): "nothing in `tools/hypothesis-engine` points `load_supabase` at
`research_os_productions_outbox` today."

`public.research_os_productions_outbox` (`bucket-foundation`'s own
`supabase/migrations/20260910010000_research_os_engine_bridge.sql`) already
carries rows `hte.corpus.production.Production.from_dict` reads natively:
its `is_research_os_record`/`normalize_research_os_record` (PR #10)
fingerprint and normalize a raw `graph.productions`-shaped row with no
engine-side change needed. This module adds the one piece PR #10 left out
on purpose, a table-specific *reader* that only ever re-reads a row once:
`consumed_at is null` selects the unread rows, and `mark_consumed` sets
`consumed_at` on every row a caller has finished with.

Reading and committing are two separate calls: they are two different
decisions a caller makes at two different times (`scripts/
campaign_research_os.py`, ros-12 item 3): `load()` fetches and normalizes;
`mark_consumed()` commits. A caller that only wants to look, `hte campaign
run --corpus research-os` for a one-off calibration check, can call `load()`
alone and leave every row unconsumed for the campaign script to pick up
later, the same read repeated is not a bug there, it costs nothing beyond
the reads no campaign run has since claimed.

`consumed_at` needs its own column: `supabase/migrations/
20260910030000_research_os_outbox_consumed_at.sql` adds it, additive and
idempotent (`add column if not exists`), matching every other migration in
this repo.
"""
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
    """Every row of `table` with `consumed_at is null`, oldest first, as
    plain dicts straight off PostgREST (no parsing beyond JSON decode: a
    Supabase `jsonb` column already round-trips as native JSON). Raises
    `RuntimeError` on a missing credential or a failed request, the same
    contract `hte.corpus.production.load_supabase` documents; neither
    credential is ever printed, logged, or included in a raised error's own
    message."""
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
    """Sets `consumed_at` to the current time on every id in `row_ids`.
    Idempotent: re-marking an already-consumed row overwrites its
    `consumed_at` with a later timestamp rather than erroring or
    duplicating anything, so a caller that retries after a partial failure
    never needs to first check which ids already carry one. An empty
    `row_ids` makes no request at all."""
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


def _build(rows: list[dict[str, Any]], table: str, status_min: str) -> Corpus:
    productions = [production.Production.from_dict(row) for row in rows]
    return production._build_corpus(
        productions,
        status_min=status_min,
        retrieval_run_id="production-adapter-research-os-outbox-ingest",
        source_path_for=lambda p: f"supabase:{table}/{p.id}",
    )


def fetch_and_build(
    url: str | None = None, key: str | None = None, table: str = DEFAULT_TABLE, *, status_min: str = "draft",
) -> tuple[list[str], Corpus]:
    """`fetch_unconsumed_rows`, folded into one `Corpus` (`_build`, shared
    with `load`), alongside the row ids that went into it. The pair a
    caller needs to run a campaign over these rows and only then decide
    whether to `mark_consumed` them (`scripts/campaign_research_os.py`,
    ros-12 item 3): `load()` alone throws away the id list `mark_consumed`
    needs, so a caller that wants both reads through this function
    instead of `load()`."""
    rows = fetch_unconsumed_rows(url, key, table)
    return [row["id"] for row in rows], _build(rows, table, status_min)


def load(
    url: str | None = None, key: str | None = None, table: str = DEFAULT_TABLE, *, status_min: str = "draft",
) -> Corpus:
    """Every unconsumed row of `table`, normalized through `hte.corpus.
    production`'s existing normalizer (`Production.from_dict` detects and
    normalizes a `graph.productions`-shaped row on sight, PR #10) and
    folded into one `Corpus`, the same shape `production.load`/
    `load_supabase` return. Consumption is NOT marked here, `load` only
    reads (see this module's own header comment); a caller that goes on to
    use the corpus calls `mark_consumed` itself once it has decided the
    read rows were used.

    Registered as the `"research-os"` corpus in `hte.cli`'s own
    `_CORPUS_LOADERS`, matching `_CORPUS_LOADERS`'s zero-argument
    `Callable[[], Corpus]` contract via this function's own all-default
    arguments."""
    _ids, corpus = fetch_and_build(url, key, table, status_min=status_min)
    return corpus


def load_and_consume(
    url: str | None = None, key: str | None = None, table: str = DEFAULT_TABLE, *, status_min: str = "draft",
) -> Corpus:
    """`load()`, then `mark_consumed()` on every row id `load()` just read,
    in one call: for a caller that wants "read and immediately commit" with
    no further decision in between. Rows are only marked once the corpus
    build above has returned without raising: a malformed row that fails
    `Production.from_dict` never gets marked consumed, so it stays visible
    for a retry after the fixture (or the row) is fixed. `scripts/
    campaign_research_os.py` (ros-12 item 3) uses `fetch_and_build` plus
    its own `mark_consumed` call instead, so consumption commits only once
    its own export has written to disk, holding off past the point the
    corpus alone has loaded."""
    ids, corpus = fetch_and_build(url, key, table, status_min=status_min)
    mark_consumed(ids, url, key, table)
    return corpus


__all__ = [
    "DEFAULT_TABLE", "fetch_unconsumed_rows", "mark_consumed", "fetch_and_build", "load", "load_and_consume",
]
