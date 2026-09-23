from __future__ import annotations

import datetime as dt
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
else:
    pass

try:
    import yaml  # type: ignore
except ImportError:  # pragma: no cover - PyYAML is in requirements.txt
    yaml = None

try:
    import requests  # type: ignore
except ImportError:  # pragma: no cover - requests is in requirements.txt
    requests = None

REPO_ROOT = Path(__file__).resolve().parents[2]
CANON_ROOT = REPO_ROOT / "bucket-canon"
INGESTION_INDEX = REPO_ROOT / "CANON-INGESTION-INDEX.md"

_PENDING_RE = re.compile(r"^\s*pending\b", re.I)
_REJECTED_RE = re.compile(r"^\s*rejected\b", re.I)
_APPROVED_RE = re.compile(r"^\s*approved\b", re.I)

_RECORD_START_RE = re.compile(r"^- id:\s*(\S.*)$")
_SIGNOFF_LINE_RE = re.compile(r"^(\s*)provenance_signoff:\s*(.*)$")

_ENGINE_SIGNOFF_RE = re.compile(r"Signed off by ([^.\n]+)\.")
_ENGINE_HEADING_RE = re.compile(r"^## Recent additions, (\d{4}-\d{2}-\d{2})\s*$", re.M)
_CLI_EVENT_RE = re.compile(
    r"^- \*\*(approved|rejected)\*\*: `([^`]+)#([^`]+)` \"(.*?)\" by (.+?) on (\d{4}-\d{2}-\d{2})"
    r"(?: \(DOI verified\))?(?: -- reason: (.*))?$",
    re.M,
)

class SignoffError(Exception):
    pass

def _unquote(v: str) -> str:
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
        return v[1:-1]
    return v

def _status_of(value: Optional[str]) -> str:
    if value is None:
        return "ungated"
    if _PENDING_RE.match(value):
        return "pending"
    if _REJECTED_RE.match(value):
        return "rejected"
    if _APPROVED_RE.match(value):
        return "approved"
    return "unknown"

def _tier_of(file: Path, root: Path) -> str:
    try:
        rel = file.relative_to(root)
    except ValueError:
        rel = file
    return "outcome" if "sub-outcomes" in rel.parts else "canon"

def _display_path(file: Path, root: Path) -> str:
    for base in (REPO_ROOT, root.parent):
        try:
            return str(file.relative_to(base))
        except ValueError:
            continue
    return str(file)

def _find_yaml_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    out = [
        p
        for p in sorted(root.glob("**/primary-papers.yaml"))
        if "_archive" not in p.parts
    ]
    return out

def _load_records(file: Path) -> list[dict]:
    if yaml is None:  # pragma: no cover - PyYAML is a hard requirement here
        raise SignoffError("PyYAML is required (pip install -r requirements.txt)")
    doc = yaml.safe_load(file.read_text(encoding="utf-8")) or {}
    recs = doc.get("records") if isinstance(doc, dict) else None
    return [r for r in (recs or []) if isinstance(r, dict)]

@dataclass
class PendingRecord:
    id: str
    title: str
    doi: Optional[str]
    canon_score: Optional[int]
    tier: str
    path: str
    provenance_signoff: Optional[str]
    status: str

def list_records(root: Path = CANON_ROOT, *, statuses: Optional[set[str]] = None) -> list[PendingRecord]:
    want = statuses if statuses is not None else {"pending"}
    out: list[PendingRecord] = []
    for f in _find_yaml_files(root):
        try:
            recs = _load_records(f)
        except Exception:
            continue
        for r in recs:
            sig = r.get("provenance_signoff")
            status = _status_of(sig)
            if status not in want:
                continue
            out.append(
                PendingRecord(
                    id=str(r.get("id") or ""),
                    title=str(r.get("title") or ""),
                    doi=r.get("doi") or None,
                    canon_score=r.get("canon_score"),
                    tier=_tier_of(f, root),
                    path=_display_path(f, root),
                    provenance_signoff=sig,
                    status=status,
                )
            )
    out.sort(key=lambda r: (-(r.canon_score or 0), r.title.lower()))
    return out

def list_pending(root: Path = CANON_ROOT) -> list[PendingRecord]:
    return list_records(root, statuses={"pending"})

@dataclass
class RecordLocation:
    file: Path
    raw: str
    record: dict
    start_line: int
    end_line: int
    root: Path = CANON_ROOT

    @property
    def rel_path(self) -> str:
        return _display_path(self.file, self.root)

def _record_blocks(raw: str) -> list[tuple[int, int, str]]:
    lines = raw.split("\n")
    starts = [(i, m.group(1).strip()) for i, ln in enumerate(lines) if (m := _RECORD_START_RE.match(ln))]
    blocks = []
    for idx, (start, rid) in enumerate(starts):
        end = starts[idx + 1][0] if idx + 1 < len(starts) else len(lines)
        blocks.append((start, end, _unquote(rid)))
    return blocks

def _matches_file_hint(f: Path, hint: str, root: Path) -> bool:
    hint = hint.strip().rstrip("/")
    if not hint:
        return False
    candidates = set()
    for base in (REPO_ROOT, root, Path(".")):
        try:
            rel = str(f.relative_to(base))
        except ValueError:
            continue
        candidates.add(rel)
        if rel.endswith("/primary-papers.yaml"):
            candidates.add(rel[: -len("/primary-papers.yaml")])
    candidates.add(str(f))
    return hint in candidates

def find_record(ref: str, root: Path = CANON_ROOT) -> RecordLocation:
    ref = (ref or "").strip()
    if not ref:
        raise SignoffError("a record path or slug is required")

    file_hint: Optional[str] = None
    id_hint = ref
    m = re.match(r"^(.+?)[#:]([A-Za-z0-9_.\-]+)$", ref)
    if m and ("/" in m.group(1) or m.group(1).endswith(".yaml")):
        file_hint, id_hint = m.group(1), m.group(2)

    files = _find_yaml_files(root)
    if file_hint:
        files = [f for f in files if _matches_file_hint(f, file_hint, root)]
        if not files:
            raise SignoffError(f"no primary-papers.yaml matches path {file_hint!r}")

    id_candidates: list[tuple[Path, str]] = []
    for f in files:
        raw = f.read_text(encoding="utf-8")
        for start, end, rid in _record_blocks(raw):
            if rid == id_hint:
                id_candidates.append((f, rid))
    if len(id_candidates) == 1:
        return _load_location(id_candidates[0][0], id_candidates[0][1], root=root)
    if len(id_candidates) > 1:
        where = ", ".join(f"{f.relative_to(REPO_ROOT)}#{rid}" for f, rid in id_candidates)
        raise SignoffError(f"ambiguous record id {id_hint!r}, matches: {where}")

    if file_hint:
        raise SignoffError(f"no record with id {id_hint!r} under {file_hint!r}")

    path_files = [f for f in _find_yaml_files(root) if _matches_file_hint(f, ref, root)]
    if not path_files:
        raise SignoffError(f"no record found for {ref!r}")
    if len(path_files) > 1:
        where = ", ".join(str(f.relative_to(REPO_ROOT)) for f in path_files)
        raise SignoffError(f"{ref!r} matches more than one file: {where}")
    f = path_files[0]
    raw = f.read_text(encoding="utf-8")
    pending = [rid for _, _, rid in _record_blocks(raw) if _status_of(_record_signoff(raw, rid)) == "pending"]
    if len(pending) == 1:
        return _load_location(f, pending[0], root=root)
    if len(pending) > 1:
        raise SignoffError(f"{ref} has {len(pending)} pending records, specify an id: {', '.join(pending)}")
    raise SignoffError(f"{ref} has no pending record; specify an id explicitly (e.g. {ref}#<id>)")

def _record_signoff(raw: str, record_id: str) -> Optional[str]:
    for start, end, rid in _record_blocks(raw):
        if rid != record_id:
            continue
        lines = raw.split("\n")
        for li in range(start, end):
            m = _SIGNOFF_LINE_RE.match(lines[li])
            if m:
                return _unquote(m.group(2))
        return None
    return None

def _load_location(file: Path, record_id: str, *, root: Path = CANON_ROOT) -> RecordLocation:
    raw = file.read_text(encoding="utf-8")
    for start, end, rid in _record_blocks(raw):
        if rid != record_id:
            continue
        recs = _load_records(file)
        rec = next((r for r in recs if str(r.get("id")) == record_id), None)
        if rec is None:
            raise SignoffError(f"record {record_id!r} found in text but not in parsed YAML in {file}")
        return RecordLocation(file=file, raw=raw, record=rec, start_line=start, end_line=end, root=root)
    raise SignoffError(f"record {record_id!r} not found in {file}")

def _doi_resolves(doi: str, timeout: float = 10.0) -> bool:
    if requests is None:  # pragma: no cover
        raise SignoffError("the requests package is required for DOI verification (or pass --offline)")
    url = doi if doi.startswith("http") else f"https://doi.org/{doi}"
    try:
        resp = requests.head(url, allow_redirects=True, timeout=timeout)
        if resp.status_code in (405, 403):
            resp = requests.get(url, allow_redirects=True, timeout=timeout, stream=True)
        return resp.status_code < 400
    except requests.RequestException:
        return False

def _rewrite_signoff_line(loc: RecordLocation, new_value: str) -> None:
    lines = loc.raw.split("\n")
    written = False
    for li in range(loc.start_line, loc.end_line):
        m = _SIGNOFF_LINE_RE.match(lines[li])
        if m:
            indent = m.group(1)
            lines[li] = f"{indent}provenance_signoff: '{new_value}'"
            written = True
            break
    if not written:
        insert_at = loc.start_line + 1
        lines.insert(insert_at, f"  provenance_signoff: '{new_value}'")
    loc.file.write_text("\n".join(lines), encoding="utf-8")

def _append_index_event(
    index_path: Path,
    *,
    action: str,
    loc: RecordLocation,
    by: str,
    date: str,
    doi_verified: bool = False,
    reason: Optional[str] = None,
) -> None:
    title = str(loc.record.get("title") or "").replace('"', "'")
    suffix = " (DOI verified)" if action == "approved" and doi_verified else ""
    if action == "rejected" and reason:
        suffix = f" -- reason: {reason}"
    line = f'- **{action}**: `{loc.rel_path}#{loc.record.get("id")}` "{title}" by {by} on {date}{suffix}'
    block = f"\n## Canon sign-off, {date}\n\n{line}\n"
    existing = index_path.read_text(encoding="utf-8") if index_path.is_file() else ""
    separator = "" if existing.endswith("\n") else "\n"
    index_path.write_text(existing + separator + block, encoding="utf-8")

def approve(
    ref: str,
    by: str,
    *,
    offline: bool = False,
    root: Path = CANON_ROOT,
    index_path: Path = INGESTION_INDEX,
) -> dict:
    by = (by or "").strip()
    if not by:
        raise SignoffError("approve: --by <name> is required")
    loc = find_record(ref, root=root)
    current = loc.record.get("provenance_signoff")
    status = _status_of(current)
    if status == "approved":
        return {
            "action": "noop",
            "status": "approved",
            "id": loc.record.get("id"),
            "path": loc.rel_path,
            "value": current,
            "message": f"{loc.record.get('id')} is already approved ({current}); no change.",
        }

    doi_verified = False
    if not offline:
        doi = (loc.record.get("doi") or "").strip()
        if not doi:
            raise SignoffError(
                f"approve refused: {loc.record.get('id')} has no DOI to verify (pass --offline to bypass)"
            )
        if not _doi_resolves(doi):
            raise SignoffError(
                f"approve refused: DOI {doi} did not resolve via a HEAD request (pass --offline to bypass)"
            )
        doi_verified = True

    today = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    new_value = f"approved: {by} {today}"
    _rewrite_signoff_line(loc, new_value)
    _append_index_event(index_path, action="approved", loc=loc, by=by, date=today, doi_verified=doi_verified)
    return {
        "action": "approved",
        "status": "approved",
        "id": loc.record.get("id"),
        "path": loc.rel_path,
        "value": new_value,
    }

def reject(
    ref: str,
    by: str,
    reason: str,
    *,
    root: Path = CANON_ROOT,
    index_path: Path = INGESTION_INDEX,
) -> dict:
    by = (by or "").strip()
    reason = (reason or "").strip()
    if not by:
        raise SignoffError("reject: --by <name> is required")
    if not reason:
        raise SignoffError("reject: --reason <text> is required")
    loc = find_record(ref, root=root)
    current = loc.record.get("provenance_signoff")
    status = _status_of(current)
    if status == "rejected":
        return {
            "action": "noop",
            "status": "rejected",
            "id": loc.record.get("id"),
            "path": loc.rel_path,
            "value": current,
            "message": f"{loc.record.get('id')} is already rejected ({current}); no change.",
        }

    today = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    new_value = f"rejected: {by} {today}: {reason}"
    _rewrite_signoff_line(loc, new_value)
    _append_index_event(index_path, action="rejected", loc=loc, by=by, date=today, reason=reason)
    return {
        "action": "rejected",
        "status": "rejected",
        "id": loc.record.get("id"),
        "path": loc.rel_path,
        "value": new_value,
    }

@dataclass
class AuditResult:
    cli_events: list[dict] = field(default_factory=list)
    engine_events: list[dict] = field(default_factory=list)

def audit(index_path: Path = INGESTION_INDEX) -> AuditResult:
    if not index_path.is_file():
        return AuditResult()
    text = index_path.read_text(encoding="utf-8")

    cli_events = []
    for m in _CLI_EVENT_RE.finditer(text):
        action, path, rid, title, by, date, reason = m.groups()
        cli_events.append(
            {
                "action": action,
                "path": path,
                "id": rid,
                "title": title,
                "by": by,
                "date": date,
                "reason": reason,
            }
        )

    heading_positions = [(m.start(), m.group(1)) for m in _ENGINE_HEADING_RE.finditer(text)]
    engine_events = []
    for m in _ENGINE_SIGNOFF_RE.finditer(text):
        signer = m.group(1).strip()
        date = None
        for pos, d in heading_positions:
            if pos <= m.start():
                date = d
            else:
                break
        engine_events.append({"by": signer, "date": date, "context": "hypothesis engine write-back (candidate tier)"})

    return AuditResult(cli_events=cli_events, engine_events=engine_events)
