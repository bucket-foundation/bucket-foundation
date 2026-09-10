#!/usr/bin/env python3
"""Campaign-run caller (ros-12 item 3): the piece `learning/research-os/
ENGINE-BRIDGE.md`'s own "Stubs, open items" names as missing, "Item 1 has
no caller yet either... a campaign's own accepted-hypothesis list would
need a small script or `hte.runner` hook to walk it." This is that script.

Documented entry point, both a CLI (`python3 scripts/campaign_research_os.py`)
and an importable `run()` function, that:

1. Reads `public.research_os_productions_outbox`'s unconsumed rows
   (`hte.corpus.research_os_outbox.fetch_and_build`, ros-12 item 2).
2. Runs one `hte.runner.run_campaign` over them, registering the
   `"research-os"` corpus into `hte.runner`'s own module-private
   `_CORPUS_LOADERS` at call time (`_register_corpus` below) rather than
   editing that module directly: PR #20 (`fix(hte): PR #10 review
   findings...`) is reviewing and merging `hte/runner.py` concurrently
   with this script landing (this repo's own `BEADS-PENDING.jsonl` ros-12
   entry names the constraint), so nothing here touches its source. A
   runtime dict assignment on an already-imported module is not a source
   edit; `run()` accepts any pre-built `Corpus`, so a test never needs
   `main()`'s own outbox/network path at all.
3. Computes the run's own gap-node queue (`hte.unknowns.
   unresolved_slot_gaps`, ros-12 item 4) against the same survivor
   population and opinions the campaign scored.
4. Writes both lists to one JSON export, shaped for `scripts/research-os/
   apply-engine-campaign.ts` to apply through the PR #14 adapter
   (`src/lib/research-os/engine-bridge.ts`'s `buildEngineNode`/
   `buildEngineEdges`, `db.ts`'s `upsertEngineHypothesisNode`/
   `writeEngineEdges`).
5. Marks every outbox row this run consumed (`research_os_outbox.
   mark_consumed`), only once the export above has written to disk, so a
   crash between reading the outbox and writing the export leaves those
   rows unconsumed and ready for a retry.

Run, from `tools/hypothesis-engine`:

    python3 scripts/campaign_research_os.py --out runs/research-os-export.json

Then, from the `bucket-foundation` repo root, apply the export to the graph:

    npx ts-node --compiler-options '{"module":"commonjs"}' \\
      scripts/research-os/apply-engine-campaign.ts \\
      tools/hypothesis-engine/runs/research-os-export.json

`main()` needs `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` (the outbox read and
the consumed-marking write) and, unless `HTE_LLM_MODE=fake` is set, a
working `claude -p` for the campaign's own model calls. `run()` alone
needs neither: it takes an in-memory `Corpus` and never touches Supabase,
which is how `tests/test_campaign_research_os.py` exercises it, against
`HTE_LLM_MODE=fake`, no network or API key either way.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from hte import runner, unknowns
from hte.concepts import Slot, Vocabulary
from hte.corpus import Corpus, research_os_outbox
from hte.hypothesis import Hypothesis

DEFAULT_CAMPAIGN = "research-os"
DEFAULT_BRANCH = "02-physics"
DEFAULT_ENGINE = "hte"


def _register_corpus(name: str, corpus: Corpus) -> None:
    """Registers `corpus` into `hte.runner`'s own `_CORPUS_LOADERS` at call
    time, so `run_campaign({"corpus": name, ...})` resolves it. See this
    module's own header comment, item 2, for why this is a runtime
    registration rather than a `hte/runner.py` edit."""
    runner._CORPUS_LOADERS[name] = lambda: corpus


def _hypothesis_slots(h: Hypothesis, vocab: Vocabulary) -> dict[str, str | None]:
    """Every one of the five placement slot ids `h` carries, resolved to a
    human-readable label through `vocab.get(slot, raw_id).label` when the
    vocabulary has one, else left as the raw id. `hte.api._slot_labels`
    reads the same pattern for `hte-serve`'s own `/hypothesize` response;
    this function keeps its own copy, since `hte/api.py` is under active
    review as this script lands (see this module's own header comment). A
    sequence hypothesis (`h.is_sequence`) carries no placement slots, so it
    reads as `{}`."""
    if h.is_sequence:
        return {}
    content = h.content
    raw = {
        "actor": content.actor, "action": content.action, "object": content.object,
        "place": content.place, "mechanism": content.mechanism,
    }
    out: dict[str, str | None] = {}
    for name, raw_id in raw.items():
        concept = vocab.get(Slot(name), raw_id) if raw_id is not None else None
        out[name] = concept.label if concept is not None else raw_id
    return out


def _hypothesis_title(slots: dict[str, str | None], short_id: str) -> str:
    """A human-readable sentence from `slots`' own label values, "actor
    action object place mechanism" in slot order, skipping any slot with
    no value. Falls back to `f"Hypothesis {short_id}"` when every slot is
    empty (a sequence hypothesis, or one whose own vocabulary resolved no
    label at all): `buildEngineNode` (`engine-bridge.ts`) requires a
    non-empty `title`, so this never returns an empty string."""
    parts = [slots.get(name) for name in ("actor", "action", "object", "place", "mechanism") if slots.get(name)]
    return " ".join(str(p) for p in parts) if parts else f"Hypothesis {short_id}"


def _evidence_refs(h: Hypothesis, evidence_items) -> list[str]:
    """Every evidence item id naming `h`'s own address in `supports` or
    `refutes`, sorted for a deterministic export. `buildEngineEdges`
    (`engine-bridge.ts`) turns each into a `cites` edge, resolved to a
    graph node id (or skipped, `writeEngineEdges`'s own documented
    behavior) at write time."""
    return sorted({item.id for item in evidence_items if h.address in item.supports or h.address in item.refutes})


def export_accepted_hypotheses(
    artifacts: "runner.RunArtifacts", *, engine: str, run_id: str, campaign: str, branch: str,
) -> list[dict[str, Any]]:
    """Every survivor `artifacts.hypotheses` carries (the critic-filtered,
    tournament-scored population `hte.runner.run_campaign` returns as
    `RunArtifacts.hypotheses`, `learning/research-os/ENGINE-BRIDGE.md`'s
    own "an accepted engine hypothesis" for task item 1), shaped as one
    `EngineHypothesisInput` (`src/lib/research-os/engine-bridge.ts`) each,
    camelCase keys so `apply-engine-campaign.ts` reads this export with no
    field renaming of its own. `tierAssigned` is left unset on purpose:
    `docs/RESEARCH-OS-INTEGRATION.md`'s own "hypothesize_result" section
    names real tier assignment as unbuilt wiring outside this script's own
    scope; `engineTierToGraphTier`'s own documented default (T6, the
    engine's least-reliable rung) applies until it lands."""
    vocab = artifacts.corpus.vocab
    out = []
    for h in artifacts.hypotheses:
        slots = _hypothesis_slots(h, vocab)
        opinion = artifacts.opinions.get(h.address)
        out.append({
            "engine": engine,
            "runId": run_id,
            "campaign": campaign,
            "hypothesisId": h.short_id,
            "branch": branch,
            "title": _hypothesis_title(slots, h.short_id),
            "posterior": opinion.project() if opinion is not None else None,
            "elo": artifacts.elos.get(h.address),
            "slots": slots,
            "evidenceRefs": _evidence_refs(h, artifacts.corpus.evidence),
            "derivesFromSlugs": [],
        })
    return out


def export_gap_nodes(
    artifacts: "runner.RunArtifacts", *, engine: str, run_id: str, campaign: str, branch: str, limit: int = 25,
) -> list[dict[str, Any]]:
    """The run's own gap-node queue (ros-12 item 4): `hte.unknowns.
    unresolved_slot_gaps` against the same survivor population and
    opinions this run scored, shaped for `apply-engine-campaign.ts`'s own
    gap-node write path (a `graph.nodes` row of kind `artifact`,
    provenance `type: "gap"`, one `cites` edge per concerned hypothesis
    node). `concernsHypothesisIds` names raw hypothesis ids rather than
    pre-computed slugs on purpose: `engineNodeSlug` (`engine-bridge.ts`)
    is the one place that slug format is defined, so the TS side computes
    it itself instead of this script duplicating (and risking drifting
    from) that logic."""
    gaps = unknowns.unresolved_slot_gaps(artifacts.corpus.evidence, artifacts.hypotheses, artifacts.opinions, limit=limit)
    out = []
    for gap in gaps:
        concerned = sorted({h.short_id for h in artifacts.hypotheses if h.address in gap.would_move})
        out.append({
            "engine": engine,
            "runId": run_id,
            "campaign": campaign,
            "branch": branch,
            "gapId": gap.id,
            "kind": gap.kind,
            "description": gap.description,
            "valueOfInformation": unknowns.value_of_information(gap, artifacts.hypotheses, artifacts.opinions),
            "concernsHypothesisIds": concerned,
        })
    return out


def run(
    corpus: Corpus,
    *,
    engine: str = DEFAULT_ENGINE,
    campaign: str = DEFAULT_CAMPAIGN,
    branch: str = DEFAULT_BRANCH,
    config_overrides: dict[str, Any] | None = None,
    gap_limit: int = 25,
) -> dict[str, Any]:
    """Runs one `hte.runner.run_campaign` over `corpus` and returns the
    export payload `apply-engine-campaign.ts` applies:
    `{"runId", "engine", "campaign", "branch", "accepted": [...], "gaps":
    [...]}`. No Supabase access happens here, only `main()` (the outbox
    read and the consumed-marking write) touches the network; a test calls
    `run()` directly with a small fixture `Corpus` and `HTE_LLM_MODE=fake`,
    exactly `tests/test_campaign_research_os.py`'s own pattern."""
    _register_corpus(campaign, corpus)
    config = {"corpus": campaign, "campaign": campaign, **(config_overrides or {})}
    artifacts = runner.run_campaign(config)
    run_id = str(artifacts.run_dir)
    return {
        "runId": run_id,
        "engine": engine,
        "campaign": campaign,
        "branch": branch,
        "accepted": export_accepted_hypotheses(artifacts, engine=engine, run_id=run_id, campaign=campaign, branch=branch),
        "gaps": export_gap_nodes(artifacts, engine=engine, run_id=run_id, campaign=campaign, branch=branch, limit=gap_limit),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", default="runs/research-os-export.json", help="where to write the JSON export")
    parser.add_argument("--branch", default=DEFAULT_BRANCH)
    parser.add_argument("--status-min", default="draft")
    parser.add_argument("--table", default=research_os_outbox.DEFAULT_TABLE)
    parser.add_argument("--gap-limit", type=int, default=25)
    parser.add_argument(
        "--dry-run", action="store_true",
        help="write the export but never mark outbox rows consumed (a repeat run re-reads the same rows)",
    )
    args = parser.parse_args(argv)

    row_ids, corpus = research_os_outbox.fetch_and_build(table=args.table, status_min=args.status_min)
    if not row_ids:
        print("no unconsumed research-os outbox rows; nothing to run", file=sys.stderr)
        return 0

    payload = run(corpus, branch=args.branch, gap_limit=args.gap_limit)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, default=str))
    print(f"exported {len(payload['accepted'])} accepted hypothesis(es) and {len(payload['gaps'])} gap node(s) to {out_path}")

    if args.dry_run:
        print(f"--dry-run: {len(row_ids)} outbox row(s) left unconsumed")
    else:
        research_os_outbox.mark_consumed(row_ids, table=args.table)
        print(f"marked {len(row_ids)} outbox row(s) consumed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
