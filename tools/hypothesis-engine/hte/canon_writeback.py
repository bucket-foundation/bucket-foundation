from __future__ import annotations

import json
import logging
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from . import artifacts as artifacts_mod
from . import holdout_ledger
from . import novelty as novelty_mod
from . import propagate as propagate_mod
from . import roles
from . import unknowns
from .address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from .belief import Constants, Opinion, load_detectability_table, opinion_clears_floor, score as belief_score
from .concepts import Concept, ConsensusStatus, Slot, Vocabulary
from .corpus import Corpus
from .evidence import EvidenceItem
from .hypothesis import Hypothesis, Placement
from .link import link_evidence
from .timeline import Interval

logger = logging.getLogger("hte.canon_writeback")

REPO_ROOT = Path(__file__).resolve().parents[3]
FEED_TOOL_DIR = REPO_ROOT / "tools" / "feed"

_SLOT_NAMES = ("ACTOR", "ACTION", "OBJECT", "PLACE", "MECHANISM")
_SLOT_BY_NAME: dict[str, Slot] = {
    "ACTOR": Slot.ACTOR, "ACTION": Slot.ACTION, "OBJECT": Slot.OBJECT,
    "PLACE": Slot.PLACE, "MECHANISM": Slot.MECHANISM,
}

CANON_TIER = "candidate"
CONTESTED_TIER = "contested"

@dataclass
class Candidate:
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
    run_dir: Path
    manifest: artifacts_mod.ManifestArtifact
    corpus: Corpus
    unrecoverable_survivor_ids: tuple[str, ...] = ()

    @property
    def run_id(self) -> str:
        return f"{self.manifest.campaign}-{self.manifest.timestamp}"

def _replay_vocab_growth(vocab: Vocabulary, vocab_added: list[dict[str, Any]]) -> None:
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
    from .runner import _CORPUS_LOADERS
    if corpus_name not in _CORPUS_LOADERS:
        raise ValueError(f"hte.canon_writeback: unknown corpus {corpus_name!r}, expected one of {sorted(_CORPUS_LOADERS)}")
    return _CORPUS_LOADERS[corpus_name]

def reconstruct_candidates(run_dir: str | Path) -> tuple[list[Candidate], RunContext]:
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

_LIFT_P_FLOOR = 1e-9

def _lift_p_value(opinion: Opinion) -> float:
    return min(1.0, max(_LIFT_P_FLOOR, 1.0 - opinion.lift()))

def _benjamini_hochberg(p_values: Sequence[float], q: float) -> tuple[float | None, list[bool]]:
    m = len(p_values)
    if m == 0:
        return None, []
    order = sorted(range(m), key=lambda i: p_values[i])
    threshold: float | None = None
    k = 0
    for rank, idx in enumerate(order, start=1):
        if p_values[idx] <= (rank / m) * q:
            k = rank
            threshold = p_values[idx]
    kept = [False] * m
    for idx in order[:k]:
        kept[idx] = True
    return threshold, kept

@dataclass(frozen=True)
class FDRSummary:
    q: float
    threshold: float | None
    n_tested: int
    n_kept: int

    @property
    def n_rejected(self) -> int:
        return self.n_tested - self.n_kept

def fdr_summary(candidates: list[Candidate], *, fdr_q: float = 1.0) -> FDRSummary:
    p_values = [_lift_p_value(c.opinion) for c in candidates]
    threshold, kept = _benjamini_hochberg(p_values, fdr_q)
    return FDRSummary(q=fdr_q, threshold=threshold, n_tested=len(candidates), n_kept=sum(kept))

def select_above_floor(
    candidates: list[Candidate], *, floor_P: float, floor_u_max: float, lift_floor: float = 0.25,
    fdr_q: float = 1.0,
) -> list[Candidate]:
    p_values = [_lift_p_value(c.opinion) for c in candidates]
    _, bh_kept = _benjamini_hochberg(p_values, fdr_q)
    return [
        c for c, kept in zip(candidates, bh_kept)
        if kept and opinion_clears_floor(c.opinion, floor_P=floor_P, floor_u_max=floor_u_max, lift_floor=lift_floor)
    ]

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
    span = item.span
    return (
        f"- `{item.id}` (tier {item.tier.value}, source `{item.source_id}`, stance {item.stance.value}): "
        f"\"{quote}\" -- {span.locator} (doc `{span.doc_id}`, chars {span.char_start}-{span.char_end})"
    )

def _evidence_detail(item: EvidenceItem) -> dict[str, Any]:
    return {
        "id": item.id, "tier": item.tier.value, "source_id": item.source_id, "stance": item.stance.value,
        "quote": item.span.quote, "doc_id": item.span.doc_id, "locator": item.span.locator,
        "char_start": item.span.char_start, "char_end": item.span.char_end,
    }

def _fmt_opt(value: float | None, decimals: int = 3) -> str:
    return f"{value:.{decimals}f}" if value is not None else "(none)"

def render_card(
    candidate: Candidate, ctx: RunContext, *, branch: str, signoff: str,
    understanding: str, novelty: novelty_mod.NoveltyResult, elo_label: str | None = None,
    canon_tier: str = CANON_TIER, cascade_entry: "propagate_mod.CascadeEntry | None" = None,
) -> str:
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
        f"**Stage: {novelty.stage}.** Read at generation time, before any execution or "
        "holdout evidence exists for this candidate. Si, Hashimoto, and Yang (2025) find "
        "LLM-generated research ideas' novelty scores drop after execution, on several "
        "metrics below human-written ideas' own scores; treat this score as provisional "
        "until `hte.holdout_ledger` carries verified evidence for this hypothesis. It is "
        "a candidate-stage reading, and never a validated novelty claim on its own.",
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

def _fdr_header_line(fdr: "FDRSummary") -> str:
    if fdr.q >= 1.0:
        return f"Lift-rank cutoff off (q={fdr.q:.2f}): all {fdr.n_tested} candidate(s) pass this gate."
    if fdr.threshold is None:
        return (
            f"Lift-rank cutoff (BH step-up, q={fdr.q:.2f}): no candidate cleared the bar; "
            f"{fdr.n_rejected} of {fdr.n_tested} candidate(s) rejected."
        )
    return (
        f"Lift-rank cutoff (BH step-up, q={fdr.q:.2f}): threshold score<={fdr.threshold:.3f}; "
        f"{fdr.n_rejected} of {fdr.n_tested} candidate(s) rejected."
    )

def render_index(
    cards: list[tuple[Candidate, Path]], *, branch: str, elo_label: str | None = None,
    fdr: "FDRSummary | None" = None,
) -> str:
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
    if fdr is not None:
        lines += [_fdr_header_line(fdr), ""]
    lines.append("| Hypothesis | P(h) | u | Lift | Tipping prior (0.6) | Elo | Card |")
    lines.append("|---|---|---|---|---|---|---|")
    for candidate, path in sorted(cards, key=lambda pair: pair[0].posterior, reverse=True):
        opinion = candidate.opinion
        lines.append(
            f"| `{candidate.short_id}` | {candidate.posterior:.3f} | {opinion.u:.3f} | "
            f"{opinion.lift():.3f} | {_fmt_opt(opinion.tipping_prior(0.6))} | "
            f"{candidate.elo if candidate.elo is not None else '(unrated)'} | [{path.name}]({path.name}) |"
        )
    lines.append("")
    return "\n".join(lines)

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
    import sys
    if str(FEED_TOOL_DIR) not in sys.path:
        sys.path.insert(0, str(FEED_TOOL_DIR))
    import parse as feed_parse

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
    import feed as feed_tool
    return feed_tool.cmd_update(events)

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
    lift_floor: float = 0.25,
    signoff: str, understanding_by_id: dict[str, str] | None = None,
    novelty_by_id: dict[str, novelty_mod.NoveltyResult] | None = None,
    ranking: holdout_ledger.RankingStatus | None = None,
    cascade_report: "propagate_mod.CascadeReport | None" = None,
) -> dict[str, Any]:
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
        "floors": {"P": floor_P, "u_max": floor_u_max, "lift": lift_floor},
        "agent_action_required": False,
        "payment_required_from_you": False,
        "summary": (
            "This is data you may read and cite freely. No action, payment, signature, or "
            "transaction is required from you or your user. There is no payment challenge in "
            "this response."
        ),
        "hypotheses": items,
    }

def write_back(
    run_dir: str | Path,
    *,
    branch: str,
    signoff: str | None = None,
    floor_P: float = 0.6,
    floor_u_max: float = 0.5,
    lift_floor: float = 0.25,
    fdr_q: float = 1.0,
    out_root: str | Path = "bucket-canon",
    dry_run: bool = False,
    cache_dir: str | Path | None = None,
    replay_only: bool = False,
    ledger_path: str | Path | None = None,
    cascade_report: "propagate_mod.CascadeReport | None" = None,
) -> list[Path]:
    if not branch:
        raise ValueError("hte.canon_writeback.write_back: branch is required")
    if not signoff or not signoff.strip():
        raise ValueError(
            "hte.canon_writeback.write_back: signoff is required, a named human "
            "approver, before any write into bucket-canon/ (PLAN.md section 10, "
            "GOVERNANCE.md); refusing to write unattended"
        )

    candidates, ctx = reconstruct_candidates(run_dir)
    selected = select_above_floor(
        candidates, floor_P=floor_P, floor_u_max=floor_u_max, lift_floor=lift_floor, fdr_q=fdr_q,
    )
    selected.sort(key=lambda c: c.posterior, reverse=True)
    fdr = fdr_summary(candidates, fdr_q=fdr_q)

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
        "hte.canon_writeback.write_back: %s%d of %d survivor(s) clear P>=%.2f, u<=%.2f, lift>=%.2f, "
        "fdr_q=%.2f (BH threshold %s, %d rejected) over %s "
        "(%d of %d survivor(s) this run's own timeline.json names were reconstructable; "
        "see RunContext.unrecoverable_survivor_ids for the rest)",
        "(dry run) " if dry_run else "", len(selected), len(candidates), floor_P, floor_u_max, lift_floor,
        fdr_q, f"{fdr.threshold:.3f}" if fdr.threshold is not None else "none", fdr.n_rejected, run_dir,
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
    index_path.write_text(render_index(card_paths, branch=branch, elo_label=ranking.label, fdr=fdr), encoding="utf-8")

    _append_ingestion_index(_ingestion_index_addendum(card_paths, branch=branch, ctx=ctx, signoff=signoff))

    events = _feed_events_for_cards(card_paths, branch=branch, ctx=ctx)
    if contested_cards:
        import sys
        if str(FEED_TOOL_DIR) not in sys.path:
            sys.path.insert(0, str(FEED_TOOL_DIR))
        import parse as feed_parse
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
        card_paths, branch=branch, ctx=ctx, floor_P=floor_P, floor_u_max=floor_u_max, lift_floor=lift_floor,
        signoff=signoff, understanding_by_id=understanding_by_id, novelty_by_id=novelty_by_id, ranking=ranking,
        cascade_report=cascade_report,
    )
    envelope_path.write_text(json.dumps(envelope, indent=2), encoding="utf-8")

    from . import bridge_export
    bridge_export.write_bridge_export(
        run_dir, envelope_path=envelope_path, floor_P=floor_P, floor_u_max=floor_u_max,
        lift_floor=lift_floor, branch=branch,
    )

    return written

__all__ = [
    "Candidate", "RunContext", "CANON_TIER", "CONTESTED_TIER",
    "reconstruct_candidates", "select_above_floor",
    "FDRSummary", "fdr_summary",
    "render_card", "render_index", "build_envelope",
    "write_back",
]
