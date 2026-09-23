from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

DEFAULT_RUNS_ROOT = "runs"
DEFAULT_PUBLIC_ROOT = "public/research/hypotheses"
_CACHE_DIR_NAME = "_llm-cache"

def _load_json(path: Path) -> Any:
    return json.loads(path.read_text())

def _write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2, default=str))

def default_cache_dir(runs_root: str | Path) -> Path:
    return Path(runs_root) / _CACHE_DIR_NAME

def _iter_manifests(runs_root: Path) -> Iterator[Path]:
    if not runs_root.exists():
        return
    yield from runs_root.rglob("MANIFEST.json")

def _redaction_variants(targets: set[str]) -> list[str]:
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
    for name, validate_json in (
        ("timeline.json", True), ("self-report.json", True), ("survivors.json", True), ("run.log", False),
    ):
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

def _purge_cache(cache_dir: Path, production_id: str, *, dry_run: bool) -> dict[str, Any]:
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

def _shallow_matches(node: dict[str, Any], source_ids: set[str], quotes: set[str]) -> bool:
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
    if isinstance(node, dict):
        if _shallow_matches(node, source_ids, quotes):
            return True
        return any(_deep_matches(v, source_ids, quotes) for v in node.values())
    if isinstance(node, list):
        return any(_deep_matches(v, source_ids, quotes) for v in node)
    return False

def _filter_lists(node: Any, source_ids: set[str], quotes: set[str]) -> tuple[Any, bool]:
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

def purge(
    production_id: str,
    *,
    learner_id: str | None = None,
    runs_root: str | Path = DEFAULT_RUNS_ROOT,
    cache_dir: str | Path | None = None,
    public_root: str | Path = DEFAULT_PUBLIC_ROOT,
    dry_run: bool = False,
) -> dict[str, Any]:
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
