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

**Per-row isolation (PR #37's own seam finding).** The real production
form writes `evidence`/`sources` as plain newline-split string arrays
(`src/app/research-os/workspace/page.tsx`); `docs/PRODUCTION-SCHEMA-
ALIGNMENT.md` first documented the `{source_id, quote, locator}`/
`{label, url, doi}` dict shape instead, so `hte.corpus.production.
_research_os_evidence` now accepts both. That fix narrows the gap but does not close it: any other
malformed row (a bad `status`, a missing timestamp, a future shape
neither branch anticipates) still raises inside `Production.from_dict`,
and a single such row used to poison the whole batch, since `_build`
called `Production.from_dict` over every row with no isolation of its
own. `_build` now catches per row: a row that fails to normalize is
skipped (never marked consumed, so it stays visible for a retry once the
underlying row is fixed) and reported back as a `{"production_id",
"reason"}` entry, rather than aborting every other row in the same
batch. `scripts/campaign_research_os.py` folds that list into
`MANIFEST.json["skipped_rows"]` via `hte.provenance.stamp_manifest`.

**Provenance (`docs/PRIVACY.md`).** `_build` also stamps `production_id`
(always) and `learner_id` (only when the row itself carries one) as
plain instance attributes on every `Source`/`EvidenceItem` it builds, so
`hte.roles`'s provenance-carrying calls and `hte.purge` can trace an
artifact back to the production it came from with no change to
`hte.evidence`/`hte.corpus.production` (see `_stamp_corpus_provenance`'s
own docstring for why this stays a `research_os_outbox`-only
responsibility, and why `learner_id` resolves to `None` on every row
`public.research_os_productions_outbox` carries today).
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


def _stamp_corpus_provenance(corpus: Corpus, rows: list[dict[str, Any]]) -> None:
    """Sets `production_id` (always) and `learner_id` (only when `row`
    itself carries one) as plain instance attributes on every `Source`/
    `EvidenceItem` this batch built. `hte.evidence.EvidenceItem`/`Source`
    carry no such field of their own (out of scope for this change, see
    `docs/PRIVACY.md`); both are plain, unslotted `@dataclass`es, so a
    caller outside `hte.evidence` can still attach one, and `hte.
    provenance.collect`/`collect_from_corpus` read it back with a bare
    `getattr(..., None)`. This keeps the attribution a `research_os_
    outbox`-only responsibility rather than a change to the shared
    corpus/evidence shape every other adapter (`fixtures`, `education_
    atlas`, `quantum_history`, the file-based `production.load`) also
    uses.

    `public.research_os_productions_outbox` never carries `learner_id`
    today (`supabase/migrations/20260910010000_research_os_engine_
    bridge.sql`'s own "learner_id... deliberately left off this table",
    the pseudonymity choice `docs/PRIVACY.md` documents): `row.get(
    "learner_id")` resolves to `None` on every real row, so `learner_id`
    is `None` on every `Source`/`EvidenceItem` this function stamps in
    production. The read stays defensive (rather than hardcoded absent)
    so a future migration, or a test fixture that does carry one, is
    picked up with no code change here; `hte.purge`'s own `--learner`
    flag is documented as a manifest label for this same reason, never a
    second, independently-matchable id.

    `EvidenceItem.id` is always `f"{production.id}-c{claim_index}-e
    {evidence_index}"` (`hte.corpus.production._build_corpus`'s own
    convention): every item whose id starts with `f"{production_id}-c"`
    belongs to that production, regardless of which external `source_id`
    it quotes, so a prefix match against each row's own known id is
    unambiguous with no need to parse anything back out of the id
    string."""
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
    """`rows` normalized and folded into one `Corpus`, isolating a bad row
    (PR #37's own seam finding) rather than letting one `Production.
    from_dict` failure abort the whole batch: `(corpus, good_ids,
    skipped)`, where `good_ids` is every row id that normalized cleanly
    (the only ids safe to `mark_consumed`) and `skipped` is `{
    "production_id", "reason"}` for every row that did not, in row
    order. `corpus` is stamped with `production_id`/`learner_id`
    provenance (`_stamp_corpus_provenance`) before it is returned."""
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
    """`fetch_unconsumed_rows`, folded into one `Corpus` (`_build`, shared
    with `load`): `(good_ids, corpus, skipped)`. `good_ids` names only the
    rows that normalized cleanly, the pair a caller needs to run a
    campaign over these rows and only then decide whether to
    `mark_consumed` them (`scripts/campaign_research_os.py`, ros-12 item
    3): `load()` alone throws away both `good_ids` and `skipped`, so a
    caller that wants either reads through this function instead of
    `load()`. A row `_build` could not normalize is never in `good_ids`
    (so it is never marked consumed, and stays visible for a retry once
    it is fixed) and appears in `skipped` instead."""
    rows = fetch_unconsumed_rows(url, key, table)
    corpus, good_ids, skipped = _build(rows, table, status_min)
    return good_ids, corpus, skipped


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
    read rows were used. A row that fails to normalize is skipped rather
    than raised (`_build`'s own per-row isolation); a caller that needs to
    see which rows those were, and why, calls `fetch_and_build` directly
    instead of this function, which discards `skipped` along with the id
    list.

    Registered as the `"research-os"` corpus in `hte.cli`'s own
    `_CORPUS_LOADERS`, matching `_CORPUS_LOADERS`'s zero-argument
    `Callable[[], Corpus]` contract via this function's own all-default
    arguments."""
    _ids, corpus, _skipped = fetch_and_build(url, key, table, status_min=status_min)
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
    ids, corpus, _skipped = fetch_and_build(url, key, table, status_min=status_min)
    mark_consumed(ids, url, key, table)
    return corpus


__all__ = [
    "DEFAULT_TABLE", "fetch_unconsumed_rows", "mark_consumed", "fetch_and_build", "load", "load_and_consume",
]
