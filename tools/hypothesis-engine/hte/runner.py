"""`run_campaign`: the whole engine loop, one call, no human prompt.

Wires every module in this package into the loop `main.tex` §8 diagrams
and `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §7 extends: load a corpus, grow the
vocabulary from the unknown-unknown role, generate a combinatorial sample
plus an evidence-driven pass, score every survivor, critique and rank
them, measure robustness and surprise, estimate coverage over repeated
seeds, self-report, and export. Every step appends to `run.log`; nothing
in this module ever prompts a person, per `main.tex` §8's target-blind,
unattended engine loop.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence

from . import artifacts, batching, calibrate, export, link, llm, prior_ledger, propagate, roles, tournament, unknowns
from .address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START, time_bin_index
from .belief import Opinion, load_constants, load_detectability_table, score as belief_score
from .concepts import Concept, ConsensusStatus, Slot, Vocabulary
from .corpus import Corpus, quantum_history
from .corpus import education_atlas, fixtures as fixtures_corpus, literature, production, sacred_history, sacred_history_texts, younger_dryas
from .corpus import vindication_fixture
from .evidence import Stance, EvidenceItem
from .generate import combinatorial_sample, from_evidence, stratified_sample
from .hypothesis import Hypothesis
from .timeline import (
    Interval, Resolution, RESOLUTION_WIDTH_YEARS, auto_resolution, bin_bounds, bin_label,
    clamp_log, reset_clamp_log,
)

DEFAULT_CONFIG: dict[str, Any] = {
    "campaign": "default",
    "corpus": "quantum-history",
    "out_dir": "runs",
    "cache_dir": None,           # defaults to <out_dir>/_llm-cache
    "replay_only": False,
    "seeds": 3,
    # Raised from 5/20/40 (`bkt-hte-evidence-slots`'s own coverage fix):
    # once `hte.generate.from_evidence` builds a placement per evidence
    # item's own extracted slots instead of only per already-linked
    # address, a corpus this package's size (16 sources, 161 evidence
    # items, 105 ground-truth events) generates thousands of distinct
    # addresses; a `max_hypotheses` still in the tens kept too few to
    # clear this corpus's 13 decade bins with real depth. 400 clears
    # every one of them (empirically checked against the shipped
    # quantum-history corpus, `bkt-hte-evidence-slots`'s own regression
    # note). Which of the addresses above 400 survive the cap is
    # `hte.generate.stratified_sample`'s own call: a stratified sample
    # by actor and status (`STATISTICAL-AUDIT-2026-09-15.md` item 1),
    # in place of the old `sorted(...)[:cap]`, which kept whichever
    # actor the vocabulary listed first, every run.
    "generate_n": 20,
    "generate_evidence_sample": 8,
    "combinatorial_max_items": 150,
    # `hte.generate.combinatorial_sample`'s own knob: draws the ACTOR's
    # `ConsensusStatus` class before the actor itself, so a class the
    # vocabulary names once draws as much as one it names a hundred
    # times (`STATISTICAL-AUDIT-2026-09-15.md` item 2). `False` restores
    # the flat per-actor draw this replaces.
    "combinatorial_status_balanced": True,
    "max_hypotheses": 400,
    # `hte.generate.stratified_sample`'s own seed, apart from `seeds`
    # above (`seeds` counts generation passes; this seeds the one
    # sampling step run afterward, over every pass's merged pool).
    "sampling_seed": 0,
    "tournament_rounds": 2,
    "top_k": 5,
    # Raised from 4 for the same reason: a strided 4-bin sample was
    # built for `hte.address`'s own archaeological-scale span and hides
    # most of a corpus whose own ground truth now spans 13 decade bins
    # once generation reaches all of them.
    "max_time_bins": 20,
    "cutoff_years": None,        # defaults to the corpus's own median ground-truth year
    "run_calibration": True,
    "run_extraction": True,
    "resolution": None,          # None auto-selects a rung from the corpus's own span (hte.timeline.auto_resolution); a named rung ("century", ...) pins it and reuses the paper's original fixed 20,000-year span
    "link_threshold": 0.6,
    "prior_ledger": None,        # path of the cross-campaign Beta-prior ledger (hte.prior_ledger); None leaves the label priors as written
    # Throughput wiring (`bkt-hte-throughput`, `docs/THROUGHPUT.md`):
    # `critic_batch_size`/`judge_batch_size` are `hte.batching.
    # batch_critique`/`batch_judge`'s own `batch_size`, hypotheses (or
    # judge pairs) per `claude -p` call; `1` degrades each to exactly
    # one call per item, the single-call fallback this wiring keeps
    # available with no other config change. `llm_workers` threads
    # through to `hte.llm.complete_many`/`hte.parallel.pmap`'s own
    # `workers` argument; `None` (the default) reads `HTE_LLM_WORKERS`
    # from the environment (`hte.parallel.configure`'s own fallback)
    # rather than fixing a worker count in code.
    "critic_batch_size": 8,
    "judge_batch_size": 8,
    "preservation_batch_size": 8,
    "advocate_k": 8,             # lowest-prior survivors the devil's advocate argues for (0 turns the role off)
    "llm_workers": None,
    # k-fold evidence holdout (`bkt-hte-calibration-redesign`,
    # `hte.calibrate.holdout_kfold`): folds and its own stratification
    # seed, read only when `hte.calibrate.choose_holdout_mode` picks
    # k-fold over discovery-date for this corpus's own ground truth.
    "holdout_k": 5,
    "holdout_seed": 0,
    # `"fitted"` (the default) reads `hte.belief.load_constants`'s own
    # pooled-fit result (`docs/CALIBRATION-FIT-2026-09-10.md`,
    # `hte/data/constants-fitted.json`), falling back to `Constants()`'s
    # bare defaults with no such file on disk; `"default"` opts out
    # explicitly (`hte campaign run --constants default`), matching
    # `load_constants`'s own two-value contract.
    "constants": "fitted",
    # STATISTICAL-AUDIT-2026-09-15.md item 5 (preregistration): the
    # `hte.canon_writeback` claim-gate criteria, unused by `run_campaign`
    # itself, kept here only so `_prereg_criteria` can hash them before
    # generation starts; `write_back` still takes its own floor/fdr_q args.
    "floor_P": 0.6,
    "floor_u_max": 0.5,
    "lift_floor": 0.25,
    "fdr_q": 1.0,
}


def _prereg_criteria(cfg: dict[str, Any]) -> dict[str, Any]:
    """The seven values a campaign commits to before generating a single
    hypothesis (item 5): the three credence floors, `fdr_q`,
    `link_threshold`, `max_hypotheses`, `seeds`. Read straight off `cfg`,
    never off anything this run computes."""
    return {
        "floor_P": cfg["floor_P"],
        "floor_u": cfg["floor_u_max"],
        "lift_floor": cfg["lift_floor"],
        "fdr_q": cfg["fdr_q"],
        "link_threshold": cfg["link_threshold"],
        "max_hypotheses": cfg["max_hypotheses"],
        "seeds": cfg["seeds"],
    }


def _prereg_manifest(cfg: dict[str, Any]) -> dict[str, Any]:
    """`MANIFEST.json["prereg"]`: `_prereg_criteria(cfg)` plus a sha256
    over its own canonical JSON, so two runs from the same config share
    a hash and a changed criterion never does."""
    criteria = _prereg_criteria(cfg)
    canonical = json.dumps(criteria, sort_keys=True, separators=(",", ":"))
    return {"criteria": criteria, "sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest()}


_CORPUS_LOADERS: dict[str, Callable[[], Corpus]] = {
    "quantum-history": quantum_history.ingest,
    "fixtures": fixtures_corpus.build,
    "vindication-fixture": vindication_fixture.build,
    "education-atlas": education_atlas.load,
    "production": production.load,
    "literature": literature.load_default,
    "sacred-history": sacred_history.ingest,
    # Passage-level extraction over the primary texts this repo mirrors
    # for 6 of `sacred-history`'s 13 traditions; see `hte.cli.
    # _CORPUS_LOADERS`'s own identical entry and `hte.corpus.
    # sacred_history_texts`'s own module docstring.
    "sacred-history-texts": sacred_history_texts.load,
    # 47 open-metadata, DOI-verified cards on the Younger Dryas boundary
    # (12.9-11.7 ka BP) impact-hypothesis debate, no network fetch (see
    # `hte.corpus.younger_dryas`'s own module docstring).
    "younger-dryas": younger_dryas.load,
}


class Logger:
    """A tiny, dependency-free run logger: every `log()` call appends one
    timestamped line to `run_dir/run.log`. Deliberately not Python's
    `logging` module, which configures process-global state a test suite
    running several campaigns in one process would otherwise leak
    between runs."""

    def __init__(self, path: Path, *, echo: bool = False):
        self.path = path
        self.echo = echo
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.touch(exist_ok=True)

    def log(self, message: str) -> None:
        line = f"{datetime.now(timezone.utc).isoformat()} {message}"
        with self.path.open("a") as f:
            f.write(line + "\n")
        if self.echo:
            print(line)


@dataclass
class RunArtifacts:
    """Everything one `run_campaign` call produced, and where it landed
    on disk."""
    run_dir: Path
    corpus: Corpus
    hypotheses: list[Hypothesis]
    opinions: dict[int, Opinion]
    elos: dict[int, float]
    coverage: dict[str, Any]
    surprise_items: list[EvidenceItem]
    self_report: dict[str, Any]
    manifest: dict[str, Any]
    calibration: dict[str, Any] | None = field(default=None)


def _git_sha() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True,
            cwd=Path(__file__).resolve().parents[2], timeout=10,
        )
        return out.stdout.strip() if out.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


def _slugify(label: str, prefix: str = "uu") -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-") or "concept"
    return f"{prefix}-{slug}"


def _unique_id(vocab: Vocabulary, slot: Slot, base_id: str) -> str:
    if vocab.get(slot, base_id) is None:
        return base_id
    n = 2
    while vocab.get(slot, f"{base_id}-{n}") is not None:
        n += 1
    return f"{base_id}-{n}"


_YEAR_RE = re.compile(r"(?<!\d)(1[0-9]\d{2}|20\d{2})(?!\d)")


def _parse_year_hint(text: str, default: int) -> int:
    m = _YEAR_RE.search(text or "")
    return int(m.group(1)) if m else default


def _resolve_slot_value(vocab: Vocabulary, slot: Slot, value: str) -> str:
    from .concepts import other_id
    if vocab.get(slot, value) is not None:
        return value
    return other_id(slot)


def _time_bins_for(corpus: Corpus, max_bins: int, *, span_start: int, bin_width: int) -> list[int]:
    years = [g.year for g in corpus.ground_truth]
    if not years:
        return [time_bin_index(2000, span_start, bin_width)]
    bins = sorted({time_bin_index(y, span_start, bin_width) for y in years})
    if len(bins) <= max_bins:
        return bins
    step = max(1, len(bins) // max_bins)
    return bins[::step][:max_bins]


def _resolve_time_binning(cfg: dict[str, Any], corpus: Corpus) -> tuple[Resolution, int, int]:
    """`(resolution, span_start, bin_width)` for this run's own TIME_BIN
    axis (defect: a 126-year corpus collapsing into two century bins,
    one of them spilling a 1900 milestone into the century labeled
    "2000-2099"). `cfg["resolution"]` unset (`None`, the default) auto-
    selects a rung from the corpus's own ground-truth span (`hte.
    timeline.auto_resolution`) and anchors bin 0 at that span's own
    earliest year (`hte.timeline.bin_bounds`), so bins read as "1900s",
    "1910s", ... instead of the paper's own archaeological-scale "bin
    219". A pinned `cfg["resolution"]` instead reuses `hte.address`'s
    original fixed 20,000-year span at that rung's own width, reproducing
    this package's pre-fix behavior exactly; a tracked run cache, keyed
    by prompt text, replays only under the resolution it was recorded with.

    The span this function returns is anchored at the union of every
    ground-truth event's own year AND every `corpus.evidence` item's own
    extracted interval (`bkt-hte-binning-span-coverage`, 2026-09-10: an
    `education-atlas` campaign died with `ValueError: year 2000 sits
    before the span start 2002`, `_llm_proposed_hypotheses`'s own
    generator-role proposal naming a year an evidence item's own
    extracted interval carried, that this function's prior ground-truth-
    only span never covered). Vocab-growth proposals (`_grow_vocab`)
    carry no interval of their own (`hte.concepts.Concept` has no date
    field) and so add nothing further to union over. Widening the span
    this way is the primary defense; `hte.timeline.time_bin_index`'s own
    clamp-not-raise contract is the fallback for whatever a real corpus's
    evidence still does not cover (a generator role's own hallucinated
    year, naming no evidence item at all).
    """
    if cfg["resolution"] is not None:
        resolution = Resolution(cfg["resolution"])
        return resolution, DEFAULT_SPAN_START, RESOLUTION_WIDTH_YEARS[resolution]
    intervals = [Interval(start=g.year, end=g.year) for g in corpus.ground_truth]
    intervals += [e.interval for e in corpus.evidence if e.interval is not None]
    if not intervals:
        return Resolution.CENTURY, DEFAULT_SPAN_START, RESOLUTION_WIDTH_YEARS[Resolution.CENTURY]
    resolution = auto_resolution(intervals)
    span_start = bin_bounds(min(iv.start for iv in intervals), resolution)[0]
    return resolution, span_start, RESOLUTION_WIDTH_YEARS[resolution]


def _grow_vocab(
    vocab: Vocabulary, evidence: list[EvidenceItem], *, cache_dir: str, replay_only: bool, logger: Logger,
) -> list[dict[str, Any]]:
    sample = evidence[: min(len(evidence), 10)]
    response = roles.unknown_unknown(vocab, sample, cache_dir=cache_dir, replay_only=replay_only)
    added = []
    for proposal in response.get("proposals", []):
        try:
            slot = Slot(proposal["slot"])
        except ValueError:
            logger.log(f"unknown_unknown proposed an unrecognized slot, skipped: {proposal}")
            continue
        base_id = _slugify(proposal["label"])
        concept_id = _unique_id(vocab, slot, base_id)
        vocab.add(Concept(
            id=concept_id, slot=slot, label=proposal["label"], prior_logit=0.0,
            consensus_status=ConsensusStatus.CONTESTED,
        ))
        added.append({"slot": slot.value, "id": concept_id, "label": proposal["label"], "rationale": proposal.get("rationale", "")})
        logger.log(f"vocab growth: added {concept_id!r} to slot {slot.value!r}")
    return added


def _llm_proposed_hypotheses(
    corpus: Corpus, vocab: Vocabulary, *, config: dict[str, Any], cache_dir: str, replay_only: bool, logger: Logger,
    span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH,
) -> list[Hypothesis]:
    sample = corpus.evidence[: config["generate_evidence_sample"]]
    context = {"vocab": vocab, "evidence": sample, "n": config["generate_n"]}
    response = roles.generate(context, cache_dir=cache_dir, replay_only=replay_only)
    default_year = corpus.ground_truth[0].year if corpus.ground_truth else 2000
    evidence_by_id = {e.id: e for e in corpus.evidence}

    hypotheses: list[Hypothesis] = []
    for proposal in response.get("proposals", []):
        year = _parse_year_hint(proposal.get("time_hint", ""), default_year)
        from .timeline import Interval
        from .hypothesis import Placement
        placement = Placement(
            actor=_resolve_slot_value(vocab, Slot.ACTOR, proposal["actor"]),
            action=_resolve_slot_value(vocab, Slot.ACTION, proposal["action"]),
            object=_resolve_slot_value(vocab, Slot.OBJECT, proposal["object"]),
            place=_resolve_slot_value(vocab, Slot.PLACE, proposal["place"]),
            mechanism=_resolve_slot_value(vocab, Slot.MECHANISM, proposal["mechanism"]),
            interval=Interval(start=year, end=year),
        )
        claim_ids = [eid for eid in proposal.get("supporting_evidence_ids", []) if eid in evidence_by_id]
        hyp = Hypothesis.from_placement(placement, vocab, claims=claim_ids, span_start=span_start, bin_width=bin_width)
        hyp.meta = {"generator": "llm-generator-role", "evidence": claim_ids}
        for eid in claim_ids:
            if hyp.address not in evidence_by_id[eid].supports:
                evidence_by_id[eid].supports.append(hyp.address)
        hypotheses.append(hyp)
        logger.log(f"generator role proposed {hyp.short_id} from evidence {claim_ids}")
    return hypotheses


def _judge_adapter(cache_dir: str, replay_only: bool) -> tournament.Judge:
    def judge(a: Hypothesis, b: Hypothesis, context: dict) -> float:
        return roles.judge(a, b, context, cache_dir=cache_dir, replay_only=replay_only)
    return judge


def _judge_batch_adapter(
    cache_dir: str, replay_only: bool, *, batch_size: int, workers: int | None,
) -> tournament.BatchJudge:
    """`docs/THROUGHPUT.md`'s own recipe for the tournament's judge
    calls: `hte.batching.batch_judge` wired as `hte.tournament.run`'s
    optional `judge_batch` hook, `batch_size` pairs per `claude -p` call
    instead of one call per pair, `workers` chunks in flight at a time
    (`batch_judge`'s own `hte.parallel.pmap` wiring, so batching and
    parallelism compound rather than batching alone leaving the reduced
    chunk count to run one at a time). `batch_judge`'s own per-id
    fallback (a pair the batch response drops, repeats, or answers
    incompletely falls back to one direct `hte.roles.judge` call) is
    this wiring's single-call fallback; `batch_size=1` degrades every
    round to exactly one call per pair."""
    def judge_batch(pairs: Sequence[tuple[Hypothesis, Hypothesis, dict]]) -> list[float]:
        return batching.batch_judge(
            pairs, batch_size=max(1, batch_size), cache_dir=cache_dir, replay_only=replay_only, workers=workers,
        )
    return judge_batch


def _judge_disagreement_count(
    triples: Sequence[tuple[int, int, float]], opinions: Mapping[int, Opinion],
) -> int:
    """How many `(addr_x, addr_y, score_x)` triples (one per judged
    pair, `score_x = P(addr_x wins)`) cross the side the belief-scored
    opinion already favored (`bkt-hte-blind-roles`); a tie in either
    the opinion or the score is never counted. This is the exact logic
    behind `MANIFEST.json["counts"]["judge_disagreement"]`."""
    count = 0
    for addr_x, addr_y, score_x in triples:
        p_x, p_y = opinions[addr_x].project(), opinions[addr_y].project()
        if p_x != p_y and score_x != 0.5 and (p_x > p_y) != (score_x > 0.5):
            count += 1
    return count


def _critic_survivors(
    hypotheses: list[Hypothesis], evidence: list[EvidenceItem], *, cache_dir: str, replay_only: bool,
    batch_size: int, workers: int | None, logger: Logger,
) -> tuple[list[Hypothesis], dict[int, dict[str, float]]]:
    """The critic-filtered survivor list, `hte.batching.batch_critique`
    wired per `docs/THROUGHPUT.md`'s own recipe: `batch_size`
    hypotheses per `claude -p` call, each hypothesis a batch entry that
    falls back to one direct `hte.roles.critique` call on its own
    (`hte.batching`'s own per-id fallback) rather than failing the whole
    batch when the response drops, repeats, or short-answers one entry,
    `workers` chunks in flight at a time (`batch_critique`'s own `hte.
    parallel.pmap` wiring). `batch_size=1` degrades this to exactly the
    old one-call-per-hypothesis behavior, the single-call fallback this
    wiring keeps available with no other code path needed."""
    reports = batching.batch_critique(
        hypotheses, evidence, batch_size=max(1, batch_size), cache_dir=cache_dir, replay_only=replay_only,
        workers=workers,
    )
    survivors: list[Hypothesis] = []
    ratios: dict[int, dict[str, float]] = {}
    for h, report in zip(hypotheses, reports):
        logger.log(f"critic on {h.short_id}: keep={report.get('keep')} issues={report.get('issues')}")
        if report.get("keep", True):
            survivors.append(h)
            ratios[h.address] = roles.likelihood_ratios(report)
    return survivors, ratios


def _run_advocate(
    survivors: list[Hypothesis], opinions: dict[int, Opinion], corpus: Corpus, table: Any, constants: Any,
    likelihood_ratios: Mapping[int, Mapping[str, float]], *, k: int, cache_dir: str, replay_only: bool, logger: Logger,
) -> dict[int, dict[str, Any]]:
    """The devil's advocate pass (`hte.roles.advocate`): for the `k`
    survivors with the lowest base rate `a`, ask for support the linker
    missed among unlinked items sharing a slot value, link what it names,
    rescore, and record the lift gained. Updates `opinions` in place for
    the argued hypotheses."""
    notes: dict[int, dict[str, Any]] = {}
    if k <= 0 or not survivors:
        return notes
    by_id = {e.id: e for e in corpus.evidence}
    targets = sorted(survivors, key=lambda h: (opinions[h.address].a, h.address))[:k]
    for h in targets:
        pool = roles.advocate_pool(h, corpus.evidence)
        before = opinions[h.address].lift()
        added: list[str] = []
        decisive = ""
        if pool:
            report = roles.advocate(h, pool, cache_dir=cache_dir, replay_only=replay_only)
            decisive = str(report.get("decisive_test", ""))
            allowed = {e.id for e in pool}
            for entry in report.get("support", []):
                eid = entry.get("id") if isinstance(entry, dict) else None
                if eid in allowed and h.address not in by_id[eid].supports:
                    by_id[eid].supports.append(h.address)
                    added.append(eid)
            if added:
                opinions[h.address] = belief_score(
                    h, corpus.evidence, corpus.vocab, table, sources=corpus.sources, constants=constants,
                    likelihood_ratios=likelihood_ratios.get(h.address),
                )
        after = opinions[h.address].lift()
        notes[h.address] = {"links_added": added, "lift_before": before, "lift_after": after, "decisive_test": decisive}
        logger.log(f"advocate on {h.short_id}: {len(added)} link(s) added, lift {before:.3f} -> {after:.3f}")
    return notes


def _advocate_summary(notes: Mapping[int, Mapping[str, Any]]) -> dict[str, Any]:
    gains = [n["lift_after"] - n["lift_before"] for n in notes.values()]
    return {
        "n_argued": len(notes),
        "links_added": sum(len(n["links_added"]) for n in notes.values()),
        "mean_gain": (sum(gains) / len(gains)) if gains else None,
    }


def stance_audit(evidence: Sequence[EvidenceItem]) -> dict[str, dict[str, int]]:
    """Per ACTOR slot value an item names: how many items assert it
    (`Stance.POSITIVE`) and how many deny or downgrade it (`NEGATIVE`),
    plus items naming no actor under `"(none)"`. The corpus's own stance
    balance, printed before any scoring so a lopsided card set is visible
    up front (`STATISTICAL-AUDIT-2026-09-15.md`, Evidence: 60 of 68 bound
    live survivors carried only refutations)."""
    audit: dict[str, dict[str, int]] = {}
    for item in evidence:
        row = audit.setdefault(item.actor or "(none)", {"positive": 0, "negative": 0})
        row["positive" if item.stance == Stance.POSITIVE else "negative"] += 1
    return dict(sorted(audit.items(), key=lambda kv: (-(kv[1]["positive"] + kv[1]["negative"]), kv[0])))


def _survivor_opinion(opinion: Opinion) -> dict[str, float]:
    """`opinion.to_dict()` (`hte.belief.Opinion.to_dict`) plus its own
    projected credence `P`, the shape `survivors.json` persists per
    hypothesis. Kept local rather than folded into `Opinion.to_dict()`
    itself: `hte.canon_writeback`'s own feed402 envelope already writes
    `candidate.opinion.to_dict()` as a sibling of a separate `posterior`
    field, and widening `to_dict()`'s own four-key contract would reach
    that call site's own output shape too, for no gain here."""
    return {**opinion.to_dict(), "P": opinion.project()}


def _survivor_slots(h: Hypothesis) -> dict[str, Any]:
    """`hte.export._slots_of`'s own ACTOR/ACTION/OBJECT/PLACE/MECHANISM
    dict, plus a TIME entry for every placement `h` carries. A placement
    hypothesis has one placement and one interval, so it gets one flat
    dict with TIME added; a sequence hypothesis has two placements and
    the Allen relation between them, so it gets a top-level RELATION
    plus one nested `first`/`second` dict, each built the same way."""
    if h.is_sequence:
        seq = h.content
        return {
            "RELATION": seq.relation.value,
            "first": {**export._slots_of(seq.first), "TIME": {"start": seq.first.interval.start, "end": seq.first.interval.end}},
            "second": {**export._slots_of(seq.second), "TIME": {"start": seq.second.interval.start, "end": seq.second.interval.end}},
        }
    placement = h.content
    return {**export._slots_of(placement), "TIME": {"start": placement.interval.start, "end": placement.interval.end}}


def run_campaign(config: dict[str, Any] | None = None) -> RunArtifacts:
    """Run the whole engine loop once and write every artifact under
    `<out_dir>/<campaign>/<timestamp>/`. `config` overrides
    `DEFAULT_CONFIG`; every key `DEFAULT_CONFIG` names may be overridden,
    no others are read.
    """
    cfg = {**DEFAULT_CONFIG, **(config or {})}
    # Item 5: the claim-gate criteria hash, computed from `cfg` alone
    # right here, before a single hypothesis exists. Carried to
    # `manifest["prereg"]` far below (`README.md`'s "Running a real
    # campaign" section).
    prereg = _prereg_manifest(cfg)
    # This run's own `llm.stats()` snapshot (`docs/THROUGHPUT.md`), reset
    # here rather than accumulated across every campaign this process has run.
    # `roles.reset_refusal_log()` resets alongside it (`bkt-hte-refusal-
    # handling`), so this run's own MANIFEST.json/self-report/run.log
    # report only the refusals/truncations this run's own roles hit.
    # `reset_clamp_log()` (`FINDING-2026-09-10-103`) gets the same
    # treatment for `hte.timeline.time_bin_index`'s own clamp events.
    llm.reset_stats()
    roles.reset_refusal_log()
    reset_clamp_log()
    out_root = Path(cfg["out_dir"]) / cfg["campaign"]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = out_root / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = cfg["cache_dir"] or str(Path(cfg["out_dir"]) / "_llm-cache")
    replay_only = bool(cfg["replay_only"])
    logger = Logger(run_dir / "run.log", echo=bool(cfg.get("verbose", False)))
    logger.log(f"campaign {cfg['campaign']!r} starting, corpus={cfg['corpus']!r}, replay_only={replay_only}")

    if cfg["corpus"] not in _CORPUS_LOADERS:
        raise ValueError(f"unknown corpus {cfg['corpus']!r}, expected one of {list(_CORPUS_LOADERS)}")
    corpus = _CORPUS_LOADERS[cfg["corpus"]]()
    stance = stance_audit(corpus.evidence)
    logger.log("stance audit: " + ", ".join(f"{actor} +{c['positive']}/-{c['negative']}" for actor, c in stance.items()))
    prior_ledger_note: dict[str, Any] = {"path": cfg["prior_ledger"], "applied": 0, "runs": 0, "appended": 0}
    if cfg["prior_ledger"]:
        ledger_counts, ledger_runs = prior_ledger.load_counts(cfg["prior_ledger"], corpus=cfg["corpus"])
        prior_ledger_note["applied"] = prior_ledger.apply(corpus.vocab, ledger_counts)
        prior_ledger_note["runs"] = ledger_runs
        logger.log(f"prior ledger: {prior_ledger_note['applied']} concept priors updated from {ledger_runs} earlier run(s)")
    logger.log(f"loaded corpus: {len(corpus.sources)} sources, {len(corpus.evidence)} evidence items, {len(corpus.ground_truth)} ground-truth events")

    extraction_note = None
    if cfg["run_extraction"] and corpus.sources:
        # `_first_document` returns `None` outright (`bkt-hte-corpus-
        # registration`, fixed 2026-09-10: caught here rather than
        # unpacked unconditionally, which raised `TypeError: cannot
        # unpack non-iterable NoneType object` for every corpus other
        # than "quantum-history"/"fixtures", `education-atlas` and
        # `production` included, the moment either was registered) for
        # a corpus this function names no document-shape reading for;
        # extraction is skipped for that corpus rather than guessed at,
        # per that function's own documented contract.
        first_doc = _first_document(cfg["corpus"], corpus)
        if first_doc is not None:
            doc_id, text = first_doc
            result = roles.extract(text, corpus.vocab, doc_id=doc_id, cache_dir=cache_dir, replay_only=replay_only)
            corpus.evidence.extend(result.items)
            extraction_note = {"doc_id": doc_id, "items": len(result.items), "agreement": result.agreement, "escalated": result.escalated}
            logger.log(f"extraction ensemble on {doc_id}: {len(result.items)} items, agreement={result.agreement:.2f}, escalated={result.escalated}")

    vocab_added = _grow_vocab(corpus.vocab, corpus.evidence, cache_dir=cache_dir, replay_only=replay_only, logger=logger)

    resolution, span_start, bin_width = _resolve_time_binning(cfg, corpus)
    logger.log(f"time binning: resolution={resolution.value!r} span_start={span_start} bin_width={bin_width}")

    llm_hypotheses = _llm_proposed_hypotheses(
        corpus, corpus.vocab, config=cfg, cache_dir=cache_dir, replay_only=replay_only, logger=logger,
        span_start=span_start, bin_width=bin_width,
    )

    time_bins = _time_bins_for(corpus, cfg["max_time_bins"], span_start=span_start, bin_width=bin_width)
    by_address: dict[int, Hypothesis] = {h.address: h for h in llm_hypotheses}
    run_counts: list[dict[int, int]] = []
    for seed in range(cfg["seeds"]):
        combinatorial = combinatorial_sample(
            corpus.vocab, time_bins, max_items=cfg["combinatorial_max_items"], seed=seed,
            span_start=span_start, bin_width=bin_width,
            status_balanced=cfg["combinatorial_status_balanced"],
        )
        evidence_driven = from_evidence(
            corpus.evidence, corpus.vocab, resolution, seed=seed,
            span_start=span_start, bin_width=bin_width,
        )
        seed_hyps = combinatorial + evidence_driven
        run_counts.append({h.address: 1 for h in seed_hyps})
        for h in seed_hyps:
            by_address.setdefault(h.address, h)
        logger.log(f"generation seed {seed}: {len(combinatorial)} combinatorial + {len(evidence_driven)} evidence-driven = {len(seed_hyps)}")

    all_hypotheses, sampling_frame = stratified_sample(
        by_address.values(), corpus.vocab, cap=cfg["max_hypotheses"], seed=cfg["sampling_seed"],
    )
    logger.log(
        f"generation total: {len(by_address)} distinct addresses, {len(all_hypotheses)} kept "
        f"after stratified sampling ({sampling_frame['n_strata']} strata, cap={cfg['max_hypotheses']})"
    )

    link.link_evidence(corpus.evidence, all_hypotheses, corpus.vocab, threshold=cfg["link_threshold"])
    n_linked = sum(1 for e in corpus.evidence if e.supports or e.refutes)
    logger.log(f"evidence linking: {n_linked} of {len(corpus.evidence)} items linked to a hypothesis (threshold={cfg['link_threshold']})")

    survivors, likelihood_ratios = _critic_survivors(
        all_hypotheses, corpus.evidence, cache_dir=cache_dir, replay_only=replay_only,
        batch_size=cfg["critic_batch_size"], workers=cfg["llm_workers"], logger=logger,
    )
    logger.log(f"critic filter: {len(survivors)} of {len(all_hypotheses)} survived")

    table = load_detectability_table()
    preservation_results = batching.batch_preservation(
        survivors, table, batch_size=max(1, cfg["preservation_batch_size"]), cache_dir=cache_dir,
        replay_only=replay_only, workers=cfg["llm_workers"],
    )
    for h, note in zip(survivors, preservation_results):
        logger.log(f"preservation critique on {h.short_id}: could_have_survived={note.get('could_have_survived')}")
    preservation_by_address = {h.address: note for h, note in zip(survivors, preservation_results)}

    constants = load_constants(cfg["constants"])
    opinions = {
        h.address: belief_score(
            h, corpus.evidence, corpus.vocab, table, sources=corpus.sources, constants=constants,
            likelihood_ratios=likelihood_ratios.get(h.address),
        )
        for h in survivors
    }

    # Retraction propagation (`bkt-hte-retraction-propagation`, `docs/
    # PROPAGATION.md`): every address this run's own corpus flags as
    # retracted (`hte.propagate.changed_from_retractions`, reading
    # `EvidenceItem.retracted_by`/`Source.retracted_by`) roots a cascade
    # through the derivation graph over `survivors`, recomputing every
    # dependent hypothesis's own opinion in place. An ordinary campaign
    # with no retraction on file (every corpus this package ships, as of
    # this bead) reads an empty `retracted_now`, so `propagate` is a
    # documented no-op rather than a special-cased skip: `cascade.json`
    # is always written, with an empty `entries` list when nothing
    # retracted this run, so a caller never has to guess whether the
    # stage ran.
    advocate_notes = _run_advocate(
        survivors, opinions, corpus, table, constants, likelihood_ratios,
        k=cfg["advocate_k"], cache_dir=cache_dir, replay_only=replay_only, logger=logger,
    )
    retracted_now = propagate.changed_from_retractions(corpus.evidence, corpus.sources) & set(opinions)
    cascade_report = propagate.propagate(
        survivors, opinions, retracted_now, evidence=corpus.evidence, vocab=corpus.vocab,
        sources=corpus.sources, detect_table=table, constants=constants,
    )
    opinions.update(cascade_report.updated_opinions)
    (run_dir / "cascade.json").write_text(json.dumps(cascade_report.to_dict(), indent=2))
    if cascade_report.entries:
        logger.log(
            f"cascade: root(s)={list(cascade_report.roots)} moved {len(cascade_report.entries)} "
            f"dependent hypothesis(es) beyond threshold={cascade_report.threshold}"
        )
        for entry in cascade_report.entries:
            logger.log(
                f"cascade: {entry.short_id} old_P={entry.old_p} new_P={entry.new_p} "
                f"hops={entry.hops} routed_share={entry.routed_share:.3f}"
            )
    else:
        logger.log("cascade: no retraction on file this run, nothing to propagate")

    fragility_top10 = propagate.rank_fragility(survivors, corpus.evidence, corpus.sources)

    judge = _judge_adapter(cache_dir, replay_only)
    judge_batch = _judge_batch_adapter(
        cache_dir, replay_only, batch_size=cfg["judge_batch_size"], workers=cfg["llm_workers"],
    )

    # `bkt-hte-blind-roles`: every judged pair's own address triple,
    # recorded by wrapping the two judge callables (`hte.tournament.run`
    # no longer sees `opinions`), scored by `_judge_disagreement_count`
    # once the tournament finishes.
    judged_pairs: list[tuple[int, int, float]] = []

    def judge_tallied(x: Hypothesis, y: Hypothesis, ctx: dict) -> float:
        score = judge(x, y, ctx)
        judged_pairs.append((x.address, y.address, score))
        return score

    def judge_batch_tallied(pairs: Sequence[tuple[Hypothesis, Hypothesis, dict]]) -> list[float]:
        scores = judge_batch(pairs)
        judged_pairs.extend((x.address, y.address, score) for (x, y, _ctx), score in zip(pairs, scores))
        return scores

    elos = tournament.run(
        survivors, opinions, judge_tallied, rounds=cfg["tournament_rounds"], seed=0,
        context={"evidence": corpus.evidence}, judge_batch=judge_batch_tallied,
    )
    judge_disagreement = _judge_disagreement_count(judged_pairs, opinions)
    logger.log(
        f"tournament: {len(elos)} hypotheses rated over {cfg['tournament_rounds']} rounds, "
        f"judge_disagreement={judge_disagreement}"
    )

    profiles = unknowns.prior_profiles(corpus.vocab)

    def score_fn(h: Hypothesis, evidence: list[EvidenceItem], vocab: Vocabulary) -> Opinion:
        return belief_score(h, evidence, vocab, table, sources=corpus.sources, constants=constants, likelihood_ratios=likelihood_ratios.get(h.address))

    robustness_results = {
        h.address: unknowns.robustness(h, corpus.evidence, profiles, score_fn) for h in survivors
    }
    stable_count = sum(1 for r in robustness_results.values() if r["stable"])

    # `bkt-hte-survivors-artifact`: every survivor's own full opinion,
    # Elo, preservation critique, and robustness dict, persisted here
    # rather than only the aggregates `self_report`/`MANIFEST.json` keep
    # (`robustness_stable_fraction`) and the pruned `posterior`/`elo`
    # pair `timeline.json` keeps: a live run's per-hypothesis numbers
    # are otherwise gone the moment this process exits. `text` (a
    # rendered statement) is left out: neither `Placement` nor
    # `Sequence` carries a render method of its own, only `hte.
    # canon_writeback._statement`'s free function does, which needs a
    # full corpus reconstruction this in-memory run has no reason to
    # redo.
    survivors_sorted = sorted(
        survivors,
        key=lambda h: (-(elos.get(h.address) if elos.get(h.address) is not None else float("-inf")), h.address),
    )
    def _survivor_entry(h: Hypothesis) -> dict[str, Any]:
        opinion_dict = _survivor_opinion(opinions[h.address])
        return {
            "hypothesis_id": h.short_id,
            "address": h.address,
            "slots": _survivor_slots(h),
            "opinion": opinion_dict,
            # `lift` again, at the top level: the ceiling this survivor's
            # evidence supports under any prior, named to match `hte.cli.
            # _per_actor_summary`'s own per-actor rollup.
            "max_lift": opinion_dict["lift"],
            "likelihood_ratios": likelihood_ratios.get(h.address, {}),
            "advocate": advocate_notes.get(h.address),
            "elo": elos.get(h.address),
            "preservation": preservation_by_address[h.address],
            "robustness": robustness_results[h.address],
        }

    survivors_payload = [_survivor_entry(h) for h in survivors_sorted]
    survivors_artifact = {
        "artifact_version": artifacts.RUN_ARTIFACT_VERSION,
        "campaign": cfg["campaign"],
        "corpus": cfg["corpus"],
        "survivors": survivors_payload,
    }
    (run_dir / "survivors.json").write_text(json.dumps(survivors_artifact, indent=2))
    logger.log(f"survivors artifact: {len(survivors_payload)} entries written to survivors.json")
    if cfg["prior_ledger"]:
        prior_ledger_note["appended"] = prior_ledger.append(
            cfg["prior_ledger"], run_id=run_dir.name, corpus=cfg["corpus"],
            counts=prior_ledger.outcomes(survivors, opinions),
        )
        logger.log(f"prior ledger: {prior_ledger_note['appended']} concept rows appended")

    surprise_items = unknowns.surprise(corpus.evidence, survivors)
    surprise_rate = (len(surprise_items) / len(corpus.evidence)) if corpus.evidence else 0.0

    coverage = unknowns.coverage_interval(run_counts)
    chao1_part = f"chao1_estimate={coverage['chao1_estimate']:.1f}" if coverage["chao1_estimate"] is not None else f"chao1_note={coverage['chao1_note']!r}"
    logger.log(f"coverage: observed={coverage['observed']} missing_mass={coverage['missing_mass']:.4f} {chao1_part}")

    calibration = None
    if cfg["run_calibration"] and corpus.ground_truth:
        # `hte.calibrate.run_calibration` picks discovery-date holdout or
        # k-fold evidence holdout for this corpus (`choose_holdout_mode`,
        # `bkt-hte-calibration-redesign`) rather than always assuming a
        # discovery lag `cfg["cutoff_years"]` a corpus like quantum-history
        # never states (`discovery_year == year` for every one of its own
        # ground-truth events, `README.md`'s own documented
        # simplification); an explicit `cfg["cutoff_years"]` still pins
        # the cutoff when the chosen mode is discovery-date.
        calibration = calibrate.run_calibration(
            corpus, constants, cutoff_years=cfg["cutoff_years"],
            k=cfg["holdout_k"], seed=cfg["holdout_seed"], corpus_name=cfg["corpus"],
        )
        calibrate.write_calibration(calibration, run_dir)
        logger.log(
            f"calibration ({calibration['mode']}): brier={calibration['brier_score']} "
            f"coverage_of_truth={calibration['coverage_of_truth']}"
        )

    target_blind = _target_blind_check(cfg, llm_hypotheses, corpus.vocab)

    meta_review_result = roles.meta_review(survivors, opinions, cache_dir=cache_dir, replay_only=replay_only)

    run_summary = {
        "campaign": cfg["campaign"],
        "n_sources": len(corpus.sources),
        "n_evidence": len(corpus.evidence),
        "n_hypotheses_generated": len(by_address),
        "n_survivors": len(survivors),
        "vocab_added": vocab_added,
        "coverage": coverage,
        "robustness_stable_fraction": (stable_count / len(robustness_results)) if robustness_results else None,
        "surprise_rate": surprise_rate,
        "calibration_brier": calibration["brier_score"] if calibration else None,
        "target_blind": target_blind,
        "meta_review": meta_review_result,
    }
    self_report = roles.self_report(run_summary, cache_dir=cache_dir, replay_only=replay_only)
    # `bkt-hte-retraction-propagation`, `docs/PROPAGATION.md`: the ten
    # most fragile survivors (`hte.propagate.rank_fragility`), folded
    # into `self_report` AFTER the role call returns, the same
    # after-the-fact treatment `assumptions` gets below for a refusal or
    # a clamp note. Folded in here rather than into `run_summary` itself:
    # `run_summary` feeds straight into `roles.self_report`'s own prompt
    # text (`f"Run data: {dict(run)}"`), and that prompt is the cache key
    # a tracked run cache replays the `self_report` role under; adding a
    # key to `run_summary` directly would change it and break replay of
    # every recorded run. Folding extra fields in here keeps the prompt,
    # and so the key, unchanged.
    self_report = dict(self_report)
    self_report["fragility_top10"] = fragility_top10

    # `bkt-hte-refusal-handling`: every default `hte.roles` substituted
    # for a refused or truncated model call this run, one `run.log` line
    # per affected hypothesis/document id (never prompt text, per `hte.
    # llm.ModelRefusal`/`ModelTruncation`'s own contract), and a summary
    # line folded into `self_report["assumptions"]` so a reader of
    # self-report.json alone still learns a refusal happened even when
    # they never open MANIFEST.json.
    refusals = roles.refusal_log()
    n_refusals = sum(len(ids) for ids in refusals.values())
    for role_name, ids in sorted(refusals.items()):
        for affected_id in ids:
            logger.log(f"refusal: role={role_name} id={affected_id} (defaulted; see MANIFEST.json['refusals'])")
    if n_refusals:
        by_role = ", ".join(f"{role_name}={len(ids)}" for role_name, ids in sorted(refusals.items()))
        logger.log(f"refusals: {n_refusals} model refusal/truncation default(s) this run ({by_role})")
        self_report = dict(self_report)
        self_report["assumptions"] = list(self_report.get("assumptions", [])) + [
            f"{n_refusals} model refusal/truncation default(s) this run ({by_role}); "
            "see MANIFEST.json['refusals'] for the affected hypothesis/document ids."
        ]

    # `FINDING-2026-09-10-103` (silent-failures review #2): the same
    # `run.log`/`self_report`-assumption treatment refusals got above,
    # for every `hte.timeline.time_bin_index` clamp this run hit (a
    # generator-role hallucinated year, or any other year naming no
    # evidence item this run's own span union already covers, force-
    # placed into bin 0 rather than dropped). `MANIFEST.json`'s own
    # `clamped_years` list, assembled below alongside `manifest`, is
    # this event's persisted record; the `logger.warning` line `time_bin_
    # index` itself still emits reaches only stderr's bare handler of
    # last resort in a real run, no CLI entry point in this package ever
    # configures one.
    clamped_years = clamp_log()
    for clamp in clamped_years:
        logger.log(
            f"time-bin clamp: year={clamp['year']} span_start={clamp['span_start']} "
            "(clamped to bin 0 rather than raising; see MANIFEST.json['clamped_years'])"
        )
    if clamped_years:
        logger.log(f"clamped_years: {len(clamped_years)} year(s) clamped to bin 0 this run")
        self_report = dict(self_report)
        self_report["assumptions"] = list(self_report.get("assumptions", [])) + [
            f"{len(clamped_years)} year(s) clamped to bin 0 this run (before this run's own TIME_BIN "
            "span); see MANIFEST.json['clamped_years'] for the affected years."
        ]

    # `hte.artifacts.validate_self_report` reads `self_report` through
    # the same contract `hte.paper`/`hte.referee`/`hte.publish`/`hte.
    # pipeline` load it back with, before it ever touches disk: this
    # role's own response shape drifting from that contract is caught
    # here, at the one call site that would introduce it, rather than
    # downstream (`bkt-hte-artifact-contract`, `hte.artifacts`'s own
    # module docstring).
    artifacts.validate_self_report(self_report, path=str(run_dir / "self-report.json"))
    (run_dir / "self-report.json").write_text(json.dumps(self_report, indent=2))
    logger.log(f"self-report: missing_mass_estimate={self_report.get('missing_mass_estimate')} target_blind_steady={self_report.get('target_blind_steady')}")

    bin_labels = {tbin: bin_label(span_start + tbin * bin_width, resolution) for tbin in time_bins}
    # `cfg["top_k"]` is a display-pruning knob for a population much larger
    # than the critic-filtered survivor set; a run's own timeline view
    # should list every surviving hypothesis in each bin it landed in
    # rather than silently dropping survivors below an unrelated default,
    # so the floor here is the survivor count itself.
    views = export.timeline_views(
        survivors, opinions, elos, time_bins, top_k=max(cfg["top_k"], len(survivors)),
        span_start=span_start, bin_width=bin_width, bin_labels=bin_labels,
        evidence=corpus.evidence,
    )
    export.write_views(views, run_dir, fragility_ranked=fragility_top10)
    logger.log(f"exported {len(views.get('bins', []))} bin views, {len(views.get('event_views', []))} event views")

    cache_stats = llm.cache_stats(cache_dir)
    manifest = {
        "campaign": cfg["campaign"],
        "timestamp": timestamp,
        "corpus": cfg["corpus"],
        "run_artifact_version": artifacts.RUN_ARTIFACT_VERSION,
        "constants": {"W": constants.W, "lam": constants.lam, "mu": constants.mu, "alpha": constants.alpha, "theta_prune": constants.theta_prune},
        "time_binning": {"resolution": resolution.value, "span_start": span_start, "bin_width": bin_width, "bin_labels": bin_labels},
        "models": llm._model_policy(),
        "cache": cache_stats.to_dict(),
        "llm_stats": llm.stats(),
        # `bkt-hte-refusal-handling`: `{role: [affected hypothesis/document
        # ids]}` for every default `hte.roles` substituted for a refused or
        # truncated model call this run (`llm_stats[role]["refusals"/
        # "truncations"]` above carries the per-role counts; this carries
        # which ids, never prompt text or an unsanitized envelope).
        "refusals": refusals,
        # `FINDING-2026-09-10-103`: `[{"year": ..., "span_start": ...},
        # ...]` for every `hte.timeline.time_bin_index` clamp this run
        # hit, the same "absorbed rather than raised" treatment
        # `refusals` above gets for a defaulted model call.
        "clamped_years": clamped_years,
        "seeds": list(range(cfg["seeds"])),
        "git_sha": _git_sha(),
        "config": cfg,
        "extraction": extraction_note,
        # Item 5: the hash computed above, before generation started;
        # carried through unchanged (recomputing it now would defeat the
        # point).
        "prereg": prereg,
        # `bkt-hte-retraction-propagation`, `bkt-hte-blind-roles`, and the
        # stratified sample (`STATISTICAL-AUDIT-2026-09-15.md` item 2):
        # all three added here rather than into `run_summary` itself, for
        # the cache-key-stability reason the `self_report` fold-in above
        # documents: `run_summary` feeds `roles.self_report`'s own prompt
        # text, and `MANIFEST.json` carries these without perturbing it.
        "counts": {
            **run_summary, "fragility_top10": fragility_top10,
            "judge_disagreement": judge_disagreement, "sampling": sampling_frame, "prior_ledger": prior_ledger_note, "advocate": _advocate_summary(advocate_notes), "stance": stance,
        },
    }
    # `hte.artifacts.validate_manifest` builds a `ManifestArtifact` from
    # this exact dict before it is ever written: a required field this
    # module forgot to set, or a shape `hte.artifacts` cannot read, fails
    # loudly right here instead of only surfacing downstream inside
    # `hte.paper.emit_paper` over a run already committed to disk (this
    # contract's own motivating incident, `hte.artifacts`'s module
    # docstring).
    artifacts.validate_manifest(manifest, path=str(run_dir / "MANIFEST.json"))
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest, indent=2, default=str))
    logger.log("run complete")

    return RunArtifacts(
        run_dir=run_dir, corpus=corpus, hypotheses=survivors, opinions=opinions, elos=elos,
        coverage=coverage, surprise_items=surprise_items, self_report=self_report,
        manifest=manifest, calibration=calibration,
    )


def _first_document(corpus_name: str, corpus: Corpus) -> tuple[str, str] | None:
    """One `(doc_id, text)` pair to run `roles.extract`'s ensemble over,
    proving `bkt-hte-extraction-ensemble`'s path fires inside a real
    campaign rather than only in its own tests. `quantum-history` reads its
    own `_CHAPTER.md`'s first few paragraphs off disk; `fixtures` reads
    its own smallest fixture document; any other corpus name skips
    extraction rather than guessing a document shape it does not know."""
    if corpus_name == "quantum-history":
        chapter = quantum_history.DEFAULT_CORPUS_DIR / "_CHAPTER.md"
        if chapter.is_file():
            paragraphs = chapter.read_text().split("\n\n")
            return "_CHAPTER", "\n\n".join(paragraphs[:2])
        return None
    if corpus_name == "fixtures":
        doc_id = min(fixtures_corpus.FIXTURE_DOCS, key=lambda k: len(fixtures_corpus.FIXTURE_DOCS[k]))
        return doc_id, fixtures_corpus.FIXTURE_DOCS[doc_id]
    return None


def _target_blind_check(cfg: dict[str, Any], llm_hypotheses: list[Hypothesis], vocab: Vocabulary) -> dict[str, Any]:
    """The non-consensus ACTOR/MECHANISM proposal rate for this run's
    LLM-proposed hypotheses, against the previous run's own rate for the
    same campaign, persisted at `<out_dir>/<campaign>/_target_blind.json`
    (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §7's per-run target-blind line).
    A first run for a campaign has no prior rate to compare against and
    reports `steady=True` trivially, documented as such rather than
    silently defaulting.
    """
    non_consensus = 0
    for h in llm_hypotheses:
        for slot, value in ((Slot.ACTOR, h.content.actor), (Slot.MECHANISM, h.content.mechanism)):
            concept = vocab.get(slot, value)
            if concept is not None and concept.consensus_status in (ConsensusStatus.CONTESTED, ConsensusStatus.FRINGE):
                non_consensus += 1
                break
    rate = (non_consensus / len(llm_hypotheses)) if llm_hypotheses else 0.0

    state_path = Path(cfg["out_dir"]) / cfg["campaign"] / "_target_blind.json"
    prior_rate = None
    if state_path.is_file():
        try:
            prior_rate = json.loads(state_path.read_text()).get("rate")
        except (json.JSONDecodeError, OSError):
            prior_rate = None
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps({"rate": rate}))

    steady = True if prior_rate is None else rate >= prior_rate - 0.05
    return {"rate": rate, "prior_rate": prior_rate, "steady": steady, "first_run": prior_rate is None}


__all__ = ["run_campaign", "RunArtifacts", "Logger", "DEFAULT_CONFIG"]
