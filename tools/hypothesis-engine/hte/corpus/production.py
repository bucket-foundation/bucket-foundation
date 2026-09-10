"""Ingest K-12 research productions (Research OS's own evidence record,
`learning/research-os/PLAN.md` §5 on the `feat/research-os-k12` branch) into
an `hte.corpus.Corpus`, so a production the engine's belief fusion can
consume does not need a live Research OS deployment to test against.

`docs/RESEARCH-OS-INTEGRATION.md`'s own finding is the reason this module
exists: the production record is the one real bridge between the two
research agendas, and seven of `RESEARCH-QUESTIONS.md`'s forty-nine
questions (19, 21, 22, 24, 25, 26, 27) go from "needs adapter" to runnable
once a production adapter exists. `docs/PRODUCTION-SCHEMA.md` carries the
full JSON shape and the rationale for every mapping decision below; this
module's own docstrings repeat only what a reader needs at the call site.

Two loaders, one shared builder:

- `load(path_or_dir=None, *, status_min="peer-reviewed")` reads production
  JSON files off disk (one production object per file, or a file/list of
  files each holding a JSON array); no network.
- `load_supabase(url=None, key=None, table="productions", *,
  status_min="peer-reviewed")` reads the same row shape over the Supabase
  REST API (`03-data-services.md` section J is where a production lives
  once Research OS ships it), using `SUPABASE_URL` and
  `SUPABASE_SERVICE_KEY` from the environment when `url`/`key` are `None`.
  Neither value is ever printed or logged by this module.

Both funnel into `_build_corpus`, which reads `docs/PRODUCTION-SCHEMA.md`'s
mapping rules: one `Source` per cited source plus one per production; one
`EvidenceItem` per claim's evidence entry, carrying that claim's own slots;
one `GroundTruthEvent` per accepted claim with a dated interval, so a
holdout by review date works the same way `hte.calibrate.
holdout_by_discovery_date` already works for the two shipped corpora; and a
stemma edge whenever a production's own evidence cites another
production's claim directly, so a citation chain of depth two or more
survives into `Source.stemma_parents`.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from ..concepts import Slot, Vocabulary
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..timeline import Interval
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

# `tools/hypothesis-engine/hte/corpus/production.py` -> parents[1] is `hte/`,
# the same one-level-up-from-`corpus/` convention `hte.concepts.
# SEED_VOCAB_PATH` and `hte.corpus.education_atlas.EDUCATION_VOCAB_PATH` use.
PRODUCTION_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-production-seed.json"
DEFAULT_FIXTURES_DIR = Path(__file__).resolve().parents[1] / "data" / "production-fixtures"

# The four review-maturity statuses this adapter treats as an ordered
# ladder; `status_min` filters against this order. `"retracted"` is not on
# the ladder at all (see `_passes_status_min`'s own docstring): a retraction
# withdraws a claim from the record rather than marking it less mature, so
# it is never a valid `status_min` and always bypasses whatever `status_min`
# a caller passed.
_STATUS_ORDER: tuple[str, ...] = ("draft", "peer-reviewed", "teacher-reviewed", "accepted")
_ACCEPTED = "accepted"
_RETRACTED = "retracted"
_ALL_STATUSES: tuple[str, ...] = _STATUS_ORDER + (_RETRACTED,)

# The fixed per-pipeline provenance tag every `EvidenceItem` this module
# builds carries, matching the coarse-category convention every other
# adapter in this package uses (`"fixture"`, `"education-atlas-
# observation"`, `"education-atlas-doc-paragraph"`): one literal per
# ingestion pipeline rather than a per-record free-text field. A production's
# own richer, per-record `provenance` string (which pilot or cohort it claims
# to come from) stays on the raw `Production` object `load_raw` returns
# instead of overwriting this coarser tag; see `docs/PRODUCTION-SCHEMA.md`,
# "Two provenance fields, on purpose."
EVIDENCE_PROVENANCE_TAG = "k12-production"

# `PLAN.md` §5's own claim-stance vocabulary (`supports | refutes |
# extends`), mapped onto `hte.evidence.Stance`'s two-way split: `extends`
# reads as a positive assertion the same way `supports` does, since both
# claims stand behind their own slot reading rather than denying or
# downgrading it.
_STANCE_MAP: dict[str, Stance] = {"supports": Stance.POSITIVE, "extends": Stance.POSITIVE, "refutes": Stance.NEGATIVE}

# The five concept slots a production's own `claims[].slots` block fills
# (`PLAN.md` §5's `slots:` block, the same five names `hte.concepts.Slot`
# gives a placement hypothesis before `TIME`/`RELATION`). TIME is read off
# `claims[].interval` directly, never off a vocabulary lookup, matching
# every other corpus this package ships.
_SLOT_KEYS: tuple[Slot, ...] = (Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM)


def load_vocab() -> Vocabulary:
    """The K-12 production seed vocabulary (`hte/data/vocab-production-
    seed.json`): six consensus ACTOR roles (student, teacher, peer panel,
    Bucket Foundation reviewer, district researcher, research agent), five
    non-consensus ACTOR concepts naming a fringe or contested account of
    what drives a production's trust (a reviewer's own halo
    effect, self-citation inflation, blind trust in the engine's own
    ranking, raw citation count standing in for validity, and payment as
    the real motive), ten ACTIONs, ten OBJECTs (one per runnable question
    named in `docs/RESEARCH-OS-INTEGRATION.md`, plus a couple more for
    combinatorial reach), five PLACEs, and the seven MECHANISM causes the
    fixture productions name, one per question."""
    return Vocabulary.load(PRODUCTION_VOCAB_PATH)


# --------------------------------------------------------------------------
# raw production shape (lossless; `_build_corpus` below is the lossy
# projection onto `hte.corpus.Corpus`)
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Citation:
    """One citation on a claim's evidence entry: a DOI, a URL, or a feed402
    envelope id (`PRODUCTION-SCHEMA.md`'s own three-way citation type)."""
    kind: str
    value: str

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.kind, "value": self.value}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Citation":
        return cls(kind=d["type"], value=d["value"])


@dataclass(frozen=True)
class ClaimEvidence:
    """One evidence entry under a claim: which source it quotes, the
    quote itself, that source's own `hte.evidence` kind and tier, and its
    citations. `source_id` is either an external cited source's own id, or
    another production's id in this same corpus, the second case being
    what `_build_corpus` reads as a stemma edge."""
    source_id: str
    locator: str
    quote: str
    kind: EvidenceKind
    tier: Tier
    citations: tuple[Citation, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id, "locator": self.locator, "quote": self.quote,
            "kind": self.kind.value, "tier": self.tier.value,
            "citations": [c.to_dict() for c in self.citations],
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ClaimEvidence":
        return cls(
            source_id=d["source_id"], locator=d["locator"], quote=d["quote"],
            kind=EvidenceKind(d["kind"]), tier=Tier(d["tier"]),
            citations=tuple(Citation.from_dict(c) for c in d.get("citations", [])),
        )


@dataclass(frozen=True)
class Claim:
    """One claim inside a production: its text, its stance toward whatever
    it argues, its five concept slots (each `None` when the claim names
    nothing for that slot, the same "not asserted" reading `hte.evidence.
    EvidenceItem`'s own docstring gives), a dated `interval` when the claim
    names one, and its evidence entries."""
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
    """One status transition: the status a production (or, in a later
    revision of this schema, a claim) moved to, and the date it did."""
    status: str
    date: str

    def to_dict(self) -> dict[str, Any]:
        return {"status": self.status, "date": self.date}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ReviewHistoryEntry":
        return cls(status=d["status"], date=d["date"])


@dataclass(frozen=True)
class Review:
    """A production's current review status plus its full transition
    history, so "holdout by review date" has a real date to hold out on:
    `date_of("accepted")` is what `_build_corpus` reads as a `GroundTruthEvent`'s
    `discovery_year`, the date the claim entered the citable record, a
    date distinct from when the underlying research happened."""
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
    """One production record, `PRODUCTION-SCHEMA.md`'s own JSON shape
    parsed losslessly: `load_raw`/`load_supabase` hand these back before
    `_build_corpus` projects them onto the coarser `Corpus` shape (folding
    each evidence entry's citations into its `EvidenceSpan.locator`, for
    one; see that function's own docstring for the rest)."""
    id: str
    created_at: str
    author_role: str
    grade_band: str
    school_or_district_id: str
    research_question: str
    claims: tuple[Claim, ...]
    review: Review
    provenance: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id, "created_at": self.created_at, "author_role": self.author_role,
            "grade_band": self.grade_band, "school_or_district_id": self.school_or_district_id,
            "research_question": self.research_question,
            "claims": [c.to_dict() for c in self.claims],
            "review": self.review.to_dict(), "provenance": self.provenance,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Production":
        return cls(
            id=d["id"], created_at=d["created_at"], author_role=d["author_role"],
            grade_band=d["grade_band"], school_or_district_id=d["school_or_district_id"],
            research_question=d["research_question"],
            claims=tuple(Claim.from_dict(c) for c in d.get("claims", [])),
            review=Review.from_dict(d["review"]), provenance=d.get("provenance", ""),
        )


# --------------------------------------------------------------------------
# file loading
# --------------------------------------------------------------------------


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
    """Every production in `path_or_dir`, paired with the path it came
    from (used only for the `RetrievalEnvelope.source_path` `load()`
    writes). A directory is read as one JSON file per production (or per
    batch of productions, if a file holds a JSON array), sorted by
    filename for a deterministic id order; a single file is read the same
    way on its own."""
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
    """Every `Production` under `path_or_dir` (default: `$PRODUCTION_
    FIXTURES_DIR`, else the shipped `hte/data/production-fixtures/`),
    parsed losslessly and returned in filename order. No filtering by
    review status; that is `load`'s own job on the way to a `Corpus`."""
    return [production for production, _path in _iter_production_files(path_or_dir)]


# --------------------------------------------------------------------------
# corpus projection
# --------------------------------------------------------------------------


def _check_status_min(status_min: str) -> None:
    if status_min not in _STATUS_ORDER:
        raise ValueError(
            f"status_min must be one of {_STATUS_ORDER!r}; {_RETRACTED!r} is a terminal "
            f"withdrawal rather than a maturity level, so it can never be a status_min. Got {status_min!r}."
        )


def _passes_status_min(status: str, status_min: str) -> bool:
    """Whether a production at `status` should be ingested at all, given
    `status_min`. A retracted production always passes, regardless of
    `status_min`: `_build_corpus` still ingests its claims (as downgraded,
    `is_absence` evidence, never as ground truth), the same reason
    `fixtures.py`'s own `gt-gamma-downgrade` card stays in that corpus
    rather than being dropped outright, so the engine's belief fusion still
    sees the correction where a withdrawn claim used to stand."""
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


def _validate_slots(vocab: Vocabulary, slots: dict[str, str | None]) -> None:
    for slot in _SLOT_KEYS:
        value = slots.get(slot.value)
        if value is not None and vocab.get(slot, value) is None:
            raise ValueError(f"slot {slot.value!r} value {value!r} is not in the production vocabulary")


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
    """`PRODUCTION-SCHEMA.md`'s own mapping, shared by `load` and
    `load_supabase`.

    - **Sources.** One `Source` per production (kind `TEXTUAL`, `date` its
      own `created_at`), always, regardless of whether that production
      passes `status_min`, so a citation to a filtered-out production
      still resolves to a real node rather than a dangling id. One more
      `Source` per distinct externally-cited `source_id` (kind: the first
      evidence entry that cites it, first-seen wins), created lazily as
      claims are read.
    - **Stemma.** When a claim's own evidence entry names another
      production's id as its `source_id`, that production's own `Source`
      gains this one as a `stemma_parents` entry: a citation chain of
      depth two (`X` cites `Y`, `Y` cites `Z`) is two such edges, `X ->
      Y` and `Y -> Z`, discovered independently as each production's own
      claims are read.
    - **EvidenceItems.** One per claim's evidence entry, `id = f"
      {production.id}-c{claim_index}-e{evidence_index}"`, its slots and
      interval read off the *claim* (an evidence entry carries no slots of
      its own; every entry under one claim inherits that claim's single
      reading), its citations folded into `EvidenceSpan.locator` (`hte.
      evidence.EvidenceItem` has no dedicated citation-identifier field of
      its own; see `PRODUCTION-SCHEMA.md`, "Where citations live"). Only
      productions passing `status_min` (or retracted, which always
      passes) contribute any `EvidenceItem`s at all.
    - **Retraction.** A retracted production's own `EvidenceItem`s carry
      `is_absence=True` and `stance=Stance.NEGATIVE`, overriding whatever
      the claim's own `stance` field says. A claim's own `stance` field
      describes its relation to whatever it argued about; retraction is a
      separate axis, whether the research record still stands behind the
      claim at all, so it overrides at ingestion rather than blending with
      the claim's own declared stance.
    - **Ground truth.** One `GroundTruthEvent` per claim whose production
      is `accepted` and non-retracted, passing `status_min` on its own
      being insufficient: `teacher-reviewed` evidence still lacks the
      human sign-off `PLAN.md` §5 requires before a claim counts as
      settled. Each such claim needs at least one evidence entry and a
      dated `interval`. Its id is shared with that claim's first
      `EvidenceItem` (the same one-id-shared-between-both-records
      convention `hte.corpus.fixtures`/`education_atlas` use); `year` is
      the claim's own `interval.start`; `discovery_year` is the year the
      production's review history recorded `"accepted"`, so a caller
      building `hte.calibrate.holdout_by_discovery_date` against this
      corpus gets a holdout keyed to the record's own review date rather
      than to the claim's own subject date.
    """
    _check_status_min(status_min)
    vocab = load_vocab()
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

    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []

    for production in productions:
        status = production.review.status
        if not _passes_status_min(status, status_min):
            continue
        retracted = status == _RETRACTED
        accepted_date = production.review.date_of(_ACCEPTED)

        for ci, claim in enumerate(production.claims):
            _validate_slots(vocab, claim.slots)
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
                evidence.append(EvidenceItem(
                    id=item_id, kind=ev.kind, tier=ev.tier, source_id=ev.source_id,
                    span=EvidenceSpan(doc_id=ev.source_id, locator=locator, quote=ev.quote, char_start=0, char_end=len(ev.quote)),
                    provenance=EVIDENCE_PROVENANCE_TAG,
                    actor=claim.slots.get("actor"), action=claim.slots.get("action"),
                    object=claim.slots.get("object"), place=claim.slots.get("place"),
                    mechanism=claim.slots.get("mechanism"), interval=claim.interval,
                    is_absence=retracted, stance=stance,
                ))
                if first_evidence_id is None:
                    first_evidence_id = item_id

            if not retracted and status == _ACCEPTED and first_evidence_id is not None and claim.interval is not None and accepted_date is not None:
                ground_truth.append(GroundTruthEvent(
                    id=first_evidence_id, label=_truncate(claim.text), year=claim.interval.start,
                    doc_id=claim.evidence[0].source_id, discovery_year=_year_of(accepted_date),
                ))

    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=vocab)


# --------------------------------------------------------------------------
# public loaders
# --------------------------------------------------------------------------


def load(path_or_dir: str | Path | None = None, *, status_min: str = "peer-reviewed") -> Corpus:
    """Every production under `path_or_dir` (see `load_raw`), projected
    onto a `Corpus` per `_build_corpus`. `status_min` (default
    `"peer-reviewed"`, so a bare `draft` never reaches belief fusion)
    filters which productions contribute evidence or ground truth; a
    retracted production always contributes its own downgraded evidence
    regardless of `status_min`. No network."""
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
    """The same shape as `load`, read over the Supabase REST API
    (`03-data-services.md` section J, the closest infra line this
    adapter's own corpus has to a real deployment) instead of local JSON
    files. `url`/`key` default to the `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`
    environment variables when left `None`; if neither an argument nor
    the matching environment variable is set, this raises `RuntimeError`
    before any request is attempted. Neither value is ever printed,
    logged, or included in a raised error's own message.

    Every row `table` returns is read as one production JSON object (a
    Supabase `jsonb` column round-trips as native JSON already, so no
    further parsing is needed beyond the top-level response body)."""
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
]
