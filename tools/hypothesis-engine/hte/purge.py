"""`hte purge --production <id>`: remove or redact every artifact this
engine ever derived from one production id (`docs/PRIVACY.md`).

Four landing spots, each its own pass, none needing another to succeed:

1. **Run directories** under `runs_root` (`hte.runner.run_campaign`'s own
   `MANIFEST.json`/`timeline.json`/`self-report.json`/`run.log`). A run
   whose `MANIFEST.json["provenance"]["production_ids"]` names only this
   one id is deleted whole; a run naming this id alongside others is
   redacted in place: `MANIFEST.json`'s own `by_production[<id>]` entry
   (which carries this production's quotes/labels/learner id in clear
   text) is removed, and every occurrence of those quotes/labels inside
   `timeline.json`/`self-report.json`/`run.log` is blotted out with a
   `[redacted:<id>]` marker, a literal substring match against each
   file's own text rather than a parse into any particular JSON shape
   (`hte.generate`/`hte.link`/`hte.runner` are under review on other
   branches while this module lands, `~/agfarms/bucket-foundation/
   CLAUDE.md`'s own working-tree rules, so this reads their output
   defensively instead of assuming a shape).
2. **The LLM response cache**, `<cache_dir>/index.jsonl` (`hte.llm.
   complete`'s own provenance index) plus the cache files it names:
   every line whose `production_ids` carries this id is dropped, and its
   own `<cache_key>.json` response file is deleted outright.
3. **Bridge exports**, `<runs_root>/**/*.bridge.json` (`hte.
   bridge_export`, PR #36, unmerged as this module lands): a generic
   JSON walk drops any nested entry whose `source_id`/`quote`/`citation`
   matches this production's own aggregated source ids or quotes, kept
   generic because that module's exact field names are not yet on
   `main` to import against.
4. **feed402 envelopes**, `<public_root>/*.json` (`hte.canon_writeback`,
   same PR #36): the same generic walk; a top-level envelope whose own
   `citation`/`source_id` matches this production is deleted outright
   (there is no wrapping list to drop just one entry from), a
   list-wrapped export has the matching entries dropped and the file
   rewritten, kept valid.

Idempotent: a second run over the same production id finds nothing left
in any of the four spots (`MANIFEST.json` no longer names the id, the
index carries no line for it, the run directory is gone, the bridge/
envelope files carry no matching entry), so it reports empty everywhere.
`dry_run=True` computes and reports the same four passes with no write,
delete, or rename anywhere on disk.

An unreadable or corrupted `MANIFEST.json`, bridge export, or envelope
is never treated as "nothing to purge here": since this module cannot
parse it, it cannot rule out that file carrying the purged production's
own text, so the path and the exception's class land in the report's
own `unreadable` list instead. A redaction `_redact_file` refuses
because writing it would corrupt `timeline.json`/`self-report.json`
lands the same way, in `redaction_refused`. Either list non-empty means
the purge cannot be certified complete: `report["complete"]` is `False`
and `hte purge`'s own CLI exits non-zero, since learner text this call
was supposed to remove may remain on disk.

Every artifact here is addressed by **production id**, never a raw
learner id (`docs/PRIVACY.md`, matching `public.research_os_productions_
outbox`'s own pseudonymity choice, "learner_id... deliberately left off
this table"): `--learner` is accepted for the purge report's own label
and cross-checked against whatever learner id (if any) this engine's own
data happens to carry for the id, never as a second, independently
matchable key.
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

DEFAULT_RUNS_ROOT = "runs"
DEFAULT_PUBLIC_ROOT = "public/research/hypotheses"
_CACHE_DIR_NAME = "_llm-cache"


# --------------------------------------------------------------------------
# small IO helpers
# --------------------------------------------------------------------------


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def _write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2, default=str))


def default_cache_dir(runs_root: str | Path) -> Path:
    """`<runs_root>/_llm-cache`, matching `hte.runner.DEFAULT_CONFIG`'s
    own `"cache_dir": None  # defaults to <out_dir>/_llm-cache` (`out_dir`
    is this module's `runs_root`), for a caller that never passed
    `--cache-dir` of its own."""
    return Path(runs_root) / _CACHE_DIR_NAME


def _iter_manifests(runs_root: Path) -> Iterator[Path]:
    if not runs_root.exists():
        return
    yield from runs_root.rglob("MANIFEST.json")


# --------------------------------------------------------------------------
# text redaction (run directories)
# --------------------------------------------------------------------------


def _redaction_variants(targets: set[str]) -> list[str]:
    """Every string in `targets`, plus its JSON-string-escaped form when
    that differs (a quote or label containing a newline or a literal
    quote character appears escaped inside `timeline.json`'s/`self-
    report.json`'s own raw serialized text, which a plain substring
    match against the unescaped string would miss). Sorted longest
    first, so a short label that happens to be a substring of a longer
    quote is consumed as part of that quote's own replacement rather
    than leaving a fragment of the marker inside a not-fully-redacted
    quote."""
    variants: set[str] = set()
    for target in targets:
        if not target:
            continue
        variants.add(target)
        escaped = json.dumps(target)[1:-1]
        if escaped != target:
            variants.add(escaped)
    return sorted(variants, key=len, reverse=True)


def _redact_file(path: Path, variants: list[str], marker: str, *, validate_json: bool, dry_run: bool) -> str:
    """Replaces every occurrence of every string in `variants` inside
    `path`'s own text with `marker`. Returns one of three states:
    `"unchanged"` (`path` does not exist, or none of `variants` appear
    in it), `"redacted"` (something changed and, when `dry_run=False`,
    the write happened), or `"refused"`. `validate_json=True` refuses
    the write when the redacted text no longer parses as JSON: a file
    this module cannot redact without corrupting stays exactly as it
    was rather than becoming invalid. The caller must not fold
    `"refused"` into the same bucket as `"unchanged"`, since "nothing
    matched" and "matched, but the write was refused" mean opposite
    things for whether this production's text still sits in the file."""
    if not path.is_file():
        return "unchanged"
    text = path.read_text()
    changed = False
    for variant in variants:
        if variant and variant in text:
            text = text.replace(variant, marker)
            changed = True
    if not changed:
        return "unchanged"
    if validate_json:
        try:
            json.loads(text)
        except json.JSONDecodeError:
            return "refused"
    if not dry_run:
        path.write_text(text)
    return "redacted"


def _purge_run(manifest_path: Path, production_id: str, *, dry_run: bool) -> dict[str, Any] | None:
    """Deletes or redacts one run directory (`manifest_path`'s own
    parent) for `production_id`. Returns `None` when this run's own
    `MANIFEST.json["provenance"]["production_ids"]` never named
    `production_id` at all (nothing to do here); otherwise a report dict
    naming the action taken. An unreadable `manifest_path` (an
    `OSError`, or `MANIFEST.json` that no longer parses as JSON) is
    never folded into that same `None`, since this module cannot tell
    from an unreadable file whether it names `production_id`: the
    report instead carries `"action": "unreadable"` plus the path and
    the exception's class name, for the caller to surface rather than
    silently skip.

    Deletes the whole run when `production_id` is the only production
    named in this run's own provenance (a single-production run has
    nothing left worth keeping once that one production is gone).
    Redacts in place otherwise: `MANIFEST.json`'s own `provenance`
    block loses `production_id` from every list and its own
    `by_production[production_id]` entry outright (that entry carries
    this production's quotes/labels/learner id in clear text, so
    removing the id from the summary lists alone would leave the actual
    text sitting right next to it); `timeline.json`/`self-report.json`/
    `run.log` each get every occurrence of that production's own quotes
    and slot labels blotted out (`_redact_file`), and a file where
    `_redact_file` refused the write (would corrupt otherwise-valid
    JSON) lands in this report's own `redaction_refused` list rather
    than being dropped from `files_redacted` with no other trace."""
    try:
        manifest = _load_json(manifest_path)
    except (OSError, json.JSONDecodeError) as exc:
        return {
            "run_dir": str(manifest_path.parent), "action": "unreadable",
            "path": str(manifest_path), "error": type(exc).__name__,
        }
    provenance = manifest.get("provenance") or {}
    production_ids = list(provenance.get("production_ids") or [])
    if production_id not in production_ids:
        return None

    run_dir = manifest_path.parent
    other_ids = [p for p in production_ids if p != production_id]

    if not other_ids:
        if not dry_run:
            shutil.rmtree(run_dir)
        return {"run_dir": str(run_dir), "action": "deleted", "dry_run": dry_run}

    by_production = dict(provenance.get("by_production") or {})
    target_info = by_production.get(production_id) or {}
    targets = {*(target_info.get("quotes") or []), *(target_info.get("labels") or [])}
    variants = _redaction_variants(targets)
    marker = f"[redacted:{production_id}]"

    files_redacted = []
    redaction_refused = []
    for name, validate_json in (("timeline.json", True), ("self-report.json", True), ("run.log", False)):
        outcome = _redact_file(run_dir / name, variants, marker, validate_json=validate_json, dry_run=dry_run)
        if outcome == "redacted":
            files_redacted.append(name)
        elif outcome == "refused":
            redaction_refused.append({"run_dir": str(run_dir), "file": name, "reason": "redaction would leave the file invalid JSON"})

    if not dry_run:
        by_production.pop(production_id, None)
        remaining_source_ids: set[str] = set()
        remaining_learner_ids: set[str] = set()
        for info in by_production.values():
            remaining_source_ids.update(info.get("source_ids") or [])
            if info.get("learner_id"):
                remaining_learner_ids.add(info["learner_id"])
        provenance["production_ids"] = other_ids
        provenance["learner_ids"] = sorted(remaining_learner_ids)
        provenance["source_ids"] = sorted(remaining_source_ids)
        provenance["by_production"] = by_production
        manifest["provenance"] = provenance
        _write_json(manifest_path, manifest)
    files_redacted.append("MANIFEST.json")

    return {
        "run_dir": str(run_dir), "action": "redacted", "files_redacted": sorted(set(files_redacted)),
        "redaction_refused": redaction_refused, "dry_run": dry_run,
    }


# --------------------------------------------------------------------------
# LLM cache
# --------------------------------------------------------------------------


def _purge_cache(cache_dir: Path, production_id: str, *, dry_run: bool) -> dict[str, Any]:
    """Every `<cache_dir>/index.jsonl` line whose own `production_ids`
    names `production_id` is dropped, and the response file its own
    `cache_key` names (`<cache_dir>/<cache_key>.json`) is deleted
    outright, even if some other, non-purged production's index line
    also names that same cache key (two productions whose evidence
    happened to produce the identical prompt): `docs/PRIVACY.md`
    documents this as a deliberate simplification, favoring a deleted,
    recomputable cache entry over keeping one byte of a purged
    production's own attributable text on disk. A missing `index.jsonl`
    reports `found_index=False` and changes nothing; that is the normal
    state for a `cache_dir` no evidence-carrying role call has ever
    written to."""
    index_path = cache_dir / "index.jsonl"
    if not index_path.is_file():
        return {"cache_dir": str(cache_dir), "entries_deleted": [], "index_lines_removed": 0, "found_index": False}

    kept_lines: list[str] = []
    deleted_keys: set[str] = set()
    removed = 0
    for line in index_path.read_text().splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            kept_lines.append(line)
            continue
        if production_id in (row.get("production_ids") or []):
            removed += 1
            cache_key = row.get("cache_key")
            if cache_key:
                deleted_keys.add(cache_key)
        else:
            kept_lines.append(line)

    entries_deleted = []
    for cache_key in sorted(deleted_keys):
        cache_file = cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            entries_deleted.append(cache_key)
            if not dry_run:
                cache_file.unlink()

    if not dry_run:
        index_path.write_text("".join(line + "\n" for line in kept_lines))

    return {
        "cache_dir": str(cache_dir), "entries_deleted": entries_deleted,
        "index_lines_removed": removed, "found_index": True,
    }


# --------------------------------------------------------------------------
# bridge exports + feed402 envelopes (generic JSON walk)
# --------------------------------------------------------------------------


def _shallow_matches(node: dict[str, Any], source_ids: set[str], quotes: set[str]) -> bool:
    """Whether `node` *itself* (not anything nested inside it) names one
    of `source_ids` or `quotes`: a direct `source_id`/`sourceId` key, a
    direct `quote`, a `citation` sub-object naming one, or an `evidence.
    {supports,refutes}` list naming one (the shapes the PR #35 seam
    check named for `hte.bridge_export`/`hte.canon_writeback`, neither
    merged yet, so this is a best-effort structural guess rather than an
    import against their real field names)."""
    for key in ("source_id", "sourceId"):
        value = node.get(key)
        if isinstance(value, str) and value in source_ids:
            return True
    quote = node.get("quote")
    if isinstance(quote, str) and quote in quotes:
        return True
    citation = node.get("citation")
    if isinstance(citation, dict):
        for key in ("source_id", "sourceId", "value"):
            value = citation.get(key)
            if isinstance(value, str) and value in source_ids:
                return True
    evidence = node.get("evidence")
    if isinstance(evidence, dict):
        for key in ("supports", "refutes"):
            values = evidence.get(key)
            if isinstance(values, list) and any(isinstance(v, str) and v in source_ids for v in values):
                return True
    return False


def _deep_matches(node: Any, source_ids: set[str], quotes: set[str]) -> bool:
    """`_shallow_matches`, recursively: whether `node` or anything nested
    inside it names one of `source_ids`/`quotes`."""
    if isinstance(node, dict):
        if _shallow_matches(node, source_ids, quotes):
            return True
        return any(_deep_matches(v, source_ids, quotes) for v in node.values())
    if isinstance(node, list):
        return any(_deep_matches(v, source_ids, quotes) for v in node)
    return False


def _filter_lists(node: Any, source_ids: set[str], quotes: set[str]) -> tuple[Any, bool]:
    """`node`, with every list entry `_deep_matches` names dropped
    (recursively, so a `gaps` list naming a dropped hypothesis's own id
    is not itself specially handled, only literal source/quote matches
    are). Dict keys and non-list, non-dict scalars are never dropped,
    only filtered out of a containing list, so the file's own top-level
    shape survives."""
    if isinstance(node, list):
        changed = False
        kept = []
        for item in node:
            if _deep_matches(item, source_ids, quotes):
                changed = True
                continue
            new_item, sub_changed = _filter_lists(item, source_ids, quotes)
            changed = changed or sub_changed
            kept.append(new_item)
        return kept, changed
    if isinstance(node, dict):
        changed = False
        new_dict = {}
        for key, value in node.items():
            new_value, sub_changed = _filter_lists(value, source_ids, quotes)
            changed = changed or sub_changed
            new_dict[key] = new_value
        return new_dict, changed
    return node, False


def _purge_json_file(path: Path, source_ids: set[str], quotes: set[str], *, dry_run: bool) -> dict[str, Any] | None:
    """One bridge-export or envelope file: deleted outright when the
    top-level object itself is the one matching hypothesis/envelope (no
    wrapping list to drop just one entry from), rewritten with matching
    list entries dropped otherwise. Returns `None` when nothing in the
    file matches. An unreadable `path` (an `OSError`, or a file that no
    longer parses as JSON) is left exactly as it was on disk, but is
    never returned as `None`: this module cannot tell, from a file it
    cannot parse, whether that file names the production being purged,
    so it comes back as `{"action": "unreadable", ...}` for the caller
    to surface instead of silently folding it into "no match here"."""
    try:
        data = _load_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        return {"path": str(path), "action": "unreadable", "error": type(exc).__name__}

    if isinstance(data, dict) and _shallow_matches(data, source_ids, quotes):
        if not dry_run:
            path.unlink()
        return {"path": str(path), "action": "deleted"}

    new_data, changed = _filter_lists(data, source_ids, quotes)
    if not changed:
        return None
    if not dry_run:
        _write_json(path, new_data)
    return {"path": str(path), "action": "rewritten"}


# --------------------------------------------------------------------------
# orchestration
# --------------------------------------------------------------------------


def purge(
    production_id: str,
    *,
    learner_id: str | None = None,
    runs_root: str | Path = DEFAULT_RUNS_ROOT,
    cache_dir: str | Path | None = None,
    public_root: str | Path = DEFAULT_PUBLIC_ROOT,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Removes or redacts every artifact this engine derived from
    `production_id`, across the four landing spots this module's own
    header names. `learner_id`, when given, is never used to *find*
    anything (see this module's own header): it is echoed back on the
    report, flagged `learner_id_mismatch` if this run's own engine data
    happens to carry a different learner id for `production_id` (a
    caller-visible inconsistency worth surfacing, never a reason to
    abort). `dry_run=True` computes and returns the identical report with
    no write, delete, or rename anywhere on disk.

    Idempotent: call this again with the same `production_id` and every
    section of the returned report comes back empty, since nothing on
    disk names that id any more.

    `report["unreadable"]` names every `MANIFEST.json`, bridge export,
    or feed402 envelope this call could not parse (`{"path", "error"}`
    per entry); `report["redaction_refused"]` names every
    `timeline.json`/`self-report.json` a redaction would have corrupted
    (`{"run_dir", "file", "reason"}` per entry). Either non-empty means
    `report["complete"]` is `False` and `report["warning"]` explains
    that learner text for `production_id` may remain in one of those
    files: this call never folds "could not check" into "nothing here."

    A real (non-`dry_run`) call also writes `<runs_root>/PURGE-
    <timestamp>.json` (the same report this function returns, plus its
    own `report_path`), the audit record `docs/PRIVACY.md` documents as
    "what was removed or redacted and what could not be found."
    """
    runs_root_path = Path(runs_root)
    resolved_cache_dir = Path(cache_dir) if cache_dir is not None else default_cache_dir(runs_root_path)
    public_root_path = Path(public_root)

    agg_source_ids: set[str] = {production_id}
    agg_quotes: set[str] = set()
    manifest_paths: list[Path] = []
    seen_learner_ids: set[str] = set()
    unreadable: list[dict[str, Any]] = []

    for manifest_path in _iter_manifests(runs_root_path):
        try:
            manifest = _load_json(manifest_path)
        except (OSError, json.JSONDecodeError) as exc:
            # Cannot parse this manifest, so cannot rule out that it names
            # production_id. Flagged, never silently treated as "this run
            # is irrelevant" (the finding this whole function's own
            # `unreadable`/`complete` contract exists to close).
            unreadable.append({"path": str(manifest_path), "error": type(exc).__name__})
            continue
        provenance = manifest.get("provenance") or {}
        if production_id not in (provenance.get("production_ids") or []):
            continue
        manifest_paths.append(manifest_path)
        info = (provenance.get("by_production") or {}).get(production_id) or {}
        agg_source_ids.update(info.get("source_ids") or [])
        agg_quotes.update(info.get("quotes") or [])
        if info.get("learner_id"):
            seen_learner_ids.add(info["learner_id"])

    learner_id_mismatch = bool(learner_id and seen_learner_ids and learner_id not in seen_learner_ids)

    runs_result = []
    redaction_refused: list[dict[str, Any]] = []
    for manifest_path in manifest_paths:
        result = _purge_run(manifest_path, production_id, dry_run=dry_run)
        if result is None:
            continue
        if result.get("action") == "unreadable":
            unreadable.append({k: v for k, v in result.items() if k in ("path", "error")})
            continue
        redaction_refused.extend(result.pop("redaction_refused", []))
        runs_result.append(result)

    cache_result = _purge_cache(resolved_cache_dir, production_id, dry_run=dry_run)

    bridge_result = []
    if runs_root_path.exists():
        for path in sorted(runs_root_path.rglob("*.bridge.json")):
            result = _purge_json_file(path, agg_source_ids, agg_quotes, dry_run=dry_run)
            if result is None:
                continue
            if result.get("action") == "unreadable":
                unreadable.append({k: v for k, v in result.items() if k in ("path", "error")})
            else:
                bridge_result.append(result)

    envelope_result = []
    if public_root_path.exists():
        for path in sorted(public_root_path.rglob("*.json")):
            result = _purge_json_file(path, agg_source_ids, agg_quotes, dry_run=dry_run)
            if result is None:
                continue
            if result.get("action") == "unreadable":
                unreadable.append({k: v for k, v in result.items() if k in ("path", "error")})
            else:
                envelope_result.append(result)

    complete = not unreadable and not redaction_refused

    not_found = []
    if complete and not runs_result and not cache_result["index_lines_removed"] and not bridge_result and not envelope_result:
        not_found.append(
            f"no run, cache entry, bridge export, or envelope under {runs_root_path}, "
            f"{resolved_cache_dir}, or {public_root_path} names production_id={production_id!r}"
        )

    report: dict[str, Any] = {
        "production_id": production_id,
        "learner_id": learner_id,
        "learner_id_mismatch": learner_id_mismatch,
        "dry_run": dry_run,
        "runs": runs_result,
        "cache": cache_result,
        "bridge_exports": bridge_result,
        "envelopes": envelope_result,
        "unreadable": unreadable,
        "redaction_refused": redaction_refused,
        "complete": complete,
        "not_found": not_found,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    if not complete:
        report["warning"] = (
            "purge is incomplete: one or more artifacts under unreadable or "
            "redaction_refused could not be verified clean; learner text for "
            f"production_id={production_id!r} may still remain in them"
        )

    if not dry_run:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        runs_root_path.mkdir(parents=True, exist_ok=True)
        report_path = runs_root_path / f"PURGE-{timestamp}.json"
        _write_json(report_path, report)
        report["report_path"] = str(report_path)

    return report


__all__ = ["purge", "default_cache_dir", "DEFAULT_RUNS_ROOT", "DEFAULT_PUBLIC_ROOT"]
