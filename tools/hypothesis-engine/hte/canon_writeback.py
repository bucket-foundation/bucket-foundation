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

`write_back` also never writes a file under `bucket-canon/` unattended:
per `learning/research-os/PLAN.md` section 10 ("a named human sign-off
on every hypothesis that crosses into canon, alongside the judge score")
and `GOVERNANCE.md`, every write is gated on `signoff`, a named human
approver string. A missing or blank `signoff` is a hard refusal
(`ValueError`) before any file touches disk; a present `signoff` is
recorded in every card's provenance section, the envelope's per-item
provenance, and the `CANON-INGESTION-INDEX.md` addendum, so the approver
is legible from the entry itself, not just from the PR that shipped it.

`write_back` carries three more `PLAN.md` section 10 gates
(`bkt-hte-ros-11-review-items`), each a module of its own this file
imports: `hte.holdout_ledger` (a persisted, append-only ranking track
record; every card's Elo carries `hte.holdout_ledger.ranking_status`'s
own current label instead of a fixed "unvalidated" string), `hte.novelty`
(a lexical novelty score against `bucket-canon/`, recorded but not
gating), and `hte.roles.understanding` (a plain-language explanation per
candidate, gating: a blank explanation for even one candidate refuses
the whole write, the same no-partial-state guarantee `signoff` gets).
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
from . import holdout_ledger
from . import novelty as novelty_mod
from . import propagate as propagate_mod
from . import roles
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
# `bkt-hte-retraction-propagation`: the tier a card gets when its own
# support routed through a node this run's own cascade retracted
# (`hte.propagate.CascadeReport.addresses`), in place of `CANON_TIER`.
CONTESTED_TIER = "contested"


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
    """`bkt-hte-full-document-evidence`: carries the field-level grounding
    `hte.evidence.EvidenceSpan` already stores (`doc_id`, `locator`,
    `char_start`, `char_end`), not only the quote, so a claim's own
    evidence is auditable from the card alone. `PLAN.md` section 10 asks
    for full-document context over an isolated snippet; `doc_id` plus
    `locator` is the full-text pointer a reader follows back to that
    document, and `char_start`/`char_end` is the exact passage span this
    item's own quote was drawn from within it, so a reviewer (or a later
    audit) can re-locate the claim's own source material precisely,
    never only trust the quoted string in isolation."""
    quote = item.span.quote.strip()
    if len(quote) > 220:
        quote = quote[:217].rstrip() + "..."
    span = item.span
    return (
        f"- `{item.id}` (tier {item.tier.value}, source `{item.source_id}`, stance {item.stance.value}): "
        f"\"{quote}\" -- {span.locator} (doc `{span.doc_id}`, chars {span.char_start}-{span.char_end})"
    )


def _evidence_detail(item: EvidenceItem) -> dict[str, Any]:
    """The envelope's own auditable form of `_evidence_line`: one dict
    per linked evidence item, `doc_id`/`locator`/`char_start`/`char_end`
    alongside the quote, tier, source, and stance. `build_envelope`
    carries this in a new `supports_detail`/`refutes_detail` pair,
    additive next to the existing `supports`/`refutes` id lists, so an
    existing reader of those two id lists sees no shape change."""
    return {
        "id": item.id, "tier": item.tier.value, "source_id": item.source_id, "stance": item.stance.value,
        "quote": item.span.quote, "doc_id": item.span.doc_id, "locator": item.span.locator,
        "char_start": item.span.char_start, "char_end": item.span.char_end,
    }


def _fmt_opt(value: float | None, decimals: int = 3) -> str:
    """`bkt-hte-retraction-propagation`: `render_card`'s own display
    rounding for a `CascadeEntry.old_p` that can read `None` (a
    candidate this run's cascade touched but that carried no opinion
    before this run at all, `hte.propagate.propagate`'s own documented
    case for a `changed` address absent from the given `opinions`)."""
    return f"{value:.{decimals}f}" if value is not None else "(none)"


def render_card(
    candidate: Candidate, ctx: RunContext, *, branch: str, signoff: str,
    understanding: str, novelty: novelty_mod.NoveltyResult, elo_label: str | None = None,
    canon_tier: str = CANON_TIER, cascade_entry: "propagate_mod.CascadeEntry | None" = None,
) -> str:
    """`understanding` is the plain-language explanation `hte.canon_
    writeback.write_back` generates through `hte.roles.understanding`
    before calling this function; `write_back` refuses to write any card
    at all when that text comes back blank (`bkt-hte-understanding-
    artifact`, `PLAN.md` section 10). `novelty` is this candidate's own
    `hte.novelty.check_novelty` result against `bucket-canon/`, computed
    the same way. `elo_label` is the ranking-holdout disclaimer sentence
    `hte.holdout_ledger.ranking_status` produced for this write-back pass
    (`None` defaults to that module's own unvalidated-state text, so a
    caller with no ledger state on hand still gets a correct card).

    `canon_tier` defaults to the module constant (`CANON_TIER`,
    `"candidate"`); `write_back` passes `"contested"` instead
    (`bkt-hte-retraction-propagation`) for a candidate whose own address
    appears in `cascade_entry` (`hte.propagate.CascadeReport.entries`,
    meaning this candidate's own support routed through a node this
    run's own cascade retracted). `cascade_entry` given (only under
    `canon_tier == "contested"`) adds a "Retraction cascade" section
    naming the old and new projected probability, hop count, and
    routed share this candidate's own address carried in that cascade."""
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

    if elo_label is None:
        elo_label = holdout_ledger.ranking_status().label

    closest = (
        f"`{novelty.closest_path}` ({novelty.closest_bucket}, similarity {novelty.closest_similarity:.3f})"
        if novelty.closest_path is not None else "(no bucket-canon/ material to compare against)"
    )

    lines = [
        f"# Hypothesis -- {_statement(corpus, candidate)}",
        "",
        f"> **canon_tier:** {canon_tier}",
        f"> **Branch:** {branch} - **Corpus:** {manifest.corpus or '(unrecorded)'} - **Campaign:** {manifest.campaign}",
        f"> **Run:** `{ctx.run_dir}` - **Hypothesis id:** `{candidate.short_id}` - **Address:** `{candidate.hypothesis.address}`",
        f"> **Added:** {today}, build-history campaign write-back",
        f"> **Signed off by:** {signoff}",
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
        elo_label,
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
        "## 6. Plain-language understanding",
        "",
        "> Model-written, generated by `hte.roles.understanding`. Not a claim that any "
        "human has reconstructed or verified this explanation independently "
        "(Messeri and Crockett 2024).",
        "",
        understanding,
        "",
        "## 7. Novelty",
        "",
        f"Novelty score: {novelty.score:.3f} (1.0 = no lexical overlap found; 0.0 = a "
        f"near-duplicate exists). Compared against {novelty.n_compared} file(s) under "
        "`bucket-canon/`. Closest match: " + closest + ".",
        "",
    ]
    if cascade_entry is not None:
        lines += [
            "## 8. Retraction cascade",
            "",
            f"`canon_tier: {canon_tier}`. This candidate's own support routed through a node "
            "this run's own retraction cascade moved (`docs/PROPAGATION.md`); its own opinion "
            "above already reflects the recompute below.",
            "",
            "| Old P(h) | New P(h) | Hops from root | Routed share |",
            "|---|---|---|---|",
            f"| {_fmt_opt(cascade_entry.old_p)} | {cascade_entry.new_p:.3f} | "
            f"{cascade_entry.hops} | {cascade_entry.routed_share:.3f} |",
            "",
        ]
    lines += [
        "## 9. Provenance" if cascade_entry is not None else "## 8. Provenance",
        "",
        f"- Corpus: `{manifest.corpus}`",
        f"- Run directory: `{ctx.run_dir}`",
        f"- Run id: `{ctx.run_id}`",
        f"- Generated: {datetime.now(timezone.utc).isoformat()}",
        f"- Signed off by: {signoff}",
        "",
    ]
    return "\n".join(lines) + "\n"


def render_index(cards: list[tuple[Candidate, Path]], *, branch: str, elo_label: str | None = None) -> str:
    if elo_label is None:
        elo_label = holdout_ledger.ranking_status().label
    lines = [
        f"# {branch} hypothesis cards",
        "",
        "Candidate tier throughout. Written by `hte.canon_writeback.write_back`. See `docs/BUILD-HISTORY.md`.",
        "",
        elo_label,
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


def _ingestion_index_addendum(cards: list[tuple[Candidate, Path]], *, branch: str, ctx: RunContext, signoff: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [
        f"## Recent additions, {today}",
        "",
        f"Build-history write-back. {len(cards)} hypothesis card(s) written from `hte.canon_"
        f"writeback.write_back` over `{ctx.manifest.corpus}` run `{ctx.run_id}`, `canon_tier: "
        "candidate` throughout. Promotion to canon stays a human review step, `GOVERNANCE.md`. "
        f"Signed off by {signoff}.",
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


def build_envelope(
    cards: list[tuple[Candidate, Path]], *, branch: str, ctx: RunContext, floor_P: float, floor_u_max: float,
    signoff: str, understanding_by_id: dict[str, str] | None = None,
    novelty_by_id: dict[str, novelty_mod.NoveltyResult] | None = None,
    ranking: holdout_ledger.RankingStatus | None = None,
    cascade_report: "propagate_mod.CascadeReport | None" = None,
) -> dict[str, Any]:
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

    `understanding_by_id`/`novelty_by_id` (keyed by `candidate.short_id`,
    both default `{}` when not given, `write_back`'s own dry-run path has
    neither yet computed) and `ranking` (defaults to `hte.holdout_ledger.
    ranking_status()`'s current on-disk state) fill the `understanding`,
    `novelty`, and `elo_status` fields below; see `render_card`'s own
    docstring for what each one is and why `write_back` refuses to write
    a card at all when `understanding_by_id` carries no text for it.
    """
    understanding_by_id = understanding_by_id or {}
    novelty_by_id = novelty_by_id or {}
    if ranking is None:
        ranking = holdout_ledger.ranking_status()
    cascade_by_address = {e.address: e for e in cascade_report.entries} if cascade_report is not None else {}
    now = datetime.now(timezone.utc).isoformat()
    items = []
    for candidate, path in cards:
        rel_path = str(path.relative_to(REPO_ROOT))
        novelty_result = novelty_by_id.get(candidate.short_id)
        cascade_entry = cascade_by_address.get(candidate.hypothesis.address)
        item_tier = CONTESTED_TIER if cascade_entry is not None else CANON_TIER
        items.append({
            "data": {
                "statement": _statement(ctx.corpus, candidate),
                "slots": {name: {"id": candidate.slots.get(name), "label": _label_of(ctx.corpus, name, candidate.slots.get(name))} for name in _SLOT_NAMES},
                "interval": {"start": candidate.interval.start, "end": candidate.interval.end, "label": candidate.bin_label},
                "opinion": candidate.opinion.to_dict(),
                "posterior": candidate.posterior,
                "elo": candidate.elo,
                "elo_status": ranking.elo_status,
                "elo_status_detail": ranking.to_dict(),
                "understanding": {
                    "text": understanding_by_id.get(candidate.short_id),
                    "generated_by": "model",
                    "role": "understanding",
                },
                "novelty": novelty_result.to_dict() if novelty_result is not None else None,
                "evidence": {
                    "supports": [item.id for item in candidate.supports],
                    "refutes": [item.id for item in candidate.refutes],
                    "supports_detail": [_evidence_detail(item) for item in candidate.supports],
                    "refutes_detail": [_evidence_detail(item) for item in candidate.refutes],
                },
                "cascade": cascade_entry.to_dict() if cascade_entry is not None else None,
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
            "canon_tier": item_tier,
            "foundation_branches": [branch],
            "provenance": [{
                "action": "generated", "at": now, "by": "hte.canon_writeback",
                "via": f"tools/hypothesis-engine/{ctx.run_dir}",
            }, {
                "action": "signoff", "at": now, "by": signoff,
                "note": "human sign-off required before write_back touches bucket-canon/, PLAN.md section 10",
            }],
            "card_path": rel_path,
        })

    return {
        "version": "bucket.foundation/v0.1",
        "run_id": ctx.run_id,
        "corpus": ctx.manifest.corpus,
        "campaign": ctx.manifest.campaign,
        "generated_at": now,
        "signed_off_by": signoff,
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
    signoff: str | None = None,
    floor_P: float = 0.6,
    floor_u_max: float = 0.5,
    out_root: str | Path = "bucket-canon",
    dry_run: bool = False,
    cache_dir: str | Path | None = None,
    replay_only: bool = False,
    ledger_path: str | Path | None = None,
    cascade_report: "propagate_mod.CascadeReport | None" = None,
) -> list[Path]:
    """Turn the completed run at `run_dir` into canon-facing material:
    one card per surviving hypothesis at or above the credence floor
    (`select_above_floor`) under `<out_root>/<branch>/hypotheses/
    <address-short>.md`, that branch's own `hypotheses/INDEX.md`, a dated
    addendum block appended to `CANON-INGESTION-INDEX.md`, one feed event
    per card plus the index (`tools/feed/feed.py`'s own API), and a
    feed402-shaped envelope at `public/research/hypotheses/<run-id>.json`
    (`build_envelope`).

    `cascade_report` (`bkt-hte-retraction-propagation`, `docs/
    PROPAGATION.md`), when given, is `run_dir`'s own `cascade.json`
    (`hte.propagate.CascadeReport`, read back through `hte.artifacts.
    load_run` or passed straight through from the same `run_campaign`
    call that produced it): every SELECTED candidate whose own address
    appears in `cascade_report.entries` gets `canon_tier: "contested"`
    (`CONTESTED_TIER`) instead of `CANON_TIER`, with that entry's own
    old/new projected probability, hop count, and routed share attached
    to its card (`render_card`'s own "Retraction cascade" section) and
    to the envelope's per-item `data.cascade`. One additional feed event
    (`type="retract"`, the same type `tools/feed/parse.py` already uses
    for a canon file's own deletion, read here as "this claim's own
    standing was retracted") is emitted per contested card, alongside
    the ordinary `add_canon_entry` event every card gets regardless.

    `signoff` is a named human approver, an identity (e.g. `"gianyrox"`),
    and is required: a missing or blank `signoff` is a hard refusal
    (`ValueError`), raised before `reconstruct_candidates` even runs, so
    no partial state and no file ever gets written without one.
    This is the gate `learning/research-os/PLAN.md` section 10 and
    `GOVERNANCE.md` ask for: no unattended write into `bucket-canon/`,
    regardless of `canon_tier`. `signoff` is recorded in every card's
    provenance section, the envelope's per-item provenance and top-level
    `signed_off_by`, and the `CANON-INGESTION-INDEX.md` addendum, so the
    approver is legible from the entry itself.

    `dry_run=True` lists every path this call WOULD write (as a caller-
    facing plan) and touches no file on disk at all, `hte.pipeline.
    run_pipeline`'s own dry-run convention for `hte.publish.publish`
    extended to this stage. `signoff` is still required under `dry_run`:
    a plan naming what would be written under whose approval is itself
    part of the approval record. `dry_run` does NOT run the understanding
    or novelty checks below (no LLM call, no corpus scan): those cost
    real work and belong to the commit path, a path-listing preview stays
    free.
    Returns the list of paths written (or, under `dry_run`, the list of
    paths that would be written), in the same order every time for one
    run and one set of floors: the cards first, ranked by descending
    posterior, then the branch index, then the ingestion-index file, then
    the envelope.

    `cache_dir` (default: `<run_dir>/_writeback-llm-cache`, a dedicated
    subdirectory of the run being written back rather than the run's own
    campaign cache, so a re-entrant write-back call never contends with
    a live campaign's own cache writes) and `replay_only` (default
    `False`) are passed straight through to `hte.roles.understanding`,
    the one LLM-backed call this function makes. Set `HTE_LLM_MODE=fake`
    (or pass `cache_dir` pointing at a committed fixture cache) for a
    deterministic, no-network write-back, the same convention every
    other role-calling test in this package already follows.

    `ledger_path` (default: `hte.holdout_ledger.DEFAULT_LEDGER_PATH`, the
    committed repo ledger) overrides where this call reads the current
    ranking-holdout state from and appends this run's own new entries
    to; a test redirects it at a `tmp_path` file so running the suite
    never mutates the real committed ledger.

    `bkt-hte-understanding-artifact` (`PLAN.md` section 10's
    understanding axis, Messeri and Crockett 2024, Krenn and others
    2022): every selected candidate's own plain-language explanation is
    generated before ANY file is written, and a blank explanation for
    even one candidate is a hard refusal (`ValueError`), the same
    no-partial-state guarantee `signoff` already gets, because a card
    with no understanding artifact is exactly the write-back gate this
    bead exists to close.

    Never writes `canon_tier: canon`: see this module's own top
    docstring and `GOVERNANCE.md`.
    """
    if not branch:
        raise ValueError("hte.canon_writeback.write_back: branch is required")
    if not signoff or not signoff.strip():
        raise ValueError(
            "hte.canon_writeback.write_back: signoff is required, a named human "
            "approver, before any write into bucket-canon/ (PLAN.md section 10, "
            "GOVERNANCE.md); refusing to write unattended"
        )

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

    resolved_cache_dir = str(cache_dir) if cache_dir is not None else str(Path(run_dir) / "_writeback-llm-cache")

    understanding_by_id: dict[str, str] = {}
    blank_ids: list[str] = []
    for candidate, _ in card_paths:
        statement = _statement(ctx.corpus, candidate)
        evidence_summary = (
            f"{len(candidate.supports)} supporting and {len(candidate.refutes)} refuting "
            f"evidence item(s), P(h)={candidate.posterior:.3f}"
        )
        response = roles.understanding(
            statement, evidence_summary, cache_dir=resolved_cache_dir, replay_only=replay_only,
        )
        text = str(response.get("explanation") or "").strip()
        understanding_by_id[candidate.short_id] = text
        if not text:
            blank_ids.append(candidate.short_id)
    if blank_ids:
        raise ValueError(
            "hte.canon_writeback.write_back: understanding text is required for every "
            f"candidate before any write into bucket-canon/ (PLAN.md section 10, "
            f"Messeri and Crockett 2024); blank for {blank_ids}; refusing to write"
        )

    novelty_by_id: dict[str, novelty_mod.NoveltyResult] = {
        candidate.short_id: novelty_mod.check_novelty(_statement(ctx.corpus, candidate), repo_root=REPO_ROOT)
        for candidate, _ in card_paths
    }

    resolved_ledger_path = ledger_path if ledger_path is not None else holdout_ledger.DEFAULT_LEDGER_PATH
    ranking = holdout_ledger.ranking_status(path=resolved_ledger_path)
    ranked_for_ledger = sorted(
        card_paths, key=lambda pair: pair[0].elo if pair[0].elo is not None else float("-inf"), reverse=True,
    )
    ledger_rows = [
        {"address": candidate.hypothesis.address, "short_id": candidate.short_id,
         "statement": _statement(ctx.corpus, candidate), "elo": candidate.elo}
        for candidate, _ in ranked_for_ledger
    ]
    new_entries = holdout_ledger.build_entries(ledger_rows, run_id=ctx.run_id, corpus=ctx.manifest.corpus)
    added_entries = holdout_ledger.append_entries(new_entries, path=resolved_ledger_path)
    logger.info(
        "hte.canon_writeback.write_back: recorded %d new ranking-holdout ledger entr(y/ies) for %s",
        len(added_entries), ctx.run_id,
    )

    # `bkt-hte-retraction-propagation`: every SELECTED candidate whose
    # own address this run's own cascade moved gets `canon_tier:
    # "contested"` in place of `CANON_TIER`, its own `CascadeEntry`
    # attached to its card and to the envelope. `cascade_report is None`
    # (no retraction on file, or a caller that has not wired this
    # parameter through yet) reads every candidate as ordinary
    # `CANON_TIER` material, this function's own pre-existing behavior.
    cascade_by_address = {e.address: e for e in cascade_report.entries} if cascade_report is not None else {}

    hypotheses_dir.mkdir(parents=True, exist_ok=True)
    contested_cards: list[tuple[Candidate, Path]] = []
    for candidate, path in card_paths:
        cascade_entry = cascade_by_address.get(candidate.hypothesis.address)
        tier = CONTESTED_TIER if cascade_entry is not None else CANON_TIER
        if cascade_entry is not None:
            contested_cards.append((candidate, path))
        card_text = render_card(
            candidate, ctx, branch=branch, signoff=signoff,
            understanding=understanding_by_id[candidate.short_id],
            novelty=novelty_by_id[candidate.short_id], elo_label=ranking.label,
            canon_tier=tier, cascade_entry=cascade_entry,
        )
        path.write_text(card_text, encoding="utf-8")
    index_path.write_text(render_index(card_paths, branch=branch, elo_label=ranking.label), encoding="utf-8")

    _append_ingestion_index(_ingestion_index_addendum(card_paths, branch=branch, ctx=ctx, signoff=signoff))

    events = _feed_events_for_cards(card_paths, branch=branch, ctx=ctx)
    if contested_cards:
        # A retraction feed event alongside the ordinary `add_canon_entry`
        # every card gets above: `type="retract"`, the same type `tools/
        # feed/parse.py` already emits for a canon file's own deletion,
        # read here as "this claim's own standing was retracted" rather
        # than the file having been removed (it has not: `write_back`
        # never deletes a card, per this module's own top docstring).
        import sys
        if str(FEED_TOOL_DIR) not in sys.path:
            sys.path.insert(0, str(FEED_TOOL_DIR))
        import parse as feed_parse  # tools/feed/parse.py
        commit_sha = _current_commit_sha()
        ts = datetime.now(timezone.utc).isoformat()
        for candidate, path in contested_cards:
            rel_path = str(path.relative_to(REPO_ROOT))
            events.append(feed_parse.make_event(
                type="retract", path=rel_path, commit_sha=commit_sha,
                branch=branch, title=_statement(ctx.corpus, candidate), timestamp=ts,
                _extra="cascade",
            ))
    added = _emit_feed_events(events)
    logger.info(
        "hte.canon_writeback.write_back: fed %d new event(s) into tools/feed/feed.py "
        "(%d contested by this run's own retraction cascade)",
        added, len(contested_cards),
    )

    envelope_dir.mkdir(parents=True, exist_ok=True)
    envelope = build_envelope(
        card_paths, branch=branch, ctx=ctx, floor_P=floor_P, floor_u_max=floor_u_max, signoff=signoff,
        understanding_by_id=understanding_by_id, novelty_by_id=novelty_by_id, ranking=ranking,
        cascade_report=cascade_report,
    )
    envelope_path.write_text(json.dumps(envelope, indent=2), encoding="utf-8")

    from . import bridge_export
    bridge_export.write_bridge_export(run_dir, envelope_path=envelope_path, floor_P=floor_P, floor_u_max=floor_u_max, branch=branch)

    return written


__all__ = [
    "Candidate", "RunContext", "CANON_TIER", "CONTESTED_TIER",
    "reconstruct_candidates", "select_above_floor",
    "render_card", "render_index", "build_envelope",
    "write_back",
]
