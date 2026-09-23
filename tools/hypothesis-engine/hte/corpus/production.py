from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .. import vocab_induce
from ..concepts import Slot, Vocabulary
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..timeline import Interval
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

PRODUCTION_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-production-seed.json"
DEFAULT_FIXTURES_DIR = Path(__file__).resolve().parents[1] / "data" / "production-fixtures"

_STATUS_ORDER: tuple[str, ...] = ("draft", "peer-reviewed", "teacher-reviewed", "accepted")
_ACCEPTED = "accepted"
_RETRACTED = "retracted"
_ALL_STATUSES: tuple[str, ...] = _STATUS_ORDER + (_RETRACTED,)

EVIDENCE_PROVENANCE_TAG = "k12-production"

_STANCE_MAP: dict[str, Stance] = {"supports": Stance.POSITIVE, "extends": Stance.POSITIVE, "refutes": Stance.NEGATIVE}

_SLOT_KEYS: tuple[Slot, ...] = (Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM)

RESEARCH_OS_STATUS_MAP: dict[str, str] = {
    "draft": "draft",
    "submitted": "draft",
    "accepted": "accepted",
    "returned": "draft",
}

def is_research_os_record(raw: dict[str, Any]) -> bool:
    return isinstance(raw, dict) and "target_node_id" in raw and "claims" not in raw

def _tier_to_grade_band(tier: float | int) -> str:
    if tier >= 90:
        return "canon"
    if tier <= 5:
        return "3-5"
    if tier <= 8:
        return "6-8"
    if tier <= 10:
        return "9-10"
    return "11-12"

def _citation_from_research_os_source(source: dict[str, Any], idx: int) -> dict[str, str]:
    if source.get("doi"):
        return {"type": "doi", "value": source["doi"]}
    if source.get("url"):
        return {"type": "url", "value": source["url"]}
    return {"type": "url", "value": source.get("label") or f"research-os-source-{idx}"}

_AUTHOR_ROLE_TIER: dict[str, str] = {"student": "T4"}
_DEFAULT_AUTHOR_ROLE_TIER = "T4"

_DOI_RE = re.compile(r"^(?:doi:\s*)?10\.\d{4,9}/\S+$", re.IGNORECASE)
_URL_RE = re.compile(r"^https?://\S+$", re.IGNORECASE)

def _tier_for_author_role(author_role: str) -> str:
    return _AUTHOR_ROLE_TIER.get(author_role, _DEFAULT_AUTHOR_ROLE_TIER)

def _citation_from_source_string(line: str, idx: int) -> tuple[str, dict[str, str]]:
    stripped = line.strip() or f"research-os-source-{idx}"
    if stripped.lower().startswith("doi:"):
        value = stripped[len("doi:"):].strip() or f"research-os-source-{idx}"
        return value, {"type": "doi", "value": value}
    if _DOI_RE.match(stripped):
        return stripped, {"type": "doi", "value": stripped}
    if _URL_RE.match(stripped):
        return stripped, {"type": "url", "value": stripped}
    return stripped, {"type": "url", "value": stripped}

def _string_evidence_entries(evidence_raw: list[str], author_role: str, production_id: str) -> list[dict[str, Any]]:
    return [
        {
            "source_id": f"research-os-evidence-line-{production_id}-{i}",
            "locator": "(uncited)",
            "quote": line.strip(),
            "kind": "textual",
            "tier": _tier_for_author_role(author_role),
            "citations": [],
        }
        for i, line in enumerate(evidence_raw)
        if isinstance(line, str) and line.strip()
    ]

def _string_source_entries(sources_raw: list[str]) -> list[dict[str, Any]]:
    out = []
    for i, line in enumerate(sources_raw):
        if not isinstance(line, str) or not line.strip():
            continue
        source_id, citation = _citation_from_source_string(line, i)
        out.append({
            "source_id": source_id,
            "locator": citation["value"],
            "quote": f"(citation only, no quoted span captured: {citation['value']})",
            "kind": "textual",
            "tier": "T2" if citation["type"] == "doi" else "T4",
            "citations": [citation],
        })
    return out

def _research_os_counter_evidence(
    counter_evidence_raw: list[Any], *, author_role: str = "student", production_id: str = "",
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for i, entry in enumerate(counter_evidence_raw or []):
        if isinstance(entry, str):
            text = entry.strip()
        elif isinstance(entry, dict):
            text = (entry.get("text") or "").strip()
        else:
            continue
        if not text:
            continue
        out.append({
            "source_id": f"research-os-counter-line-{production_id}-{i}",
            "locator": "(uncited)",
            "quote": text,
            "kind": "textual",
            "tier": _tier_for_author_role(author_role),
            "citations": [{"type": "none", "value": "uncited"}],
            "stance": "refutes",
        })
    return out

def _research_os_evidence(
    evidence_raw: list[Any], sources_raw: list[Any], *, author_role: str = "student", production_id: str = "",
) -> list[dict[str, Any]]:
    dict_evidence = [e for e in (evidence_raw or []) if isinstance(e, dict)]
    dict_sources = [s for s in (sources_raw or []) if isinstance(s, dict)]
    string_evidence = [e for e in (evidence_raw or []) if isinstance(e, str)]
    string_sources = [s for s in (sources_raw or []) if isinstance(s, str)]

    out: list[dict[str, Any]] = []

    if dict_evidence or dict_sources:
        citations = [_citation_from_research_os_source(s, i) for i, s in enumerate(dict_sources)]
        tier = "T2" if any(c["type"] == "doi" for c in citations) else "T4"

        if dict_evidence:
            for i, ev in enumerate(dict_evidence):
                source_id = ev.get("source_id") or ev.get("node_id") or f"research-os-quote-{i}"
                out.append({
                    "source_id": source_id,
                    "locator": ev.get("locator") or source_id,
                    "quote": ev.get("quote") or "(no quote recorded)",
                    "kind": "textual",
                    "tier": tier,
                    "citations": citations,
                })
        elif citations:
            out.extend(
                {
                    "source_id": s.get("label") or f"research-os-source-{i}",
                    "locator": s.get("url") or s.get("label") or "",
                    "quote": f"(citation only, no quoted span captured: {s.get('label') or 'untitled source'})",
                    "kind": "textual",
                    "tier": tier,
                    "citations": [cite],
                }
                for i, (s, cite) in enumerate(zip(dict_sources, citations))
            )

    out.extend(_string_evidence_entries(string_evidence, author_role, production_id))
    out.extend(_string_source_entries(string_sources))
    return out

def normalize_research_os_record(raw: dict[str, Any]) -> dict[str, Any]:
    if not raw.get("id"):
        raise ValueError("Research OS production row has no 'id'")
    if not raw.get("target_node_id"):
        raise ValueError(f"Research OS production row {raw.get('id')!r} has no 'target_node_id'")

    node = raw.get("_target_node") or {}
    target_node_id = raw["target_node_id"]
    tier = node.get("tier")
    node_title = node.get("title") or node.get("slug") or target_node_id

    raw_status = raw.get("status") or "draft"
    if raw_status not in RESEARCH_OS_STATUS_MAP:
        raise ValueError(
            f"Research OS production row {raw['id']!r} has an unrecognized status {raw_status!r}, "
            f"not one of {sorted(RESEARCH_OS_STATUS_MAP)}"
        )
    mapped_status = RESEARCH_OS_STATUS_MAP[raw_status]
    moved_at = raw.get("updated_at") or raw.get("created_at")
    if not moved_at:
        raise ValueError(f"Research OS production row {raw['id']!r} has neither 'updated_at' nor 'created_at'")
    created_at = raw.get("created_at") or moved_at
    record_year = _year_of(created_at)

    claim_text = (raw.get("claim") or "").strip()
    evidence_raw = raw.get("evidence") or []
    sources_raw = raw.get("sources") or []
    counter_evidence_raw = raw.get("counter_evidence") or []
    claims: list[dict[str, Any]] = []
    if claim_text or evidence_raw or sources_raw or counter_evidence_raw:
        evidence_entries = _research_os_evidence(evidence_raw, sources_raw, author_role="student", production_id=raw["id"])
        evidence_entries.extend(
            _research_os_counter_evidence(counter_evidence_raw, author_role="student", production_id=raw["id"])
        )
        claims.append({
            "text": claim_text,
            "stance": "supports",
            "slots": {"actor": None, "action": None, "object": target_node_id, "place": None, "mechanism": None},
            "interval": {"start": record_year, "end": record_year},
            "evidence": evidence_entries,
        })

    duplicate_flag = raw.get("duplicate_flag") or {}
    duplicate_of = raw.get("duplicate_of") or (duplicate_flag.get("matchId") if isinstance(duplicate_flag, dict) else None)

    return {
        "id": raw["id"],
        "created_at": created_at,
        "author_role": "student",
        "grade_band": _tier_to_grade_band(tier) if isinstance(tier, (int, float)) else "unknown",
        "school_or_district_id": "research-os-phase-0",
        "research_question": f"Research OS target: {node_title}",
        "claims": claims,
        "review": {"status": mapped_status, "history": [{"status": mapped_status, "date": moved_at}]},
        "provenance": f"research-os-{node.get('branch', 'phase-0')}",
        "duplicate_of": duplicate_of,
    }

def load_vocab() -> Vocabulary:
    return Vocabulary.load(PRODUCTION_VOCAB_PATH)

@dataclass(frozen=True)
class Citation:
    kind: str
    value: str

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.kind, "value": self.value}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Citation":
        return cls(kind=d["type"], value=d["value"])

@dataclass(frozen=True)
class ClaimEvidence:
    source_id: str
    locator: str
    quote: str
    kind: EvidenceKind
    tier: Tier
    citations: tuple[Citation, ...] = ()
    stance: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d = {
            "source_id": self.source_id, "locator": self.locator, "quote": self.quote,
            "kind": self.kind.value, "tier": self.tier.value,
            "citations": [c.to_dict() for c in self.citations],
        }
        if self.stance is not None:
            d["stance"] = self.stance
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ClaimEvidence":
        return cls(
            source_id=d["source_id"], locator=d["locator"], quote=d["quote"],
            kind=EvidenceKind(d["kind"]), tier=Tier(d["tier"]),
            citations=tuple(Citation.from_dict(c) for c in d.get("citations", [])),
            stance=d.get("stance"),
        )

@dataclass(frozen=True)
class Claim:
    text: str
    stance: str
    slots: dict[str, str | None]
    interval: Interval | None
    evidence: tuple[ClaimEvidence, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "text": self.text, "stance": self.stance, "slots": dict(self.slots),
            "interval": self.interval.to_dict() if self.interval is not None else None,
            "evidence": [e.to_dict() for e in self.evidence],
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Claim":
        raw_slots = d.get("slots") or {}
        slots = {slot.value: raw_slots.get(slot.value) for slot in _SLOT_KEYS}
        return cls(
            text=d["text"], stance=d["stance"], slots=slots,
            interval=Interval.from_dict(d["interval"]) if d.get("interval") is not None else None,
            evidence=tuple(ClaimEvidence.from_dict(e) for e in d.get("evidence", [])),
        )

@dataclass(frozen=True)
class ReviewHistoryEntry:
    status: str
    date: str

    def to_dict(self) -> dict[str, Any]:
        return {"status": self.status, "date": self.date}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ReviewHistoryEntry":
        return cls(status=d["status"], date=d["date"])

@dataclass(frozen=True)
class Review:
    status: str
    history: tuple[ReviewHistoryEntry, ...]

    def date_of(self, status: str) -> str | None:
        for entry in self.history:
            if entry.status == status:
                return entry.date
        return None

    def to_dict(self) -> dict[str, Any]:
        return {"status": self.status, "history": [h.to_dict() for h in self.history]}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Review":
        return cls(status=d["status"], history=tuple(ReviewHistoryEntry.from_dict(h) for h in d.get("history", [])))

@dataclass(frozen=True)
class Production:
    id: str
    created_at: str
    author_role: str
    grade_band: str
    school_or_district_id: str
    research_question: str
    claims: tuple[Claim, ...]
    review: Review
    provenance: str
    duplicate_of: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d = {
            "id": self.id, "created_at": self.created_at, "author_role": self.author_role,
            "grade_band": self.grade_band, "school_or_district_id": self.school_or_district_id,
            "research_question": self.research_question,
            "claims": [c.to_dict() for c in self.claims],
            "review": self.review.to_dict(), "provenance": self.provenance,
        }
        if self.duplicate_of is not None:
            d["duplicate_of"] = self.duplicate_of
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Production":
        if is_research_os_record(d):
            d = normalize_research_os_record(d)
        return cls(
            id=d["id"], created_at=d["created_at"], author_role=d["author_role"],
            grade_band=d["grade_band"], school_or_district_id=d["school_or_district_id"],
            research_question=d["research_question"],
            claims=tuple(Claim.from_dict(c) for c in d.get("claims", [])),
            review=Review.from_dict(d["review"]), provenance=d.get("provenance", ""),
            duplicate_of=d.get("duplicate_of"),
        )

def _resolve_fixtures_dir(path_or_dir: str | Path | None) -> Path:
    if path_or_dir is not None:
        return Path(path_or_dir)
    env = os.environ.get("PRODUCTION_FIXTURES_DIR")
    if env:
        return Path(env)
    return DEFAULT_FIXTURES_DIR

def _rows_from_json(raw: Any) -> list[dict[str, Any]]:
    return raw if isinstance(raw, list) else [raw]

def _iter_production_files(path_or_dir: str | Path | None) -> list[tuple[Production, str]]:
    target = _resolve_fixtures_dir(path_or_dir)
    if target.is_dir():
        paths = sorted(target.glob("*.json"))
        if not paths:
            raise FileNotFoundError(f"no production JSON files found under {target}")
        out: list[tuple[Production, str]] = []
        for path in paths:
            for row in _rows_from_json(json.loads(path.read_text())):
                out.append((Production.from_dict(row), str(path)))
        return out
    if target.is_file():
        return [(Production.from_dict(row), str(target)) for row in _rows_from_json(json.loads(target.read_text()))]
    raise FileNotFoundError(f"production fixtures path not found: {target}")

def load_raw(path_or_dir: str | Path | None = None) -> list[Production]:
    return [production for production, _path in _iter_production_files(path_or_dir)]

def _check_status_min(status_min: str) -> None:
    if status_min not in _STATUS_ORDER:
        raise ValueError(
            f"status_min must be one of {_STATUS_ORDER!r}; {_RETRACTED!r} is a terminal "
            f"withdrawal rather than a maturity level, so it can never be a status_min. Got {status_min!r}."
        )

def _passes_status_min(status: str, status_min: str) -> bool:
    if status == _RETRACTED:
        return True
    if status not in _STATUS_ORDER:
        raise ValueError(f"unknown review status {status!r}, expected one of {_ALL_STATUSES!r}")
    return _STATUS_ORDER.index(status) >= _STATUS_ORDER.index(status_min)

def _stance_to_hte(stance: str) -> Stance:
    try:
        return _STANCE_MAP[stance]
    except KeyError as exc:
        raise ValueError(f"unknown claim stance {stance!r}, expected one of {sorted(_STANCE_MAP)!r}") from exc

def _truncate(text: str, limit: int = 140) -> str:
    return text if len(text) <= limit else text[: limit - 3].rstrip() + "..."

def _year_of(date_str: str) -> int:
    return datetime.fromisoformat(date_str).year

def _build_corpus(
    productions: list[Production],
    *,
    status_min: str,
    retrieval_run_id: str,
    source_path_for: Callable[[Production], str],
) -> Corpus:
    _check_status_min(status_min)
    seed_vocab = load_vocab()
    production_ids = {p.id for p in productions}
    sources: dict[str, Source] = {}
    provenance: list[RetrievalEnvelope] = []
    fetched_at = datetime.now(timezone.utc).isoformat()

    for production in productions:
        sources[production.id] = Source(id=production.id, kind=EvidenceKind.TEXTUAL, date=production.created_at, stemma_parents=[])
        provenance.append(RetrievalEnvelope(
            retrieval_run_id=retrieval_run_id, doc_id=production.id, source_path=source_path_for(production),
            fetched_at=fetched_at, fixture=True, citation_count=len(production.claims), lineage_count=0,
        ))
        duplicate_of = production.duplicate_of
        if duplicate_of and duplicate_of != production.id and duplicate_of in production_ids:
            sources[production.id].stemma_parents.append(duplicate_of)

    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []

    for production in productions:
        status = production.review.status
        if not _passes_status_min(status, status_min):
            continue
        retracted = status == _RETRACTED
        accepted_date = production.review.date_of(_ACCEPTED)

        for ci, claim in enumerate(production.claims):
            stance = Stance.NEGATIVE if retracted else _stance_to_hte(claim.stance)
            first_evidence_id: str | None = None

            for ei, ev in enumerate(claim.evidence):
                if ev.source_id in production_ids:
                    parent = sources[production.id]
                    if ev.source_id not in parent.stemma_parents:
                        parent.stemma_parents.append(ev.source_id)
                elif ev.source_id not in sources:
                    sources[ev.source_id] = Source(id=ev.source_id, kind=ev.kind, date=None, stemma_parents=[])

                cite_suffix = "; ".join(f"{c.kind}:{c.value}" for c in ev.citations)
                locator = f"{ev.locator} (cite: {cite_suffix})" if cite_suffix else ev.locator
                item_id = f"{production.id}-c{ci}-e{ei}"
                entry_stance = stance if retracted else (_stance_to_hte(ev.stance) if ev.stance else stance)
                evidence.append(EvidenceItem(
                    id=item_id, kind=ev.kind, tier=ev.tier, source_id=ev.source_id,
                    span=EvidenceSpan(doc_id=ev.source_id, locator=locator, quote=ev.quote, char_start=0, char_end=len(ev.quote), doc_length=len(ev.quote)),
                    provenance=EVIDENCE_PROVENANCE_TAG,
                    actor=claim.slots.get("actor"), action=claim.slots.get("action"),
                    object=claim.slots.get("object"), place=claim.slots.get("place"),
                    mechanism=claim.slots.get("mechanism"), interval=claim.interval,
                    is_absence=retracted, stance=entry_stance,
                ))
                if first_evidence_id is None:
                    first_evidence_id = item_id

            if not retracted and status == _ACCEPTED and first_evidence_id is not None and claim.interval is not None and accepted_date is not None:
                ground_truth.append(GroundTruthEvent(
                    id=first_evidence_id, label=_truncate(claim.text), year=claim.interval.start,
                    doc_id=claim.evidence[0].source_id, discovery_year=_year_of(accepted_date),
                ))

    corpus = Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=seed_vocab)
    corpus.vocab = vocab_induce.induce(corpus, seed_vocab=seed_vocab)
    return corpus

def load(path_or_dir: str | Path | None = None, *, status_min: str = "peer-reviewed") -> Corpus:
    pairs = _iter_production_files(path_or_dir)
    productions = [p for p, _path in pairs]
    path_by_id = {p.id: path for p, path in pairs}
    return _build_corpus(
        productions, status_min=status_min, retrieval_run_id="production-adapter-file-ingest",
        source_path_for=lambda p: path_by_id[p.id],
    )

def load_supabase(
    url: str | None = None,
    key: str | None = None,
    table: str = "productions",
    *,
    status_min: str = "peer-reviewed",
) -> Corpus:
    resolved_url = url if url is not None else os.environ.get("SUPABASE_URL")
    resolved_key = key if key is not None else os.environ.get("SUPABASE_SERVICE_KEY")
    if not resolved_url or not resolved_key:
        raise RuntimeError(
            "load_supabase() needs SUPABASE_URL and SUPABASE_SERVICE_KEY, from the "
            "environment or from explicit url=/key= arguments; at least one is unset. "
            "Neither value is ever printed or logged by this module, so there is nothing "
            "further to inspect here beyond your own environment."
        )
    endpoint = f"{resolved_url.rstrip('/')}/rest/v1/{table}?select=*"
    request = urllib.request.Request(
        endpoint,
        headers={"apikey": resolved_key, "Authorization": f"Bearer {resolved_key}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            rows = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase request to table {table!r} failed: {exc}") from exc

    productions = [Production.from_dict(row) for row in rows]
    return _build_corpus(
        productions, status_min=status_min, retrieval_run_id="production-adapter-supabase-ingest",
        source_path_for=lambda p: f"supabase:{table}/{p.id}",
    )

__all__ = [
    "Citation", "ClaimEvidence", "Claim", "ReviewHistoryEntry", "Review", "Production",
    "load_vocab", "load_raw", "load", "load_supabase",
    "PRODUCTION_VOCAB_PATH", "DEFAULT_FIXTURES_DIR", "EVIDENCE_PROVENANCE_TAG",
    "is_research_os_record", "normalize_research_os_record", "RESEARCH_OS_STATUS_MAP",
]
