"""The prediction register: dated, forward-looking forecasts off a
completed `hte.runner.run_campaign` run, and their later resolution.

Every calibration pass this package runs so far (`hte.calibrate.
run_holdout`/`holdout_kfold`) scores the graph against evidence it
already has: a discovery-date or k-fold split of a corpus that already
exists. That tests whether the belief model reads existing evidence
well. It does not test whether the graph's own prior, the part carried
by `Hypothesis.prior_logit` and the four `hte.unknowns.prior_profiles`,
says anything real about the world before the evidence arrives.

`register` closes that gap: it turns one completed run's own survivors
and structural gaps into dated, timestamped forecasts, committed to an
append-only ledger before anyone knows the answer. `resolve` scores
those forecasts, later, against whatever evidence corpus stands in for
"the world as of" a given date, the same way `hte.calibrate` scores a
holdout, using the identical slot-and-interval matcher (`hte.calibrate.
_matches_event`, imported directly). A graph whose forward
predictions come back well calibrated (low Brier, a reliability curve
near the diagonal) has a prior worth trusting; one that does not, does
not, and this module is the one place that distinction gets measured on
the record rather than argued about.

Three kinds of prediction:

- **claim**: a placement hypothesis reconstructed from the run
  (`hte.canon_writeback.reconstruct_candidates`'s own technique,
  reimplemented here as `_reconstruct`, since that module is under
  concurrent edit on another branch), still carrying real uncertainty mass
  (`u >= floor_u`): "this actor performed this action, dated to this
  interval, will be attested by new evidence by the horizon."
- **discovery**: the highest value-of-information gap nodes (`hte.
  unknowns.unresolved_slot_gaps`, imported directly): "evidence of this
  kind, naming this evidence item's own missing slots, will be found by
  the horizon," staked at the gap's own VOI.
- **sequence**: an Allen-relation claim between two reconstructed
  placements (`hte.generate.sequences_from`), scored on its own address
  the same way a claim is: "this relation holds between these two
  events, and will be attested by evidence by the horizon."

Every `Prediction`, regardless of kind, carries the same top-level
shape (`id`, `made_at`, `resolves_at`, `statement`, `P`, `u`, `a`,
`evidence_ids`, `run_id`, `artifact_version`, `profile_spread`,
`envelope`) plus a kind-specific `meta` dict carrying exactly the
structured fields `resolve` needs to rebuild the underlying placement,
sequence, or gap from the ledger alone: the ledger is the only durable
record of a forecast, so nothing resolution depends on lives only in
memory. `meta` never carries a filesystem path (`run_id` is a label,
`f"{campaign}-{timestamp}"`, `hte.canon_writeback.RunContext.run_id`'s
own convention), so the ledger stays portable across checkouts.

`envelope` is a feed402-shaped citeable record (`PROTOCOL.md` §4,
`CLAUDE.md`'s own feed402 forward-compat hook: `citation.type` is an
additive extension point, and `"prediction"` is this module's own new
value for it, sibling to DerbyFish's `derbyfish.bhrv.v2`). `receipt` is
a placeholder throughout: no x402 settlement has happened over a
forecast, `price_usd: 0`, `status: "forecast_registered_not_yet_
resolved"`.
"""
from __future__ import annotations

import hashlib
import json
import logging
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

from .address import decode_sequence_indices, encode_indices
from .belief import Constants, Opinion, load_detectability_table, score as belief_score
from .calibrate import DEFAULT_MATCH_THRESHOLD, _matches_event
from .concepts import Concept, ConsensusStatus, Slot, Vocabulary
from .corpus import Corpus
from .corpus import education_atlas, fixtures as fixtures_corpus, literature, production, quantum_history, research_os_outbox, sacred_history
from .evidence import EvidenceItem
from .generate import _interval_for_bin, sequences_from
from .hypothesis import Hypothesis, Placement, Sequence as SequenceContent
from .link import link_evidence
from .timeline import AllenRelation, Interval, relate
from .unknowns import GapNode, prior_profiles, robustness, unresolved_slot_gaps, value_of_information

logger = logging.getLogger("hte.predict")

# Duplicated from `hte.cli._CORPUS_LOADERS`/`hte.runner._CORPUS_LOADERS`
# rather than imported: both of those modules already keep their own
# copy for the same reason stated in `hte/cli.py`'s own comment on it
# (`hte.runner` carries `research-os` only at call time), and importing
# either here would pull in a module `feat/hte-propagation` is editing
# concurrently on its own branch. A corpus loader mapping is a fixed,
# small piece of wiring; three copies of it costs less than a coupling
# to a module under active, concurrent rewrite.
_CORPUS_LOADERS = {
    "quantum-history": quantum_history.ingest,
    "fixtures": fixtures_corpus.build,
    "education-atlas": education_atlas.load,
    "production": production.load,
    "research-os": research_os_outbox.load,
    "literature": literature.load_default,
    "sacred-history": sacred_history.ingest,
}

# `tools/hypothesis-engine/hte/predict.py` -> parents[3] is the repo
# root (`bucket-foundation/`), matching `hte.canon_writeback.REPO_ROOT`'s
# own depth (same directory level, one file over).
REPO_ROOT = Path(__file__).resolve().parents[3]
FEED_TOOL_DIR = REPO_ROOT / "tools" / "feed"

DEFAULT_HORIZON_DAYS = 365
DEFAULT_FLOOR_U = 0.9
DEFAULT_OUT_DIR = "predictions"

# How many of each kind one `register` call writes at most, ranked by
# uncertainty (claim, sequence) or value of information (discovery) so
# a capped run still keeps its most interesting bets. Not caller-tunable
# in this pass: `register`'s own signature (this task's contract) takes
# only `kinds`/`floor_u`, and these three numbers are small enough that
# raising them is a one-line change here, ahead of a real need for a
# fourth parameter.
_MAX_CLAIM_PREDICTIONS = 25
_MAX_DISCOVERY_PREDICTIONS = 15
_MAX_SEQUENCE_PREDICTIONS = 10
_SEQUENCE_POOL_SIZE = 12

_UNRESOLVED_SLOT_FIELDS: tuple[tuple[str, Slot], ...] = (
    ("actor", Slot.ACTOR), ("action", Slot.ACTION), ("object", Slot.OBJECT),
    ("place", Slot.PLACE), ("mechanism", Slot.MECHANISM),
)


# --------------------------------------------------------------------------
# Prediction
# --------------------------------------------------------------------------


@dataclass
class Prediction:
    """One dated forward forecast. See this module's own top docstring
    for the field-by-field rationale and each kind's own `meta` shape."""
    id: str
    kind: str  # "claim" | "discovery" | "sequence"
    made_at: str
    resolves_at: str
    statement: str
    P: float
    u: float
    a: float
    evidence_ids: list[str]
    run_id: str
    artifact_version: str | None
    profile_spread: float | None
    envelope: dict[str, Any]
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id, "kind": self.kind, "made_at": self.made_at, "resolves_at": self.resolves_at,
            "statement": self.statement, "P": self.P, "u": self.u, "a": self.a,
            "evidence_ids": list(self.evidence_ids), "run_id": self.run_id,
            "artifact_version": self.artifact_version, "profile_spread": self.profile_spread,
            "envelope": self.envelope, "meta": self.meta,
        }

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> "Prediction":
        return cls(
            id=d["id"], kind=d["kind"], made_at=d["made_at"], resolves_at=d["resolves_at"],
            statement=d["statement"], P=float(d["P"]), u=float(d["u"]), a=float(d["a"]),
            evidence_ids=list(d.get("evidence_ids", [])), run_id=d["run_id"],
            artifact_version=d.get("artifact_version"), profile_spread=d.get("profile_spread"),
            envelope=dict(d.get("envelope", {})), meta=dict(d.get("meta", {})),
        )


def _prediction_id(kind: str, run_id: str, natural_key: str, made_at: str) -> str:
    """A short, deterministic id: two `register` calls made at the same
    `made_at` over the same run produce the identical id for the
    identical prediction (`natural_key` is a hypothesis address or a gap
    id), the property `tests/test_predict.py`'s own determinism test
    checks. Content-hashed rather than a random UUID for exactly that
    reason, matching `tools/feed/parse.py`'s own `event_id` convention."""
    h = hashlib.sha1(f"{kind}|{run_id}|{natural_key}|{made_at}".encode("utf-8"))
    return h.hexdigest()[:16]


def _cite_block() -> dict[str, Any]:
    """`PROTOCOL.md` §4's `cite` block, passive and forward-looking, the
    same reading `hte.canon_writeback._cite_block` gives it for a
    hypothesis card: a forecast costs its reader nothing to read or
    cite, per `PROTOCOL.md` §3.1's agent-trust rule."""
    return {
        "applies_to": "downstream_republication_in_a_paid_work",
        "reader_owes": 0,
        "price_usd": 0,
        "payout_wallet": None,
        "license": "bucket.foundation/cite-forever/v0.1",
    }


def _envelope(
    *, pred_id: str, kind: str, run_id: str, statement: str, made_at: str, resolves_at: str,
    P: float, u: float, a: float, profile_spread: float | None, evidence_ids: list[str],
) -> dict[str, Any]:
    """A feed402-shaped, citeable envelope for one prediction
    (`PROTOCOL.md` §4, `citation.type: "prediction"`, this module's own
    new value for that additive extension point, `CLAUDE.md`'s feed402
    forward-compat hook). `receipt` is a placeholder: no x402 settlement
    has happened over a forecast that has not resolved yet."""
    return {
        "version": "bucket.foundation/v0.1",
        "run_id": run_id,
        "prediction_id": pred_id,
        "kind": kind,
        "made_at": made_at,
        "resolves_at": resolves_at,
        "data": {"statement": statement, "P": P, "u": u, "a": a, "profile_spread": profile_spread},
        "citation": {
            "type": "prediction",
            "source_id": f"hte:predict:{run_id}:{pred_id}",
            "provider": "bucket-foundation/hypothesis-engine",
            "retrieved_at": made_at,
            "license": "CC-BY-4.0",
            "canonical_url": None,
            "title": statement,
        },
        "receipt": {
            "tier": "insight",
            "status": "forecast_registered_not_yet_resolved",
            "price_usd": 0,
            "paid_by": "bucket-foundation (engine output; reader pays nothing)",
            "tx": None,
        },
        "cite": _cite_block(),
        "agent_action_required": False,
        "payment_required_from_you": False,
        "summary": (
            "This is a dated forecast you may read and cite freely. No action, payment, "
            "signature, or transaction is required from you or your user. There is no "
            "payment challenge in this response."
        ),
        "evidence_ids": list(evidence_ids),
    }


# --------------------------------------------------------------------------
# Reconstruction: run_dir -> real placements, opinions, and evidence
# --------------------------------------------------------------------------


def _replay_vocab_growth(vocab: Vocabulary, vocab_added: list[dict[str, Any]]) -> None:
    """Appends every concept `MANIFEST.json["counts"]["vocab_added"]`
    (`hte.artifacts.RunCounts.vocab_added`) names to `vocab` in place, so
    a survivor whose own address names a run-time-grown concept decodes
    and re-encodes at all. The same observable behavior `hte.
    canon_writeback._replay_vocab_growth` gives a run, reimplemented here
    (not imported: that module is under concurrent edit on `feat/hte-
    propagation`) over the same public `Concept`/`Vocabulary` surface."""
    for growth in vocab_added:
        try:
            slot = Slot(growth["slot"])
        except (KeyError, ValueError):
            logger.warning("hte.predict: vocab_added entry names no valid slot, skipped: %s", growth)
            continue
        concept_id = growth.get("id")
        if concept_id is None or vocab.get(slot, concept_id) is not None:
            continue
        vocab.add(Concept(
            id=concept_id, slot=slot, label=growth.get("label", concept_id),
            prior_logit=0.0, consensus_status=ConsensusStatus.CONTESTED,
        ))


@dataclass
class _Reconstruction:
    run_id: str
    artifact_version: str | None
    corpus: Corpus
    placements: list[Hypothesis]
    opinions: dict[int, Opinion]
    profiles: dict[str, Vocabulary]
    score_fn: Any
    missing_mass: float | None


def _reconstruct(run_dir: str | Path) -> _Reconstruction:
    """Every placement survivor `run_dir` names in `timeline.json`,
    reconstructed into a real, re-scored `Opinion`, over a corpus
    re-ingested and evidence-linked the same way `hte.canon_writeback.
    reconstruct_candidates` does. See that function's own docstring
    (`hte/canon_writeback.py`) for why relinking against just this
    population reproduces the original run's own scoring for every
    hypothesis whose interval is a full time-bin span, the case every
    `combinatorial_sample`-generated survivor is."""
    from . import artifacts as artifacts_mod

    run = artifacts_mod.load_run(run_dir)
    manifest = run.manifest
    corpus_name = manifest.corpus or manifest.config.get("corpus")
    if not corpus_name:
        raise ValueError(f"hte.predict: {run_dir} names no corpus in MANIFEST.json")
    if corpus_name not in _CORPUS_LOADERS:
        raise ValueError(f"hte.predict: unknown corpus {corpus_name!r}, expected one of {sorted(_CORPUS_LOADERS)}")
    corpus = _CORPUS_LOADERS[corpus_name]()
    _replay_vocab_growth(corpus.vocab, manifest.counts.vocab_added)

    time_binning = manifest.time_binning or {}
    span_start = int(time_binning.get("span_start", -20_000))
    bin_width = int(time_binning.get("bin_width", 100))
    link_threshold = float(manifest.config.get("link_threshold", DEFAULT_MATCH_THRESHOLD))

    placements: list[Hypothesis] = []
    for b in run.timeline.bins:
        tbin = (b.get("time_bin") or {}).get("index")
        if tbin is None:
            continue
        for entry in b.get("ranked_hypotheses", []):
            slots = entry.get("slots") or {}
            if entry.get("address") is None or not slots:
                continue
            interval = _interval_for_bin(tbin, span_start=span_start, bin_width=bin_width)
            placement = Placement(
                actor=slots.get("ACTOR"), action=slots.get("ACTION"), object=slots.get("OBJECT"),
                place=slots.get("PLACE"), mechanism=slots.get("MECHANISM"), interval=interval,
            )
            try:
                h = Hypothesis.from_placement(placement, corpus.vocab, span_start=span_start, bin_width=bin_width)
            except KeyError:
                logger.warning("hte.predict: %s names a concept absent from vocab, skipped", entry.get("hypothesis_id"))
                continue
            placements.append(h)

    # `hte.link.link_evidence` links an item carrying a dated `interval`
    # but no extracted slot at all against every placement sharing that
    # date (its own docstring: "at least one extracted slot value OR a
    # dated interval"), since every present-slot comparison is vacuously
    # true with no slots to mismatch on. That is real signal for the
    # original engine loop's own use of it (a bare-dated item still
    # narrows which bin a claim belongs to), but it means every such item
    # links to the WHOLE placement population at once, collapsing every
    # survivor's own `u` toward the same low floor regardless of how much
    # real, slot-specific evidence backs it, exactly the confound `floor_u`
    # exists to select against. Linking only the slot-bearing items keeps
    # `u` reading real per-hypothesis examination; `belief.score` below
    # still scores every item in `corpus.evidence` (`pooled_weight` reads
    # `item.supports`/`refutes` directly, so a slotless item never
    # entered either list and contributes zero weight either way).
    slotted_evidence = [item for item in corpus.evidence if any(
        getattr(item, slot.value) is not None for slot in (Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM)
    )]
    link_evidence(slotted_evidence, placements, corpus.vocab, threshold=link_threshold)
    table = load_detectability_table()
    constants = Constants.from_dict(manifest.constants) if manifest.constants else Constants()

    def score_fn(hh: Hypothesis, evidence: Sequence[EvidenceItem], vocab: Vocabulary) -> Opinion:
        return belief_score(hh, evidence, vocab, table, constants=constants)

    opinions = {h.address: score_fn(h, corpus.evidence, corpus.vocab) for h in placements}
    profiles = prior_profiles(corpus.vocab)
    missing_mass = (manifest.counts.coverage.missing_mass if manifest.counts.coverage else None)

    return _Reconstruction(
        run_id=f"{manifest.campaign}-{manifest.timestamp}",
        artifact_version=manifest.run_artifact_version,
        corpus=corpus, placements=placements, opinions=opinions,
        profiles=profiles, score_fn=score_fn, missing_mass=missing_mass,
    )


# --------------------------------------------------------------------------
# Statement rendering
# --------------------------------------------------------------------------


def _label(vocab: Vocabulary, slot: Slot, concept_id: str | None) -> str:
    if concept_id is None:
        return "(unset)"
    concept = vocab.get(slot, concept_id)
    return concept.label if concept is not None else concept_id


def _gist(placement: Placement, vocab: Vocabulary) -> str:
    actor = _label(vocab, Slot.ACTOR, placement.actor)
    action = _label(vocab, Slot.ACTION, placement.action).lower()
    obj = _label(vocab, Slot.OBJECT, placement.object)
    place = _label(vocab, Slot.PLACE, placement.place)
    mechanism = _label(vocab, Slot.MECHANISM, placement.mechanism)
    return f"{actor} {action} {obj}, in the context of {place}, via {mechanism}"


def _resolves_at_date(resolves_at: str) -> str:
    return resolves_at[:10]


def _placement_meta(placement: Placement) -> dict[str, Any]:
    return {
        "slots": {
            "ACTOR": placement.actor, "ACTION": placement.action, "OBJECT": placement.object,
            "PLACE": placement.place, "MECHANISM": placement.mechanism,
        },
        "interval": {"start": placement.interval.start, "end": placement.interval.end},
    }


def _placement_from_meta(meta: Mapping[str, Any]) -> Placement:
    slots = meta["slots"]
    interval = meta["interval"]
    return Placement(
        actor=slots.get("ACTOR"), action=slots.get("ACTION"), object=slots.get("OBJECT"),
        place=slots.get("PLACE"), mechanism=slots.get("MECHANISM"),
        interval=Interval(start=interval["start"], end=interval["end"]),
    )


# --------------------------------------------------------------------------
# register
# --------------------------------------------------------------------------


def register(
    run_dir: str | Path,
    *,
    horizon: int = DEFAULT_HORIZON_DAYS,
    kinds: Sequence[str] = ("claim", "discovery", "sequence"),
    floor_u: float = DEFAULT_FLOOR_U,
    out: str | Path = DEFAULT_OUT_DIR,
    made_at: str | datetime | None = None,
    feed_root: str | Path | None = None,
) -> list[Prediction]:
    """Turns the completed run at `run_dir` into dated forward
    predictions, appends them to `<out>/ledger.jsonl`, and emits one
    feed event through `tools/feed/feed.py`'s own `cmd_update` (`type:
    "predict_register"`). Returns exactly the predictions this call
    appended.

    `horizon` is a whole number of days: `resolves_at = made_at +
    horizon` days. `floor_u` is a floor (contrast `hte.
    canon_writeback.select_above_floor`'s own `floor_u_max`, a ceiling
    admitting only LOW-uncertainty candidates into canon): a claim or
    sequence prediction is worth registering only when its own
    uncertainty mass has not yet collapsed (`u >= floor_u`), since a
    hypothesis evidence has already mostly settled makes no interesting
    forward bet. Discovery predictions carry no single hypothesis-level
    `u` to gate on and are limited by count alone (`hte.unknowns.
    unresolved_slot_gaps`'s own value-of-information ranking).

    `made_at` pins the forecast timestamp (default: now, UTC); a caller
    wanting two `register` calls over the same run to produce byte-
    identical predictions (`tests/test_predict.py`'s own determinism
    test) passes the same `made_at` to both. `feed_root` overrides where
    the feed event lands (default: this repository's own root); a test
    passes a `tmp_path` so it never touches the real `tools/feed/`
    ledger.
    """
    if isinstance(made_at, datetime):
        made_at_dt = made_at if made_at.tzinfo else made_at.replace(tzinfo=timezone.utc)
    elif isinstance(made_at, str):
        made_at_dt = datetime.fromisoformat(made_at)
    else:
        made_at_dt = datetime.now(timezone.utc)
    made_at_iso = made_at_dt.isoformat()
    resolves_at_iso = (made_at_dt + timedelta(days=horizon)).isoformat()

    rec = _reconstruct(run_dir)
    predictions: list[Prediction] = []

    if "claim" in kinds:
        predictions.extend(_claim_predictions(rec, made_at_iso, resolves_at_iso, floor_u))
    if "discovery" in kinds:
        predictions.extend(_discovery_predictions(rec, made_at_iso, resolves_at_iso))
    if "sequence" in kinds:
        predictions.extend(_sequence_predictions(rec, made_at_iso, resolves_at_iso, floor_u))

    out_dir = Path(out)
    _append_ledger(predictions, out_dir / "ledger.jsonl")
    _emit_feed_event(predictions, run_id=rec.run_id, made_at=made_at_iso, out_dir=out_dir, feed_root=feed_root)
    return predictions


def _claim_predictions(rec: _Reconstruction, made_at: str, resolves_at: str, floor_u: float) -> list[Prediction]:
    ranked = sorted(rec.placements, key=lambda h: (-rec.opinions[h.address].u, h.address))
    selected = [h for h in ranked if rec.opinions[h.address].u >= floor_u][:_MAX_CLAIM_PREDICTIONS]

    out = []
    for h in selected:
        placement = h.content
        opinion = rec.opinions[h.address]
        spread = robustness(h, rec.corpus.evidence, rec.profiles, rec.score_fn)["spread"]
        statement = f"{_gist(placement, rec.corpus.vocab)} will be attested by new evidence found by {_resolves_at_date(resolves_at)}."
        evidence_ids = sorted({e.id for e in rec.corpus.evidence if h.address in e.supports or h.address in e.refutes})
        pred_id = _prediction_id("claim", rec.run_id, str(h.address), made_at)
        out.append(Prediction(
            id=pred_id, kind="claim", made_at=made_at, resolves_at=resolves_at, statement=statement,
            P=opinion.project(), u=opinion.u, a=opinion.a, evidence_ids=evidence_ids, run_id=rec.run_id,
            artifact_version=rec.artifact_version, profile_spread=spread,
            envelope=_envelope(
                pred_id=pred_id, kind="claim", run_id=rec.run_id, statement=statement, made_at=made_at,
                resolves_at=resolves_at, P=opinion.project(), u=opinion.u, a=opinion.a,
                profile_spread=spread, evidence_ids=evidence_ids,
            ),
            meta={"address": h.address, **_placement_meta(placement)},
        ))
    return out


def _discovery_predictions(rec: _Reconstruction, made_at: str, resolves_at: str) -> list[Prediction]:
    gaps: list[GapNode] = unresolved_slot_gaps(rec.corpus.evidence, rec.placements, rec.opinions, limit=_MAX_DISCOVERY_PREDICTIONS)
    evidence_by_id = {item.id: item for item in rec.corpus.evidence}
    a_prior = rec.missing_mass if rec.missing_mass is not None else 0.5

    out = []
    for gap in gaps:
        origin_id = gap.id[len("gap-"):] if gap.id.startswith("gap-") else gap.id
        origin = evidence_by_id.get(origin_id)
        if origin is None:
            continue
        unresolved = [name for name, slot in _UNRESOLVED_SLOT_FIELDS if getattr(origin, name) is None]
        voi = value_of_information(gap, rec.placements, rec.opinions)
        statement = (
            f"Evidence of kind {origin.kind.value} naming {', '.join(unresolved)} for evidence item "
            f"{origin_id} will be found by {_resolves_at_date(resolves_at)}."
        )
        opinion = Opinion(b=0.0, d=0.0, u=1.0, a=a_prior)
        pred_id = _prediction_id("discovery", rec.run_id, gap.id, made_at)
        out.append(Prediction(
            id=pred_id, kind="discovery", made_at=made_at, resolves_at=resolves_at, statement=statement,
            P=opinion.project(), u=opinion.u, a=opinion.a, evidence_ids=[origin_id], run_id=rec.run_id,
            artifact_version=rec.artifact_version, profile_spread=None,
            envelope=_envelope(
                pred_id=pred_id, kind="discovery", run_id=rec.run_id, statement=statement, made_at=made_at,
                resolves_at=resolves_at, P=opinion.project(), u=opinion.u, a=opinion.a,
                profile_spread=None, evidence_ids=[origin_id],
            ),
            meta={
                "gap_id": gap.id, "origin_evidence_id": origin_id, "unresolved_slots": unresolved,
                "evidence_kind": origin.kind.value, "would_move": list(gap.would_move), "voi": voi,
            },
        ))
    return out


def _sequence_predictions(rec: _Reconstruction, made_at: str, resolves_at: str, floor_u: float) -> list[Prediction]:
    pool = sorted(rec.placements, key=lambda h: (-rec.opinions[h.address].u, h.address))[:_SEQUENCE_POOL_SIZE]

    out = []
    for seq_hyp in sequences_from(pool, max_pairs=_MAX_SEQUENCE_PREDICTIONS):
        seq: SequenceContent = seq_hyp.content
        opinion = rec.score_fn(seq_hyp, rec.corpus.evidence, rec.corpus.vocab)
        if opinion.u < floor_u:
            continue
        spread = robustness(seq_hyp, rec.corpus.evidence, rec.profiles, rec.score_fn)["spread"]
        statement = (
            f"{_gist(seq.first, rec.corpus.vocab)} {seq.relation.value} "
            f"{_gist(seq.second, rec.corpus.vocab)}, will be attested by evidence found by "
            f"{_resolves_at_date(resolves_at)}."
        )
        member_addresses = _member_addresses(seq_hyp.address)
        evidence_ids = sorted({
            e.id for e in rec.corpus.evidence
            if any(addr in e.supports or addr in e.refutes for addr in member_addresses)
        })
        pred_id = _prediction_id("sequence", rec.run_id, str(seq_hyp.address), made_at)
        out.append(Prediction(
            id=pred_id, kind="sequence", made_at=made_at, resolves_at=resolves_at, statement=statement,
            P=opinion.project(), u=opinion.u, a=opinion.a, evidence_ids=evidence_ids, run_id=rec.run_id,
            artifact_version=rec.artifact_version, profile_spread=spread,
            envelope=_envelope(
                pred_id=pred_id, kind="sequence", run_id=rec.run_id, statement=statement, made_at=made_at,
                resolves_at=resolves_at, P=opinion.project(), u=opinion.u, a=opinion.a,
                profile_spread=spread, evidence_ids=evidence_ids,
            ),
            meta={
                "address": seq_hyp.address, "relation": seq.relation.value,
                "first": _placement_meta(seq.first), "second": _placement_meta(seq.second),
            },
        ))
    return out


def _member_addresses(seq_address: int) -> tuple[int, int]:
    """The two member placement addresses a sequence address was built
    from (`hte.address.encode_sequence_indices`'s own inverse), so a
    sequence prediction's `evidence_ids` reads the evidence already
    linked to either dated event, without needing the corpus's own
    `span_start`/`bin_width` again (`Placement.address` would, and
    re-deriving it here from the wrong default span would silently
    recompute a different int than the one `hte.link.link_evidence`
    linked against)."""
    first_tuple, _relation_index, second_tuple = decode_sequence_indices(seq_address)
    return (encode_indices(first_tuple), encode_indices(second_tuple))


# --------------------------------------------------------------------------
# The ledger
# --------------------------------------------------------------------------


def load_ledger(path: str | Path) -> list[Prediction]:
    """Every prediction currently on disk, in file order (oldest first).
    An absent file reads as an empty ledger."""
    path = Path(path)
    if not path.is_file():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        out.append(Prediction.from_dict(json.loads(line)))
    return out


def _append_ledger(new_predictions: Sequence[Prediction], path: Path) -> list[Prediction]:
    """Appends `new_predictions` to the ledger at `path`, keyed on
    `id`, deduplicated against whatever is already on disk. Every
    existing line is written back byte-for-byte the same (`sort_keys=
    True`, the same deterministic-rewrite convention `hte.
    holdout_ledger.append_entries` uses for its own append-only ledger),
    so a second `register` call never alters an earlier entry's own
    content, only ever adds lines after it."""
    existing = load_ledger(path)
    known = {p.id for p in existing}
    to_add = [p for p in new_predictions if p.id not in known]
    if not to_add:
        return []
    path.parent.mkdir(parents=True, exist_ok=True)
    text = "".join(json.dumps(p.to_dict(), sort_keys=True) + "\n" for p in list(existing) + to_add)
    path.write_text(text, encoding="utf-8")
    return to_add


# --------------------------------------------------------------------------
# feed402 activity feed (`tools/feed/feed.py`'s own API, read only)
# --------------------------------------------------------------------------


def _current_commit_sha() -> str:
    import subprocess
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT,
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return out or "uncommitted"
    except Exception:  # noqa: BLE001 - a missing git binary, a non-repo cwd, or the test suite's own subprocess guard all fall back the same way
        return "uncommitted"


def _emit_feed_event(
    predictions: Sequence[Prediction], *, run_id: str, made_at: str, out_dir: Path, feed_root: str | Path | None,
) -> int:
    if not predictions:
        return 0
    if str(FEED_TOOL_DIR) not in sys.path:
        sys.path.insert(0, str(FEED_TOOL_DIR))
    import feed as feed_tool  # tools/feed/feed.py

    root = Path(feed_root) if feed_root is not None else REPO_ROOT
    try:
        rel_path = str((out_dir / "ledger.jsonl").resolve().relative_to(REPO_ROOT))
    except ValueError:
        rel_path = str(out_dir / "ledger.jsonl")
    commit_sha = _current_commit_sha()
    by_kind: dict[str, int] = {}
    for p in predictions:
        by_kind[p.kind] = by_kind.get(p.kind, 0) + 1
    event = {
        "id": hashlib.sha1(f"predict_register|{run_id}|{made_at}".encode("utf-8")).hexdigest()[:16],
        "type": "predict_register",
        "branch": None,
        "topic": run_id,
        "title": f"{len(predictions)} prediction(s) registered for {run_id} ({by_kind})",
        "path": rel_path,
        "doi": None,
        "author_github": None,
        "author_name": None,
        "commit_sha": commit_sha,
        "pr_number": None,
        "timestamp": made_at,
    }
    return feed_tool.cmd_update([event], root=root)


# --------------------------------------------------------------------------
# resolve
# --------------------------------------------------------------------------


_DISJOINT_RELATIONS = frozenset({AllenRelation.BEFORE, AllenRelation.AFTER})


@dataclass
class ResolutionOutcome:
    prediction_id: str
    kind: str
    outcome: str  # "attested" | "refuted" | "unresolved"
    predicted_P: float
    observed: float | None
    brier: float | None
    made_at: str
    resolves_at: str
    statement: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "prediction_id": self.prediction_id, "kind": self.kind, "outcome": self.outcome,
            "predicted_P": self.predicted_P, "observed": self.observed, "brier": self.brier,
            "made_at": self.made_at, "resolves_at": self.resolves_at, "statement": self.statement,
        }


@dataclass
class ResolutionReport:
    as_of: str
    n_total: int
    n_attested: int
    n_refuted: int
    n_unresolved: int
    brier: float | None
    calibration_curve: list[dict[str, Any]]
    brier_over_time: list[dict[str, Any]]
    by_kind: dict[str, dict[str, Any]]
    outcomes: list[ResolutionOutcome]

    def to_dict(self) -> dict[str, Any]:
        return {
            "as_of": self.as_of, "n_total": self.n_total, "n_attested": self.n_attested,
            "n_refuted": self.n_refuted, "n_unresolved": self.n_unresolved, "brier": self.brier,
            "calibration_curve": self.calibration_curve, "brier_over_time": self.brier_over_time,
            "by_kind": self.by_kind, "outcomes": [o.to_dict() for o in self.outcomes],
        }


def _decide_claim_like(placement: Placement, corpus: Corpus, *, as_of: datetime, resolves_at: datetime) -> tuple[str, float | None]:
    if as_of < resolves_at:
        return "unresolved", None
    true_match = False
    wrong_match = False
    for ev in corpus.evidence:
        if not _matches_event(ev, placement, corpus.vocab, threshold=DEFAULT_MATCH_THRESHOLD):
            continue
        if ev.interval is not None and relate(ev.interval, placement.interval) in _DISJOINT_RELATIONS:
            wrong_match = True
        else:
            true_match = True
    if true_match:
        return "attested", 1.0
    if wrong_match:
        return "refuted", 0.0
    return "unresolved", None


def _decide_sequence(seq_meta: Mapping[str, Any], corpus: Corpus, *, as_of: datetime, resolves_at: datetime) -> tuple[str, float | None]:
    if as_of < resolves_at:
        return "unresolved", None
    first = _placement_from_meta(seq_meta["first"])
    second = _placement_from_meta(seq_meta["second"])
    predicted = AllenRelation(seq_meta["relation"])

    def dated_matches(target: Placement) -> list[EvidenceItem]:
        return [
            ev for ev in corpus.evidence
            if ev.interval is not None and _matches_event(ev, target, corpus.vocab, threshold=DEFAULT_MATCH_THRESHOLD)
        ]

    first_matches, second_matches = dated_matches(first), dated_matches(second)
    if not first_matches or not second_matches:
        return "unresolved", None
    actual = {relate(f.interval, s.interval) for f in first_matches for s in second_matches}
    return ("attested", 1.0) if predicted in actual else ("refuted", 0.0)


def _decide_discovery(meta: Mapping[str, Any], corpus: Corpus, *, as_of: datetime, resolves_at: datetime) -> tuple[str, float | None]:
    if as_of < resolves_at:
        return "unresolved", None
    origin_id = meta["origin_evidence_id"]
    kind = meta["evidence_kind"]
    unresolved_slots: list[str] = meta["unresolved_slots"]
    found = any(
        ev.id != origin_id and ev.kind.value == kind
        and all(getattr(ev, slot) is not None for slot in unresolved_slots)
        for ev in corpus.evidence
    )
    return ("attested", 1.0) if found else ("refuted", 0.0)


def resolve(
    ledger: str | Path | Sequence[Prediction],
    *,
    evidence_corpus: Corpus,
    as_of: str | datetime,
    out: str | Path | None = None,
) -> ResolutionReport:
    """Scores every prediction in `ledger` whose `resolves_at` is at or
    before `as_of` against `evidence_corpus`, using the same slot-and-
    interval matcher `hte.calibrate.run_holdout` uses (`_matches_event`,
    imported). Writes `<out>/RESOLUTIONS.md` (default: `ledger`'s own
    parent directory) and returns the `ResolutionReport`; never mutates
    `ledger` itself, resolution is a read-only pass over the append-only
    prediction record.

    A claim or sequence prediction with no matching evidence at all
    stays `"unresolved"` even past its own `resolves_at`: silence is not
    proof of refutation, only `hte.calibrate.run_holdout`'s own "covered"
    reading, extended to a forward bet. A discovery prediction has no
    third reading available: "evidence of this kind will be found by the
    horizon" either happened by `as_of` or it did not, so past its own
    date it resolves `"attested"` or `"refuted"`, never `"unresolved"`.
    """
    predictions = ledger if isinstance(ledger, Sequence) and not isinstance(ledger, (str, Path)) else load_ledger(ledger)
    as_of_dt = as_of if isinstance(as_of, datetime) else datetime.fromisoformat(as_of)
    if as_of_dt.tzinfo is None:
        as_of_dt = as_of_dt.replace(tzinfo=timezone.utc)

    outcomes: list[ResolutionOutcome] = []
    for p in predictions:
        resolves_at_dt = datetime.fromisoformat(p.resolves_at)
        if p.kind == "claim":
            outcome, observed = _decide_claim_like(_placement_from_meta(p.meta), evidence_corpus, as_of=as_of_dt, resolves_at=resolves_at_dt)
        elif p.kind == "sequence":
            outcome, observed = _decide_sequence(p.meta, evidence_corpus, as_of=as_of_dt, resolves_at=resolves_at_dt)
        elif p.kind == "discovery":
            outcome, observed = _decide_discovery(p.meta, evidence_corpus, as_of=as_of_dt, resolves_at=resolves_at_dt)
        else:
            outcome, observed = "unresolved", None
        brier = (p.P - observed) ** 2 if observed is not None else None
        outcomes.append(ResolutionOutcome(
            prediction_id=p.id, kind=p.kind, outcome=outcome, predicted_P=p.P, observed=observed,
            brier=brier, made_at=p.made_at, resolves_at=p.resolves_at, statement=p.statement,
        ))

    report = _build_report(as_of_dt.isoformat(), outcomes)
    out_dir = Path(out) if out is not None else (Path(ledger).parent if isinstance(ledger, (str, Path)) else Path(DEFAULT_OUT_DIR))
    _write_resolutions_md(report, out_dir / "RESOLUTIONS.md")
    return report


def _build_report(as_of: str, outcomes: list[ResolutionOutcome]) -> ResolutionReport:
    from .calibrate import calibration_curve as _calibration_curve

    scored = [o for o in outcomes if o.brier is not None]
    overall_brier = (sum(o.brier for o in scored) / len(scored)) if scored else None
    curve = _calibration_curve([{"predicted": o.predicted_P, "observed": o.observed} for o in scored], n_bins=10)

    by_month: dict[str, list[float]] = {}
    for o in scored:
        month = o.resolves_at[:7]
        by_month.setdefault(month, []).append(o.brier)
    brier_over_time = [
        {"month": month, "n": len(values), "brier": sum(values) / len(values)}
        for month, values in sorted(by_month.items())
    ]

    by_kind: dict[str, dict[str, Any]] = {}
    for kind in sorted({o.kind for o in outcomes}):
        rows = [o for o in outcomes if o.kind == kind]
        kind_scored = [o for o in rows if o.brier is not None]
        by_kind[kind] = {
            "n": len(rows),
            "attested": sum(1 for o in rows if o.outcome == "attested"),
            "refuted": sum(1 for o in rows if o.outcome == "refuted"),
            "unresolved": sum(1 for o in rows if o.outcome == "unresolved"),
            "brier": (sum(o.brier for o in kind_scored) / len(kind_scored)) if kind_scored else None,
        }

    return ResolutionReport(
        as_of=as_of, n_total=len(outcomes),
        n_attested=sum(1 for o in outcomes if o.outcome == "attested"),
        n_refuted=sum(1 for o in outcomes if o.outcome == "refuted"),
        n_unresolved=sum(1 for o in outcomes if o.outcome == "unresolved"),
        brier=overall_brier, calibration_curve=curve, brier_over_time=brier_over_time,
        by_kind=by_kind, outcomes=outcomes,
    )


def _write_resolutions_md(report: ResolutionReport, path: Path) -> None:
    lines = [
        "# Prediction resolutions",
        "",
        f"As of {report.as_of}: {report.n_total} prediction(s) checked, {report.n_attested} attested, "
        f"{report.n_refuted} refuted, {report.n_unresolved} still unresolved.",
        "",
        f"Overall Brier score: {report.brier if report.brier is not None else 'not yet scoreable'}.",
        "",
        "## By kind",
        "",
        "| Kind | Total | Attested | Refuted | Unresolved | Brier |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for kind, row in report.by_kind.items():
        lines.append(f"| {kind} | {row['n']} | {row['attested']} | {row['refuted']} | {row['unresolved']} | {row['brier']} |")
    lines += ["", "## Reliability curve (10 bins)", "", "| Bin | Count | Mean predicted | Mean observed |", "|---|---:|---:|---:|"]
    for b in report.calibration_curve:
        lines.append(f"| {b['bin_low']:.1f}-{b['bin_high']:.1f} | {b['count']} | {b['mean_predicted']} | {b['mean_observed']} |")
    lines += ["", "## Brier over time", "", "| Month | Count | Mean Brier |", "|---|---:|---:|"]
    for row in report.brier_over_time:
        lines.append(f"| {row['month']} | {row['n']} | {row['brier']:.4f} |")
    lines += ["", "## Predictions", "", "| Id | Kind | Made at | Resolves at | Outcome | P | Brier |", "|---|---|---|---|---|---:|---:|"]
    for o in report.outcomes:
        lines.append(f"| `{o.prediction_id}` | {o.kind} | {o.made_at} | {o.resolves_at} | {o.outcome} | {o.predicted_P:.3f} | {o.brier} |")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


__all__ = [
    "Prediction", "ResolutionOutcome", "ResolutionReport",
    "register", "resolve", "load_ledger",
    "DEFAULT_HORIZON_DAYS", "DEFAULT_FLOOR_U", "DEFAULT_OUT_DIR",
]
