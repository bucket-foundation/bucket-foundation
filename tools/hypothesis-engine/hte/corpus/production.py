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
import re
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


# --------------------------------------------------------------------------
# Research OS native-shape adapter (bkt-hte, `docs/PRODUCTION-SCHEMA-
# ALIGNMENT.md` carries the full field-by-field table and the rationale for
# every default below; this section's own docstrings repeat only what a
# reader needs at the call site).
#
# `graph.productions` (bucket-foundation PR #6,
# `supabase/migrations/20260910000000_research_os_graph.sql` +
# `src/lib/research-os/types.ts`) is a flatter, single-claim record with no
# analog to this module's `claims[].slots`/`stance`/`interval`, no
# `grade_band`/`school_or_district_id`/`research_question`, and a four-value
# `status` enum that does not line up with `_STATUS_ORDER`. Rather than push
# every caller through a hand-written conversion step, `Production.from_dict`
# detects the shape and normalizes it onto this module's own JSON shape
# before doing anything else, so `load`, `load_supabase`, and
# `hte.api.hypothesize` all accept a `graph.productions` row natively.
# --------------------------------------------------------------------------

# Research OS's four `graph.productions.status` values, mapped onto this
# module's own five-value ladder. `"submitted"` and `"returned"` both read
# as `"draft"`: Phase 0 ships no teacher or peer-review layer
# (`RESEARCH-OS-INTEGRATION.md`'s own "What the engine does not touch"), so
# a learner clicking submit, or a hold sent back for revision, is not the
# independent review `_STATUS_ORDER`'s `"peer-reviewed"` rung represents.
# Mapping either to `"peer-reviewed"` would let unreviewed student work
# reach belief fusion under this adapter's own default `status_min`, exactly
# what `PRODUCTION-SCHEMA.md`'s "an unreviewed record has not yet cleared
# the review... requires" default excludes for the shipped fixture shape.
RESEARCH_OS_STATUS_MAP: dict[str, str] = {
    "draft": "draft",
    "submitted": "draft",
    "accepted": "accepted",
    "returned": "draft",
}


def is_research_os_record(raw: dict[str, Any]) -> bool:
    """Whether `raw` is a `graph.productions` row (Research OS's own shape)
    rather than this module's own `PRODUCTION-SCHEMA.md` shape. Fingerprint:
    a Research OS row always carries `target_node_id` and never carries
    `claims`; a `PRODUCTION-SCHEMA.md` record is the reverse. Both fields
    are required on their own side (`_validate_production_record` requires
    `claims`' absence to mean nothing here; the SQL migration's `not null`
    on `target_node_id` means the reverse), so the fingerprint never
    misclassifies a well-formed record of either shape."""
    return isinstance(raw, dict) and "target_node_id" in raw and "claims" not in raw


def _tier_to_grade_band(tier: float | int) -> str:
    """`graph.nodes.tier`'s own approximate-US-grade-level proxy (the
    migration's own column comment), bucketed into `PRODUCTION-SCHEMA.md`'s
    free-text grade bands (the shipped fixtures use `"6-8"`, `"9-10"`,
    `"11-12"`). `tier >= 90` is the migration's own canon-bridge sentinel,
    "adult, canon tier, outside any K-12 grade band"; read here as
    `"canon"` rather than forced into a K-12 band it explicitly is not."""
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


# The production-form's own author role, `normalize_research_os_record`'s
# fixed `"student"` (PR #6 has no other author yet). Keyed by role rather
# than a bare constant so a later, non-student author (a teacher-authored
# production, Phase 1) has a place to plug in its own default tier without
# another shape change to `_string_evidence_entries` below.
_AUTHOR_ROLE_TIER: dict[str, str] = {"student": "T4"}
_DEFAULT_AUTHOR_ROLE_TIER = "T4"

_DOI_RE = re.compile(r"^(?:doi:\s*)?10\.\d{4,9}/\S+$", re.IGNORECASE)
_URL_RE = re.compile(r"^https?://\S+$", re.IGNORECASE)


def _tier_for_author_role(author_role: str) -> str:
    return _AUTHOR_ROLE_TIER.get(author_role, _DEFAULT_AUTHOR_ROLE_TIER)


def _citation_from_source_string(line: str, idx: int) -> tuple[str, dict[str, str]]:
    """One plain `sources[]` text line (`src/app/research-os/workspace/
    page.tsx`'s own `sources.split("\\n")`), parsed into `(source_id,
    citation)`: a DOI-shaped line (`doi:10.x/...` or bare `10.x/...`)
    becomes `{"type": "doi", ...}`, an `http(s)://` line becomes
    `{"type": "url", ...}`, anything else is read as a plain label,
    `{"type": "url", "value": <label>}` (`_citation_from_research_os_source`'s
    own no-doi-no-url fallback, applied to a bare string instead of a
    `{label, url?, doi?}` dict). `source_id` is the parsed value itself
    (the DOI, the URL, or the label), the id `_build_corpus` (`hte.corpus.
    production`) turns into a real `Source` the first time any evidence
    entry names it, exactly the mechanism a `sources` line needs to land
    in the corpus at all: `_build_corpus` never learns of a `sources`
    entry that no `ClaimEvidence.source_id` ever points at."""
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
    """The real production-form shape (`src/app/research-os/workspace/
    page.tsx`'s `evidence.split("\\n").filter(Boolean)`): a plain array of
    newline-split strings with no `source_id`/`quote`/`locator` structure
    of its own, unlike the Quote tool's `[{source_id|node_id, quote,
    locator?}]` dicts `_research_os_evidence` below already handled.

    Each line becomes its own evidence entry, `quote` the line verbatim,
    `locator` the fixed marker `"(uncited)"`, `tier` by `author_role`
    (`_tier_for_author_role`, `T4` default), and no `citations`: an
    evidence line and a `sources` line are two separate, unpaired arrays
    on the production form (neither names which source, if any, backs a
    given evidence line), so attaching every source to every evidence
    line, the way the dict-shaped branch's own closed-citation-set
    convention does, would fabricate a citation link the learner never
    made. Tagging the line `"(uncited)"` instead keeps that absence
    visible rather than silently fusing unpaired evidence and citation
    text together (`docs/PRODUCTION-SCHEMA-ALIGNMENT.md`, "Real
    production-form shape"). `source_id` is a per-line synthetic id
    scoped by `production_id` (`f"research-os-evidence-line-{production_
    id}-{i}"`): two productions in the same batch each writing their own
    line 0 must not collide onto the same `_build_corpus`-created
    `Source` node, which a bare `f"...-line-{i}"` id would (`_build_corpus`
    creates a `Source` the first time any evidence entry names an id, and
    silently reuses it for a second production's entry naming the same
    id)."""
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
    """The real production-form shape for `sources[]`: plain newline-split
    strings, parsed by `_citation_from_source_string`. One citation-only
    evidence entry per line (no quoted span, matching the dict-shaped
    branch's own "citation only" fallback below), so every line still
    resolves to a real `Source` in the corpus even though no evidence
    line names it."""
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


def _research_os_evidence(
    evidence_raw: list[Any], sources_raw: list[Any], *, author_role: str = "student", production_id: str = "",
) -> list[dict[str, Any]]:
    """Fold `graph.productions.evidence` and `.sources` into
    `PRODUCTION-SCHEMA.md` evidence entries, over the two shapes either
    field can carry:

    - **The Quote tool's shape** (dicts): `evidence` is `[{source_id|
      node_id, quote, locator?}]`, `sources` is the closed citation set
      `[{label, url?, license?, doi?}]`. Research OS attaches `sources`
      to the whole production as one closed set (the migration's own
      column comment) rather than pairing one source to one quote, so
      every entry this branch builds carries the *same*, full converted
      citation list. `tier` is `"T2"` when any cited source carries a
      `doi` (`PRODUCTION-SCHEMA.md`'s own "a peer-reviewed paper reads
      T2" example), else `"T4"`.
    - **The real production form's shape** (plain strings,
      `src/app/research-os/workspace/page.tsx`'s own `.split("\\n")`,
      confirmed against `src/app/api/research-os/production/route.ts`'s
      `evidence?: unknown[]`/`sources?: unknown[]`, which validates
      neither field's own item shape): handled by
      `_string_evidence_entries`/`_string_source_entries` above, kept
      deliberately unpaired rather than fused together.

    A row may mix the two (a caller-supplied dict-shaped fixture
    alongside a form-shaped one, say): each item in `evidence_raw`/
    `sources_raw` is dispatched by its own type, dict or string, and
    either branch's entries can appear in the same output list.
    """
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
            # No quoted span captured yet (a citation-only draft): one
            # evidence entry per source, since `ClaimEvidence.quote` is a
            # required field with no meaningful blank value
            # (`PRODUCTION-SCHEMA.md`, "An evidence entry").
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
    """A `graph.productions` row, restructured onto this module's own
    `PRODUCTION-SCHEMA.md` JSON shape. `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`
    carries the full field-by-field table; this docstring names only the
    defaults a caller needs to know about.

    A real caller (`load_supabase`, or a batch a Next.js route posts to
    `hypothesize`) may enrich a row with an optional `_target_node` object
    (`{"slug", "title", "tier", "branch"}`, that row's own `graph.nodes`
    join) before normalizing; this function reads it when present and
    falls back to the documented defaults below when it is not, so a bare
    row with no join still normalizes rather than raising:

    - `author_role` is always `"student"`: Phase 0 has no non-student
      production author (`RESEARCH-OS-INTEGRATION.md`'s own "What the
      engine needs from Research OS").
    - `grade_band` is `"unknown"` without `_target_node.tier`, else
      `_tier_to_grade_band`'s bucketed reading of it.
    - `school_or_district_id` is the fixed sentinel
      `"research-os-phase-0"`: Phase 0 has no roster or district concept
      (task item 6, no roster sync) to carry a real pseudonymous id.
    - `research_question` folds `target_node_id` (and `_target_node.title`
      when given) into descriptive free text: `PRODUCTION-SCHEMA.md` has no
      dedicated "which graph node this argues about" field.
    - `claims` is empty when the row carries no `claim` text, `evidence`,
      or `sources` at all (an untouched draft); PRODUCTION-SCHEMA.md
      explicitly allows an empty `claims` list. Otherwise one claim, with
      `stance` always `"supports"` (Research OS carries no stance
      vocabulary; a learner's own production always stands behind its own
      claim) and every one of the five engine slots `None` ("not
      asserted"): the shipped `vocab-production-seed.json` names concepts
      about the engine's own calibration questions (`tier-assignment`,
      `hypothesis-ranking`, ...). Forcing a sky-is-blue claim into that
      vocabulary would misrepresent it, so a normalized claim's slots
      stay unresolved until a domain-specific K-12 physics vocabulary
      exists. `evidence`/`sources` are read through `_research_os_evidence`,
      which accepts either the Quote tool's `[{source_id|node_id, quote,
      locator?}]`/`[{label, url?, doi?}]` dict shape or the real
      production form's plain `evidence.split("\n")`/`sources.split("\n")`
      string-array shape (`src/app/research-os/workspace/page.tsx`; the
      route itself, `production/route.ts`, types both fields as bare
      `unknown[]` and validates neither), or a mix of the two. A string
      evidence line and a string source line are read as two separate,
      unpaired lists (see `_string_evidence_entries`'s own docstring),
      never fused into one fabricated citation.
    - `claims[].interval` is always `None`: a physics fact has no "the
      claim's own subject happened in year X" the way a historical claim
      does, so a normalized Research OS production never contributes a
      `GroundTruthEvent` regardless of status (see the alignment doc's own
      "What this normalizer does not attempt" section).
    - `review.history` is synthesized as a single entry at the row's own
      `updated_at` (falling back to `created_at`; a row missing both
      raises, below): Research OS keeps no per-transition review history
      on `graph.productions` the way `PRODUCTION-SCHEMA.md`'s own
      `review.history` array does. It stays exact for the one date
      `_build_corpus` reads, `review.date_of("accepted")`.

    Raises `ValueError` if the row carries no `id`, no `target_node_id`,
    a `status` outside `RESEARCH_OS_STATUS_MAP`'s own four known values,
    or neither `updated_at` nor `created_at`: every one of these is a
    field this function cannot default around without silently
    corrupting a downstream read (an unrecognized status folding into
    `"draft"`, which the default `status_min="peer-reviewed"` then drops
    from the corpus with no trace of why; a missing timestamp folding
    into the Unix epoch, which `hte.calibrate.holdout_by_discovery_date`
    would then read as maximally old).
    """
    if not raw.get("id"):
        raise ValueError("Research OS production row has no 'id'")
    if not raw.get("target_node_id"):
        raise ValueError(f"Research OS production row {raw.get('id')!r} has no 'target_node_id'")

    node = raw.get("_target_node") or {}
    target_node_id = raw["target_node_id"]
    tier = node.get("tier")
    node_title = node.get("title") or node.get("slug") or target_node_id

    claim_text = (raw.get("claim") or "").strip()
    evidence_raw = raw.get("evidence") or []
    sources_raw = raw.get("sources") or []
    claims: list[dict[str, Any]] = []
    if claim_text or evidence_raw or sources_raw:
        claims.append({
            "text": claim_text,
            "stance": "supports",
            "slots": {"actor": None, "action": None, "object": None, "place": None, "mechanism": None},
            "interval": None,
            "evidence": _research_os_evidence(evidence_raw, sources_raw, author_role="student", production_id=raw["id"]),
        })

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

    return {
        "id": raw["id"],
        "created_at": raw.get("created_at") or moved_at,
        "author_role": "student",
        "grade_band": _tier_to_grade_band(tier) if isinstance(tier, (int, float)) else "unknown",
        "school_or_district_id": "research-os-phase-0",
        "research_question": f"Research OS target: {node_title}",
        "claims": claims,
        "review": {"status": mapped_status, "history": [{"status": mapped_status, "date": moved_at}]},
        "provenance": f"research-os-{node.get('branch', 'phase-0')}",
    }


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
        """Accepts either this module's own `PRODUCTION-SCHEMA.md` shape,
        or a `graph.productions` row (Research OS's own shape), detected by
        `is_research_os_record` and normalized by
        `normalize_research_os_record` before parsing either way. See that
        function's own docstring, and `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`,
        for the mapping."""
        if is_research_os_record(d):
            d = normalize_research_os_record(d)
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
    "is_research_os_record", "normalize_research_os_record", "RESEARCH_OS_STATUS_MAP",
]
