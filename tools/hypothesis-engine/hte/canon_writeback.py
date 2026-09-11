"""Turn a completed `hte.runner.run_campaign` run into canon-facing
material: this package's own path from engine output to `bucket-canon/`,
the write-back half of the *build-history* campaign (`docs/BUILD-
HISTORY.md`).

A run directory on disk (`MANIFEST.json`, `timeline.json`, `calibration.
json`, `self-report.json`, `hte.artifacts.load_run`'s own contract)
carries every survivor's short id, address, slots, projected posterior,
and Elo (`timeline.json`'s own `bins[].ranked_hypotheses`), but not the
raw `(b, d, u, a)` opinion, its linked evidence, or its exact dated
interval: `hte.export.timeline_views` prunes to exactly the fields
`TIMELINE.md` displays, keeping only which time BIN a hypothesis fell in
(`time_bin_index(interval.start, ...)`), never its own interval's real
start and end. `write_back` recovers the rest by re-ingesting the run's
own corpus (a pure, deterministic, no-LLM call for every corpus this
package ships, `hte.corpus.quantum_history`/`sacred_history`'s own
module docstrings) and re-running `hte.link.link_evidence` and `hte.
belief.score` over a `Placement` rebuilt from each survivor's own
persisted slots and time bin, its own interval reconstructed as that
bin's own full span (`hte.generate._interval_for_bin`'s own convention,
exactly matching every `combinatorial_sample`-generated hypothesis, the
majority of a typical frontier).

`hte.link.link_evidence`'s own per-pair decision depends only on `(item,
hypothesis, vocab, threshold)`, never on which other hypotheses share
the call, so relinking against just the survivor population this module
reconstructs reproduces, for each address, the same supports/refutes
reading the original run's own full-frontier link pass gave it, for
every SLOT match; the one place this reconstruction can diverge from the
original in-memory run is a hypothesis whose own interval `hte.generate.
from_evidence` or an LLM-proposed hypothesis narrowed below its bin's
full span, since that narrower interval is exactly what this module
cannot recover from `timeline.json` alone. Checked empirically against
`runs/quantum-history/20260910T085020Z` (2026-09-10): every hypothesis
whose own origin was `combinatorial_sample` reproduces its persisted
posterior exactly; a hypothesis from `from_evidence` or the generator
role can differ, since its own interval was narrower than this
reconstruction's bin-span default. This module's own opinions are still
real, internally consistent computations over real linked evidence
under the run's own vocabulary and constants; a difference from the
persisted number is this reconstruction's own documented approximation,
since the original run's own transient in-memory number was itself
never persisted in full.

`write_back` never promotes a card past `canon_tier: candidate`: per
`GOVERNANCE.md`, promotion to `canon` stays a human step. A card above
this module's own credence floor is candidate material, a step short of
a canon verdict.
"""
from __future__ import annotations

import json
import logging
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import artifacts as artifacts_mod
from . import unknowns
from .address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from .belief import Constants, Opinion, load_detectability_table, score as belief_score
from .concepts import Concept, ConsensusStatus, Slot, Vocabulary
from .corpus import Corpus
from .evidence import EvidenceItem
from .hypothesis import Hypothesis, Placement
from .link import link_evidence
from .timeline import Interval

logger = logging.getLogger("hte.canon_writeback")

# `tools/hypothesis-engine/hte/canon_writeback.py` -> parents[3] is the
# repo root (`bucket-foundation/`), one level shallower than `hte.corpus.
# sacred_history`'s own `parents[4]` since this file sits directly under
# `hte/` rather than under `hte/corpus/`.
REPO_ROOT = Path(__file__).resolve().parents[3]
FEED_TOOL_DIR = REPO_ROOT / "tools" / "feed"

_SLOT_NAMES = ("ACTOR", "ACTION", "OBJECT", "PLACE", "MECHANISM")
_SLOT_BY_NAME: dict[str, Slot] = {
    "ACTOR": Slot.ACTOR, "ACTION": Slot.ACTION, "OBJECT": Slot.OBJECT,
    "PLACE": Slot.PLACE, "MECHANISM": Slot.MECHANISM,
}

CANON_TIER = "candidate"  # write_back never writes "canon"; see GOVERNANCE.md


@dataclass
class Candidate:
    """One reconstructed survivor: the rebuilt `Hypothesis`, its re-scored
    `Opinion`, its persisted Elo, its slots and interval, and the
    evidence items that support or refute its own address."""
    hypothesis: Hypothesis
    opinion: Opinion
    elo: float | None
    slots: dict[str, str]
    interval: Interval
    time_bin: int
    bin_label: str
    supports: list[EvidenceItem]
    refutes: list[EvidenceItem]
    robustness: dict[str, Any]

    @property
    def posterior(self) -> float:
        return self.opinion.project()

    @property
    def short_id(self) -> str:
        return self.hypothesis.short_id


@dataclass
class RunContext:
    """The manifest, corpus, and vocabulary a run's own candidates were
    reconstructed against, carried alongside `list[Candidate]` so a
    caller needs no second `load_run`/re-ingest to render a card.

    `unrecoverable_survivor_ids` (`bkt-hte-writeback-review`, PR #36's
    own review): every short id `run_dir`'s own `timeline.json` names as
    a real survivor (`event_views`, which partitions every placement-
    type survivor by its own (OBJECT, PLACE) pair, `hte.export.
    timeline_views`'s own construction, exhaustively) but that carries
    no entry in any `bins[].ranked_hypotheses` (`hte.runner.
    _time_bins_for`'s own declared bin set not covering that survivor's
    real time bin, `docs/BUILD-HISTORY.md`'s own "262 of 299" finding on
    the sacred-history run) -- `reconstruct_candidates` has no persisted
    slots or address to rebuild an id like that from `timeline.json`
    alone, so it is left out of `list[Candidate]` rather than fabricated.
    This tuple is where that gap goes instead of only a `logger.warning`
    line: `len(candidates) + len(unrecoverable_survivor_ids)` is the
    full survivor population `timeline.json` names, so a caller (or a
    test) can assert real reconstruction coverage rather than read a
    `select_above_floor` result assuming it saw every survivor when it
    structurally could not have. Closing this gap for real (recovering
    an unrecoverable id's own slots) needs a fix inside `hte.export`/
    `hte.runner` (carrying an address into every `event_views` entry
    too), out of this module's own file scope on this branch."""
    run_dir: Path
    manifest: artifacts_mod.ManifestArtifact
    corpus: Corpus
    unrecoverable_survivor_ids: tuple[str, ...] = ()

    @property
    def run_id(self) -> str:
        """`hte.api._build_response`'s own `run_id` convention
        (`f"{campaign}-{timestamp}"`), reused here so a run has exactly
        one id across every surface that names it."""
        return f"{self.manifest.campaign}-{self.manifest.timestamp}"


def _replay_vocab_growth(vocab: Vocabulary, vocab_added: list[dict[str, Any]]) -> None:
    """A fresh `hte.corpus.<name>.ingest()`/`.load()` call returns a
    corpus built from its own static seed vocabulary, missing any
    concept `hte.runner.run_campaign`'s own `_grow_vocab` (the unknown-
    unknown role) appended to the in-memory vocab at run time. `MANIFEST.
    json["counts"]["vocab_added"]` (`hte.artifacts.RunCounts.vocab_added`)
    is that run's own append log; replaying it here is what lets a
    survivor whose own address names one of those grown concepts decode
    and re-encode at all, since `hte.hypothesis.Placement.address` raises
    `KeyError` over any concept id its own vocabulary does not carry."""
    for growth in vocab_added:
        try:
            slot = Slot(growth["slot"])
        except (KeyError, ValueError):
            logger.warning("hte.canon_writeback: MANIFEST.json vocab_added entry names no valid slot, skipped: %s", growth)
            continue
        concept_id = growth.get("id")
        if concept_id is None or vocab.get(slot, concept_id) is not None:
            continue
        vocab.add(Concept(
            id=concept_id, slot=slot, label=growth.get("label", concept_id),
            prior_logit=0.0, consensus_status=ConsensusStatus.CONTESTED,
        ))


def _corpus_loader(corpus_name: str):
    from .runner import _CORPUS_LOADERS  # imported lazily: avoids a hte.runner <-> hte.canon_writeback import cycle
    if corpus_name not in _CORPUS_LOADERS:
        raise ValueError(f"hte.canon_writeback: unknown corpus {corpus_name!r}, expected one of {sorted(_CORPUS_LOADERS)}")
    return _CORPUS_LOADERS[corpus_name]


def reconstruct_candidates(run_dir: str | Path) -> tuple[list[Candidate], RunContext]:
    """Every survivor `run_dir` carries in `timeline.json`, reconstructed
    into a `Candidate` with a real `(b, d, u, a)` opinion, dated interval,
    and linked evidence, plus the `RunContext` (manifest, corpus) it was
    reconstructed against. See this module's own top docstring for why
    this reconstruction reproduces the original run's own scoring
    exactly.

    A short id named in `timeline.json`'s own `event_views` but absent
    from every `bins[].ranked_hypotheses` entry (a hypothesis generated
    at a time bin `hte.runner._time_bins_for` did not include in the
    run's own declared `time_bins`; real on the sacred-history run,
    `docs/BUILD-HISTORY.md`'s own "262 of 299" finding) carries no
    persisted slots to reconstruct from; it is logged AND carried by
    name on the returned `RunContext.unrecoverable_survivor_ids`
    (`bkt-hte-writeback-review`), rather than only logged and silently
    absent from the returned `list[Candidate]` the way it read before.
    `event_views` partitions every placement-type survivor by its own
    (OBJECT, PLACE) pair exhaustively (`hte.export.timeline_views`'s own
    construction: every placement lands in exactly one event), so the
    union of every `event_views[].competing_placements` entry is the
    full survivor population this run's own artifacts name, `bins[]`
    entries alone are not; using that union (rather than `bins[]`'s own
    narrower coverage) as the population this function checks completeness
    against is what lets a caller (or `select_above_floor`'s own caller)
    tell "every survivor accounted for" from "quietly missing some" by
    reading `RunContext` alone.
    """
    run_dir = Path(run_dir)
    run = artifacts_mod.load_run(run_dir)
    manifest = run.manifest

    corpus_name = manifest.corpus or manifest.config.get("corpus")
    if not corpus_name:
        raise ValueError(f"hte.canon_writeback: {run_dir} names no corpus in MANIFEST.json")
    corpus = _corpus_loader(corpus_name)()
    _replay_vocab_growth(corpus.vocab, manifest.counts.vocab_added)

    time_binning = manifest.time_binning or {}
    span_start = int(time_binning.get("span_start", DEFAULT_SPAN_START))
    bin_width = int(time_binning.get("bin_width", DEFAULT_BIN_WIDTH))
    link_threshold = float(manifest.config.get("link_threshold", 0.6))

    by_short_id: dict[str, dict[str, Any]] = {}
    for b in run.timeline.bins:
        tbin_info = b.get("time_bin", {})
        tbin = tbin_info.get("index")
        bin_label = tbin_info.get("label", str(tbin))
        for entry in b.get("ranked_hypotheses", []):
            hid = entry.get("hypothesis_id")
            if hid and hid not in by_short_id:
                by_short_id[hid] = {"entry": entry, "time_bin": tbin, "bin_label": bin_label}

    # `named_elsewhere`: the union of every `event_views[].
    # competing_placements` entry, the full placement-type survivor
    # population `timeline.json` names (`event_views` partitions every
    # placement exhaustively by its own (OBJECT, PLACE) pair, `hte.
    # export.timeline_views`'s own construction; see this function's own
    # docstring). `by_short_id` alone, sourced only from `bins[]`, is
    # `hte.runner._time_bins_for`'s own declared-bin subset of that same
    # population, real ground the "262 of 299" finding measured.
    named_elsewhere = {sid for ev in run.timeline.event_views for sid in ev.get("competing_placements", [])}
    unrecoverable: list[str] = sorted(named_elsewhere - set(by_short_id))
    if unrecoverable:
        logger.warning(
            "hte.canon_writeback: %d hypothesis id(s) named in event_views but not in any "
            "timeline bin, skipped for lack of a persisted slot record: %s", len(unrecoverable), unrecoverable,
        )

    placements: list[Hypothesis] = []
    meta: list[dict[str, Any]] = []
    for hid, rec in by_short_id.items():
        entry = rec["entry"]
        slots = entry.get("slots") or {}
        tbin = rec["time_bin"]
        if tbin is None or entry.get("address") is None:
            logger.warning("hte.canon_writeback: %s carries no time bin or address in timeline.json, skipped", hid)
            unrecoverable.append(hid)
            continue
        start = span_start + tbin * bin_width
        interval = Interval(start=start, end=start + bin_width - 1)
        placement = Placement(
            actor=slots.get("ACTOR"), action=slots.get("ACTION"), object=slots.get("OBJECT"),
            place=slots.get("PLACE"), mechanism=slots.get("MECHANISM"), interval=interval,
        )
        h = Hypothesis.from_placement(placement, corpus.vocab, span_start=span_start, bin_width=bin_width)
        if h.address != entry.get("address"):
            logger.warning(
                "hte.canon_writeback: reconstructed address %d for %s does not match the "
                "persisted address %s; keeping the reconstruction", h.address, hid, entry.get("address"),
            )
        placements.append(h)
        meta.append({"entry": entry, "interval": interval, "time_bin": tbin, "bin_label": rec["bin_label"]})

    link_evidence(corpus.evidence, placements, corpus.vocab, threshold=link_threshold)
    table = load_detectability_table()
    constants = Constants()

    # No `sources=`/`stemma_edge_weights=` here: `hte.runner.run_campaign`'s
    # own `belief_score` call (the one this reconstruction must match)
    # passes neither, so `pooled_weight`'s stemma discount falls back to a
    # raw per-kind item count on both sides, matching that original call
    # exactly rather than adding a discount the run being reconstructed
    # never applied.
    def score_fn(hh: Hypothesis, evidence, vocab: Vocabulary) -> Opinion:
        return belief_score(hh, evidence, vocab, table, constants=constants)

    profiles = unknowns.prior_profiles(corpus.vocab)

    candidates: list[Candidate] = []
    for h, rec in zip(placements, meta):
        opinion = score_fn(h, corpus.evidence, corpus.vocab)
        supports = [e for e in corpus.evidence if h.address in e.supports]
        refutes = [e for e in corpus.evidence if h.address in e.refutes]
        robustness_result = unknowns.robustness(h, corpus.evidence, profiles, score_fn, population=placements)
        entry = rec["entry"]
        candidates.append(Candidate(
            hypothesis=h, opinion=opinion, elo=entry.get("elo"),
            slots=dict(entry.get("slots") or {}), interval=rec["interval"],
            time_bin=rec["time_bin"], bin_label=rec["bin_label"],
            supports=supports, refutes=refutes, robustness=robustness_result,
        ))

    return candidates, RunContext(
        run_dir=run_dir, manifest=manifest, corpus=corpus,
        unrecoverable_survivor_ids=tuple(sorted(set(unrecoverable))),
    )


def select_above_floor(candidates: list[Candidate], *, floor_P: float, floor_u_max: float) -> list[Candidate]:
    """Every candidate at or above the credence floor: projected
    posterior `P(h) >= floor_P` AND uncertainty mass `u <= floor_u_max`.
    Both must hold: a hypothesis nobody has examined can still read a
    high `P(h)` off its prior alone (`a` close to 1) while carrying
    `u = 1.0`, exactly the unexamined case `hte.belief.Opinion`'s own
    docstring distinguishes from a supported one; the `u` floor is what
    keeps that case out of `bucket-canon/`."""
    return [c for c in candidates if c.posterior >= floor_P and c.opinion.u <= floor_u_max]


# --------------------------------------------------------------------------
# Card rendering
# --------------------------------------------------------------------------


def _label_of(corpus: Corpus, slot_name: str, concept_id: str | None) -> str:
    if concept_id is None:
        return "(unset)"
    slot = _SLOT_BY_NAME[slot_name]
    concept = corpus.vocab.get(slot, concept_id)
    return concept.label if concept is not None else concept_id


def _statement(corpus: Corpus, candidate: Candidate) -> str:
    slots = candidate.slots
    actor = _label_of(corpus, "ACTOR", slots.get("ACTOR"))
    action = _label_of(corpus, "ACTION", slots.get("ACTION")).lower()
    obj = _label_of(corpus, "OBJECT", slots.get("OBJECT"))
    place = _label_of(corpus, "PLACE", slots.get("PLACE"))
    mechanism = _label_of(corpus, "MECHANISM", slots.get("MECHANISM"))
    return f"{actor} {action} {obj}, in the context of {place}, via {mechanism}."


def _evidence_line(item: EvidenceItem) -> str:
    quote = item.span.quote.strip()
    if len(quote) > 220:
        quote = quote[:217].rstrip() + "..."
    return f"- `{item.id}` (tier {item.tier.value}, source `{item.source_id}`, stance {item.stance.value}): \"{quote}\" -- {item.span.locator}"


def render_card(candidate: Candidate, ctx: RunContext, *, branch: str) -> str:
    corpus = ctx.corpus
    manifest = ctx.manifest
    opinion = candidate.opinion
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    slot_rows = "\n".join(
        f"| {name} | `{candidate.slots.get(name) or '(unset)'}` | {_label_of(corpus, name, candidate.slots.get(name))} |"
        for name in _SLOT_NAMES
    )

    supports_lines = "\n".join(_evidence_line(item) for item in candidate.supports) or "- (none linked)"
    refutes_lines = "\n".join(_evidence_line(item) for item in candidate.refutes) or "- (none linked)"

    projections = candidate.robustness.get("projections", {})
    projection_row = " | ".join(f"{name}={value:.3f}" for name, value in sorted(projections.items()))

    lines = [
        f"# Hypothesis -- {_statement(corpus, candidate)}",
        "",
        f"> **canon_tier:** {CANON_TIER}",
        f"> **Branch:** {branch} - **Corpus:** {manifest.corpus or '(unrecorded)'} - **Campaign:** {manifest.campaign}",
        f"> **Run:** `{ctx.run_dir}` - **Hypothesis id:** `{candidate.short_id}` - **Address:** `{candidate.hypothesis.address}`",
        f"> **Added:** {today}, build-history campaign write-back",
        "",
        "Machine-generated by `hte.canon_writeback` from a completed hypothesis-engine",
        "run. Candidate tier only; promotion to canon is a human review step",
        "(`GOVERNANCE.md`).",
        "",
        "## 1. Statement",
        "",
        _statement(corpus, candidate),
        "",
        f"Dated to {candidate.bin_label} (astronomical years {candidate.interval.start} to {candidate.interval.end}).",
        "",
        "## 2. Opinion",
        "",
        "| b | d | u | a | P(h) | Elo |",
        "|---|---|---|---|---|---|",
        f"| {opinion.b:.3f} | {opinion.d:.3f} | {opinion.u:.3f} | {opinion.a:.3f} | {candidate.posterior:.3f} | {candidate.elo if candidate.elo is not None else '(unrated)'} |",
        "",
        "## 3. Slots",
        "",
        "| Slot | Concept id | Label |",
        "|---|---|---|",
        slot_rows,
        "",
        "## 4. Linked evidence",
        "",
        f"### Supports ({len(candidate.supports)})",
        "",
        supports_lines,
        "",
        f"### Refutes ({len(candidate.refutes)})",
        "",
        refutes_lines,
        "",
        "## 5. Prior-profile robustness",
        "",
        f"Stable: {candidate.robustness.get('stable')} (spread {candidate.robustness.get('spread', 0.0):.3f}, "
        f"robustness {candidate.robustness.get('robustness', 0.0):.3f}).",
        "",
        f"Per-profile projected posterior: {projection_row}",
        "",
        "## 6. Provenance",
        "",
        f"- Corpus: `{manifest.corpus}`",
        f"- Run directory: `{ctx.run_dir}`",
        f"- Run id: `{ctx.run_id}`",
        f"- Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
    ]
    return "\n".join(lines) + "\n"


def render_index(cards: list[tuple[Candidate, Path]], *, branch: str) -> str:
    lines = [
        f"# {branch} hypothesis cards",
        "",
        "Candidate tier throughout. Written by `hte.canon_writeback.write_back`. See `docs/BUILD-HISTORY.md`.",
        "",
    ]
    lines.append("| Hypothesis | P(h) | u | Elo | Card |")
    lines.append("|---|---|---|---|---|")
    for candidate, path in sorted(cards, key=lambda pair: pair[0].posterior, reverse=True):
        lines.append(f"| `{candidate.short_id}` | {candidate.posterior:.3f} | {candidate.opinion.u:.3f} | "
                      f"{candidate.elo if candidate.elo is not None else '(unrated)'} | [{path.name}]({path.name}) |")
    lines.append("")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# CANON-INGESTION-INDEX.md addendum
# --------------------------------------------------------------------------


def _ingestion_index_addendum(cards: list[tuple[Candidate, Path]], *, branch: str, ctx: RunContext) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [
        f"## Recent additions, {today}",
        "",
        f"Build-history write-back. {len(cards)} hypothesis card(s) written from `hte.canon_"
        f"writeback.write_back` over `{ctx.manifest.corpus}` run `{ctx.run_id}`, `canon_tier: "
        "candidate` throughout. Promotion to canon stays a human review step, `GOVERNANCE.md`.",
        "",
        "| Title | Path | Type |",
        "|---|---|---|",
    ]
    for candidate, path in sorted(cards, key=lambda pair: pair[0].posterior, reverse=True):
        title = _statement(ctx.corpus, candidate)
        rel_path = path.relative_to(REPO_ROOT)
        lines.append(f"| {title} | `{rel_path}` | hypothesis card (candidate) |")
    index_rel = (Path("bucket-canon") / branch / "hypotheses" / "INDEX.md")
    lines.append(f"| {branch} hypotheses index | `{index_rel}` | index |")
    lines.append("")
    return "\n".join(lines)


def _append_ingestion_index(addendum: str) -> Path:
    path = REPO_ROOT / "CANON-INGESTION-INDEX.md"
    existing = path.read_text(encoding="utf-8") if path.is_file() else ""
    separator = "\n" if existing.endswith("\n") else "\n\n"
    path.write_text(existing + separator + addendum, encoding="utf-8")
    return path


# --------------------------------------------------------------------------
# feed events (`tools/feed/feed.py`'s own API; see this module's top
# docstring and `CANON-CONTRIBUTIONS-2026-09-10.md` Part 4 for the same
# convention a prior canon-ingestion pass over this package's own output
# used)
# --------------------------------------------------------------------------


def _current_commit_sha() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT,
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return out or "uncommitted"
    except Exception:  # noqa: BLE001 - a missing git binary or a non-repo cwd both fall back to the same placeholder
        return "uncommitted"


def _feed_events_for_cards(cards: list[tuple[Candidate, Path]], *, branch: str, ctx: RunContext) -> list[dict[str, Any]]:
    """One `add_canon_entry` feed event per card plus one for the
    branch's own `hypotheses/INDEX.md`, built through `tools/feed/
    parse.py`'s own `event_id`/`make_event` (imported, never
    reimplemented, per this module's own top docstring). `commit_sha`
    reads the current `HEAD` short sha as a placeholder, the same
    convention `CANON-CONTRIBUTIONS-2026-09-10.md` Part 4 documents for
    a pass that writes files ahead of its own commit: a later `tools/
    feed/feed.py rebuild --from <pre-this-pass-sha>` backfills the
    authoritative shas once these files land in a real commit.
    """
    import sys
    if str(FEED_TOOL_DIR) not in sys.path:
        sys.path.insert(0, str(FEED_TOOL_DIR))
    import parse as feed_parse  # tools/feed/parse.py

    commit_sha = _current_commit_sha()
    timestamp = datetime.now(timezone.utc).isoformat()
    events = []
    for candidate, path in cards:
        rel_path = str(path.relative_to(REPO_ROOT))
        events.append(feed_parse.make_event(
            type="add_canon_entry", path=rel_path, commit_sha=commit_sha,
            branch=branch, title=_statement(ctx.corpus, candidate), timestamp=timestamp,
        ))
    if cards:
        index_rel = str((Path("bucket-canon") / branch / "hypotheses" / "INDEX.md"))
        events.append(feed_parse.make_event(
            type="add_canon_entry", path=index_rel, commit_sha=commit_sha,
            branch=branch, title=f"{branch} hypothesis cards index", timestamp=timestamp,
        ))
    return events


def _emit_feed_events(events: list[dict[str, Any]]) -> int:
    if not events:
        return 0
    import sys
    if str(FEED_TOOL_DIR) not in sys.path:
        sys.path.insert(0, str(FEED_TOOL_DIR))
    import feed as feed_tool  # tools/feed/feed.py
    return feed_tool.cmd_update(events)


# --------------------------------------------------------------------------
# feed402 envelope (`public/research/hypotheses/<run-id>.json`)
# --------------------------------------------------------------------------


def _cite_block() -> dict[str, Any]:
    return {
        "applies_to": "downstream_republication_in_a_paid_work",
        "reader_owes": 0,
        "price_usd": 0,
        "payout_wallet": None,
        "license": "bucket.foundation/cite-forever/v0.1",
    }


def build_envelope(cards: list[tuple[Candidate, Path]], *, branch: str, ctx: RunContext, floor_P: float, floor_u_max: float) -> dict[str, Any]:
    """The static form of the proposed `/api/research/hypotheses` route
    (`CANON-CONTRIBUTIONS-2026-09-10.md` Part 3, priority 1): one
    feed402-shaped envelope per written card, matching `PROTOCOL.md`
    §4's sidecar fields (`canon_tier`, `foundation_branches`,
    `provenance`) and `src/app/api/research/route.ts`'s own live-response
    shape (`data`/`citation`/`receipt`/`cite`/`tags`, `agent_action_
    required: false`, `payment_required_from_you: false`), the pattern
    every caller-facing envelope on this site already follows. `receipt`
    is a placeholder: no x402 settlement has happened over this run's own
    output yet, `price_usd: 0` throughout, per this task's own "receipt
    placeholder" instruction.
    """
    now = datetime.now(timezone.utc).isoformat()
    items = []
    for candidate, path in cards:
        rel_path = str(path.relative_to(REPO_ROOT))
        items.append({
            "data": {
                "statement": _statement(ctx.corpus, candidate),
                "slots": {name: {"id": candidate.slots.get(name), "label": _label_of(ctx.corpus, name, candidate.slots.get(name))} for name in _SLOT_NAMES},
                "interval": {"start": candidate.interval.start, "end": candidate.interval.end, "label": candidate.bin_label},
                "opinion": candidate.opinion.to_dict(),
                "posterior": candidate.posterior,
                "elo": candidate.elo,
                "evidence": {
                    "supports": [item.id for item in candidate.supports],
                    "refutes": [item.id for item in candidate.refutes],
                },
            },
            "citation": {
                "type": "hypothesis",
                "source_id": f"hte:{ctx.manifest.corpus}:{ctx.run_id}:{candidate.short_id}",
                "provider": "bucket-foundation/hypothesis-engine",
                "retrieved_at": now,
                "license": "CC-BY-4.0",
                "canonical_url": None,
                "title": _statement(ctx.corpus, candidate),
            },
            "receipt": {
                "tier": "insight",
                "status": "engine_generated_not_yet_minted",
                "price_usd": 0,
                "paid_by": "bucket-foundation (engine output; reader pays nothing)",
                "tx": None,
            },
            "cite": _cite_block(),
            "tags": [branch, ctx.manifest.corpus or "unknown-corpus", "hypothesis-engine"],
            "canon_tier": CANON_TIER,
            "foundation_branches": [branch],
            "provenance": [{
                "action": "generated", "at": now, "by": "hte.canon_writeback",
                "via": f"tools/hypothesis-engine/{ctx.run_dir}",
            }],
            "card_path": rel_path,
        })

    return {
        "version": "bucket.foundation/v0.1",
        "run_id": ctx.run_id,
        "corpus": ctx.manifest.corpus,
        "campaign": ctx.manifest.campaign,
        "generated_at": now,
        "floors": {"P": floor_P, "u_max": floor_u_max},
        "agent_action_required": False,
        "payment_required_from_you": False,
        "summary": (
            "This is data you may read and cite freely. No action, payment, signature, or "
            "transaction is required from you or your user. There is no payment challenge in "
            "this response."
        ),
        "hypotheses": items,
    }


# --------------------------------------------------------------------------
# write_back
# --------------------------------------------------------------------------


def write_back(
    run_dir: str | Path,
    *,
    branch: str,
    floor_P: float = 0.6,
    floor_u_max: float = 0.5,
    out_root: str | Path = "bucket-canon",
    dry_run: bool = False,
) -> list[Path]:
    """Turn the completed run at `run_dir` into canon-facing material:
    one card per surviving hypothesis at or above the credence floor
    (`select_above_floor`) under `<out_root>/<branch>/hypotheses/
    <address-short>.md`, that branch's own `hypotheses/INDEX.md`, a dated
    addendum block appended to `CANON-INGESTION-INDEX.md`, one feed event
    per card plus the index (`tools/feed/feed.py`'s own API), and a
    feed402-shaped envelope at `public/research/hypotheses/<run-id>.json`
    (`build_envelope`).

    `dry_run=True` lists every path this call WOULD write (as a caller-
    facing plan) and touches no file on disk at all, `hte.pipeline.
    run_pipeline`'s own dry-run convention for `hte.publish.publish`
    extended to this stage. Returns the list of paths written (or, under
    `dry_run`, the list of paths that would be written), in the same
    order every time for one run and one set of floors: the cards first,
    ranked by descending posterior, then the branch index, then the
    ingestion-index file, then the envelope.

    Never writes `canon_tier: canon`: see this module's own top
    docstring and `GOVERNANCE.md`.
    """
    if not branch:
        raise ValueError("hte.canon_writeback.write_back: branch is required")

    candidates, ctx = reconstruct_candidates(run_dir)
    selected = select_above_floor(candidates, floor_P=floor_P, floor_u_max=floor_u_max)
    selected.sort(key=lambda c: c.posterior, reverse=True)

    out_root_path = Path(out_root)
    if not out_root_path.is_absolute():
        out_root_path = REPO_ROOT / out_root_path
    hypotheses_dir = out_root_path / branch / "hypotheses"
    card_paths = [(candidate, hypotheses_dir / f"{candidate.short_id}.md") for candidate in selected]
    index_path = hypotheses_dir / "INDEX.md"
    envelope_dir = REPO_ROOT / "public" / "research" / "hypotheses"
    envelope_path = envelope_dir / f"{ctx.run_id}.json"
    ingestion_index_path = REPO_ROOT / "CANON-INGESTION-INDEX.md"

    written = [path for _, path in card_paths] + [index_path, ingestion_index_path, envelope_path]

    total_named = len(candidates) + len(ctx.unrecoverable_survivor_ids)
    logger.info(
        "hte.canon_writeback.write_back: %s%d of %d survivor(s) clear P>=%.2f, u<=%.2f over %s "
        "(%d of %d survivor(s) this run's own timeline.json names were reconstructable; "
        "see RunContext.unrecoverable_survivor_ids for the rest)",
        "(dry run) " if dry_run else "", len(selected), len(candidates), floor_P, floor_u_max, run_dir,
        len(candidates), total_named,
    )

    if dry_run:
        return written

    hypotheses_dir.mkdir(parents=True, exist_ok=True)
    for candidate, path in card_paths:
        path.write_text(render_card(candidate, ctx, branch=branch), encoding="utf-8")
    index_path.write_text(render_index(card_paths, branch=branch), encoding="utf-8")

    _append_ingestion_index(_ingestion_index_addendum(card_paths, branch=branch, ctx=ctx))

    events = _feed_events_for_cards(card_paths, branch=branch, ctx=ctx)
    added = _emit_feed_events(events)
    logger.info("hte.canon_writeback.write_back: fed %d new event(s) into tools/feed/feed.py", added)

    envelope_dir.mkdir(parents=True, exist_ok=True)
    envelope = build_envelope(card_paths, branch=branch, ctx=ctx, floor_P=floor_P, floor_u_max=floor_u_max)
    envelope_path.write_text(json.dumps(envelope, indent=2), encoding="utf-8")

    from . import bridge_export
    bridge_export.write_bridge_export(run_dir, envelope_path=envelope_path, floor_P=floor_P, floor_u_max=floor_u_max, branch=branch)

    return written


__all__ = [
    "Candidate", "RunContext", "CANON_TIER",
    "reconstruct_candidates", "select_above_floor",
    "render_card", "render_index", "build_envelope",
    "write_back",
]
