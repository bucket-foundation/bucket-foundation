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

import json
import re
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Sequence

from . import batching, calibrate, export, link, llm, roles, tournament, unknowns
from .address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START, time_bin_index
from .belief import Constants, Opinion, load_detectability_table, score as belief_score
from .concepts import Concept, ConsensusStatus, Slot, Vocabulary
from .corpus import Corpus, quantum_history
from .corpus import education_atlas, fixtures as fixtures_corpus, production
from .evidence import EvidenceItem
from .generate import combinatorial_sample, from_evidence
from .hypothesis import Hypothesis
from .timeline import Interval, Resolution, RESOLUTION_WIDTH_YEARS, auto_resolution, bin_bounds, bin_label

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
    # addresses; a `max_hypotheses` still in the tens kept only the
    # lowest few dozen by raw address value, which this address scheme's
    # own TIME_BIN prime (`hte.address.PRIMES[4] == 11`, the fastest-
    # growing factor in the whole product) reads as "the earliest
    # century bin with any hypothesis at all," collapsing the kept
    # population onto one seed. 400 clears every one of this corpus's 13
    # decade bins with real depth in most of them (empirically checked
    # against the shipped quantum-history corpus, `bkt-hte-evidence-
    # slots`'s own regression note).
    "generate_n": 20,
    "generate_evidence_sample": 8,
    "combinatorial_max_items": 150,
    "max_hypotheses": 400,
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
    "llm_workers": None,
    # k-fold evidence holdout (`bkt-hte-calibration-redesign`,
    # `hte.calibrate.holdout_kfold`): folds and its own stratification
    # seed, read only when `hte.calibrate.choose_holdout_mode` picks
    # k-fold over discovery-date for this corpus's own ground truth.
    "holdout_k": 5,
    "holdout_seed": 0,
}

_CORPUS_LOADERS: dict[str, Callable[[], Corpus]] = {
    "quantum-history": quantum_history.ingest,
    "fixtures": fixtures_corpus.build,
    "education-atlas": education_atlas.load,
    "production": production.load,
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
    this package's pre-fix behavior exactly: `tests/test_runner.py`'s own
    `FIXTURE_CONFIG` pins `"century"` for this reason, so its frozen
    replay-only `claude -p` cache, keyed by prompt text, still hits.
    """
    if cfg["resolution"] is not None:
        resolution = Resolution(cfg["resolution"])
        return resolution, DEFAULT_SPAN_START, RESOLUTION_WIDTH_YEARS[resolution]
    intervals = [Interval(start=g.year, end=g.year) for g in corpus.ground_truth]
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


def _critic_survivors(
    hypotheses: list[Hypothesis], evidence: list[EvidenceItem], *, cache_dir: str, replay_only: bool,
    batch_size: int, workers: int | None, logger: Logger,
) -> list[Hypothesis]:
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
    for h, report in zip(hypotheses, reports):
        logger.log(f"critic on {h.short_id}: keep={report.get('keep')} issues={report.get('issues')}")
        if report.get("keep", True):
            survivors.append(h)
    return survivors


def run_campaign(config: dict[str, Any] | None = None) -> RunArtifacts:
    """Run the whole engine loop once and write every artifact under
    `<out_dir>/<campaign>/<timestamp>/`. `config` overrides
    `DEFAULT_CONFIG`; every key `DEFAULT_CONFIG` names may be overridden,
    no others are read.
    """
    cfg = {**DEFAULT_CONFIG, **(config or {})}
    # This run's own `llm.stats()` snapshot (`docs/THROUGHPUT.md`), reset
    # here rather than accumulated across every campaign this process has run.
    llm.reset_stats()
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

    all_hypotheses = sorted(by_address.values(), key=lambda h: h.address)[: cfg["max_hypotheses"]]
    logger.log(f"generation total: {len(by_address)} distinct addresses, {len(all_hypotheses)} kept after max_hypotheses cap")

    link.link_evidence(corpus.evidence, all_hypotheses, corpus.vocab, threshold=cfg["link_threshold"])
    n_linked = sum(1 for e in corpus.evidence if e.supports or e.refutes)
    logger.log(f"evidence linking: {n_linked} of {len(corpus.evidence)} items linked to a hypothesis (threshold={cfg['link_threshold']})")

    survivors = _critic_survivors(
        all_hypotheses, corpus.evidence, cache_dir=cache_dir, replay_only=replay_only,
        batch_size=cfg["critic_batch_size"], workers=cfg["llm_workers"], logger=logger,
    )
    logger.log(f"critic filter: {len(survivors)} of {len(all_hypotheses)} survived")

    table = load_detectability_table()
    preservation_results = roles.preservation_critique_many(
        survivors, table, cache_dir=cache_dir, replay_only=replay_only, workers=cfg["llm_workers"],
    )
    preservation_notes = [{"hypothesis": h.short_id, **note} for h, note in zip(survivors, preservation_results)]
    for h, note in zip(survivors, preservation_results):
        logger.log(f"preservation critique on {h.short_id}: could_have_survived={note.get('could_have_survived')}")

    constants = Constants()
    opinions = {h.address: belief_score(h, corpus.evidence, corpus.vocab, table, constants=constants) for h in survivors}

    judge = _judge_adapter(cache_dir, replay_only)
    judge_batch = _judge_batch_adapter(
        cache_dir, replay_only, batch_size=cfg["judge_batch_size"], workers=cfg["llm_workers"],
    )
    elos = tournament.run(
        survivors, opinions, judge, rounds=cfg["tournament_rounds"], seed=0,
        context={"opinions": opinions}, judge_batch=judge_batch,
    )
    logger.log(f"tournament: {len(elos)} hypotheses rated over {cfg['tournament_rounds']} rounds")

    profiles = unknowns.prior_profiles(corpus.vocab)

    def score_fn(h: Hypothesis, evidence: list[EvidenceItem], vocab: Vocabulary) -> Opinion:
        return belief_score(h, evidence, vocab, table, constants=constants)

    robustness_results = {
        h.address: unknowns.robustness(h, corpus.evidence, profiles, score_fn) for h in survivors
    }
    stable_count = sum(1 for r in robustness_results.values() if r["stable"])

    surprise_items = unknowns.surprise(corpus.evidence, survivors)
    surprise_rate = (len(surprise_items) / len(corpus.evidence)) if corpus.evidence else 0.0

    coverage = unknowns.coverage_interval(run_counts)
    logger.log(f"coverage: observed={coverage['observed']} chao1_estimate={coverage['chao1_estimate']:.1f} missing_mass={coverage['missing_mass']:.4f}")

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
            k=cfg["holdout_k"], seed=cfg["holdout_seed"],
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
    )
    export.write_views(views, run_dir)
    logger.log(f"exported {len(views.get('bins', []))} bin views, {len(views.get('event_views', []))} event views")

    cache_stats = llm.cache_stats(cache_dir)
    manifest = {
        "campaign": cfg["campaign"],
        "timestamp": timestamp,
        "corpus": cfg["corpus"],
        "constants": {"W": constants.W, "lam": constants.lam, "mu": constants.mu, "alpha": constants.alpha, "theta_prune": constants.theta_prune},
        "time_binning": {"resolution": resolution.value, "span_start": span_start, "bin_width": bin_width, "bin_labels": bin_labels},
        "models": llm._model_policy(),
        "cache": cache_stats.to_dict(),
        "llm_stats": llm.stats(),
        "seeds": list(range(cfg["seeds"])),
        "git_sha": _git_sha(),
        "config": cfg,
        "extraction": extraction_note,
        "counts": run_summary,
    }
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
