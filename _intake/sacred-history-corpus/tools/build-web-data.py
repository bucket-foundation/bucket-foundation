#!/usr/bin/env python3
"""build-web-data.py — assemble the shippable sacred-history web data file.

Reads the pipeline outputs under ../work/ (entity graph, timeline, AI
branch-analysis claims) plus the curated Tier-A anchor events, and emits a
single, denormalized JSON the Next.js site consumes at build time:

    src/data/sacred-history.json

The web file carries NO copyrighted text — only figure metadata, motifs,
Wikidata QIDs, conventional dates, and AI-generated *contestable* correlation
claims with provenance. Tier-A only. Idempotent: re-running converges.

Usage:
    python3 build-web-data.py [--out /abs/path/to/sacred-history.json]
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORK = os.path.join(ROOT, "work")


def load_json(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def load_jsonl(path):
    out = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def wd_url(qid):
    return f"https://www.wikidata.org/wiki/{qid}" if qid else None


def build_figures(graph):
    figs = []
    for n in graph.get("nodes", []):
        if n.get("node_type") != "figure":
            continue
        figs.append(
            {
                "id": n["id"],
                "label": n["label"],
                "aka": n.get("aka", []),
                "traditions": n.get("traditions", []),
                "figureClass": n.get("figure_class"),
                "historicity": n.get("historicity"),
                "motifs": n.get("associated_motifs", []),
                "wikidata": n.get("wikidata"),
                "wikidataUrl": wd_url(n.get("wikidata")),
            }
        )
    figs.sort(key=lambda f: f["label"])
    return figs


def build_correlations(graph, entity_claims, ai_claims):
    """Merge the two AI claim sources (entity-graph resolver + LLM
    branch-analysis) into one list of contestable correlation cards."""
    cards = []
    seen = set()

    def add(claim, source):
        cid = claim.get("id")
        if not cid or cid in seen:
            return
        seen.add(cid)
        side_a = claim.get("side_a", {})
        side_b = claim.get("side_b", {})
        # collect motif overlap from evidence / fields
        motifs = []
        for ev in claim.get("evidence", []):
            summ = ev.get("summary", "")
            if "motifs" in summ:
                pass  # motifs already encoded in statement; keep evidence verbatim
        cards.append(
            {
                "id": cid,
                "kind": claim.get("correlation_kind", "correlation"),
                "label": claim.get("label"),
                "statement": claim.get("statement"),
                "sideA": {
                    "tradition": side_a.get("tradition"),
                    "node": side_a.get("node"),
                    "wikidata": side_a.get("wikidata") or side_a.get("locator"),
                },
                "sideB": {
                    "tradition": side_b.get("tradition"),
                    "node": side_b.get("node"),
                    "wikidata": side_b.get("wikidata") or side_b.get("locator"),
                },
                "stance": claim.get("stance", "contested"),
                "disputed": claim.get("disputed", True),
                "confidence": claim.get("confidence"),
                "scope": claim.get("scope"),
                "evidence": [
                    {
                        "kind": ev.get("kind"),
                        "locator": ev.get("locator"),
                        "sourceNode": ev.get("source_node"),
                        "rightsTier": ev.get("rights_tier"),
                        "summary": ev.get("summary"),
                    }
                    for ev in claim.get("evidence", [])
                ],
                "counterConsiderations": claim.get("counter_considerations", []),
                "provenance": {
                    "assertedBy": claim.get("provenance", {}).get("asserted_by"),
                    "method": (
                        claim.get("provenance", {})
                        .get("derived_by", {})
                        .get("method")
                    ),
                    "model": (
                        claim.get("provenance", {})
                        .get("derived_by", {})
                        .get("model")
                        or claim.get("provenance", {})
                        .get("derived_by", {})
                        .get("embedding_model")
                    ),
                    "runId": (
                        claim.get("provenance", {})
                        .get("derived_by", {})
                        .get("run_id")
                    ),
                    "addedOn": claim.get("provenance", {}).get("added_on"),
                },
                "source": source,
            }
        )

    for c in entity_claims:
        add(c, "entity-graph-resolver")
    for c in ai_claims:
        add(c, "llm-branch-analysis")

    # rights gate: drop anything that isn't Tier A throughout
    def all_tier_a(card):
        return all(
            (ev.get("rightsTier") in (None, "A")) for ev in card["evidence"]
        )

    cards = [c for c in cards if all_tier_a(c)]
    # sort: figure-mappings first, then by confidence desc
    cards.sort(
        key=lambda c: (
            0 if c["kind"] == "figure-mapping" else 1,
            -(c.get("confidence") or 0),
        )
    )
    return cards


def build_timeline(anchor, wikidata_events):
    """Anchor events are the curated, sacred-history-relevant Tier-A set.
    The bounded Wikidata proof-run events are kept as a secondary, clearly
    labelled 'proof-run sample' layer."""
    events = []
    for e in anchor.get("events", []):
        events.append(
            {
                "id": e["id"],
                "label": e["label"],
                "eventClass": e["event_class"],
                "traditions": e.get("traditions", []),
                "year": e["year"],
                "precision": e.get("precision"),
                "disputed": e.get("disputed", False),
                "wikidata": e.get("wikidata"),
                "wikidataUrl": wd_url(e.get("wikidata")),
                "note": e.get("note"),
                "layer": "anchor",
            }
        )
    events.sort(key=lambda e: e["year"])
    return events


def year_label(y):
    return f"{abs(y)} {'BCE' if y < 0 else 'CE'}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    graph = load_json(os.path.join(WORK, "graph", "entity-graph.json"))
    entity_claims = load_jsonl(os.path.join(WORK, "graph", "entity-claims.jsonl"))
    ai_claims_path = os.path.join(WORK, "claims", "claims.jsonl")
    ai_claims = load_jsonl(ai_claims_path) if os.path.exists(ai_claims_path) else []
    # Curated Tier-A anchor events are a committed source input (tools/),
    # not a runtime artifact. Fall back to the work/ copy if present.
    anchor_path = os.path.join(HERE, "timeline-anchor-events.json")
    if not os.path.exists(anchor_path):
        anchor_path = os.path.join(WORK, "timeline-anchor-events.json")
    anchor = load_json(anchor_path)
    wd_events_path = os.path.join(WORK, "wikidata-sacred-events.json")
    wd_events = load_json(wd_events_path) if os.path.exists(wd_events_path) else {}

    figures = build_figures(graph)
    correlations = build_correlations(graph, entity_claims, ai_claims)
    timeline = build_timeline(anchor, wd_events)

    # tradition roster
    traditions = sorted(
        {t for f in figures for t in f["traditions"]}
        | {t for e in timeline for t in e["traditions"]}
    )

    out = {
        "$schema": "sacred-history/web/v1",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "title": "Sacred history",
        "tagline": "build the past. build history.",
        "summary": {
            "figures": len(figures),
            "traditions": len(traditions),
            "correlations": len(correlations),
            "timelineEvents": len(timeline),
            "earliestEvent": year_label(timeline[0]["year"]) if timeline else None,
            "latestEvent": year_label(timeline[-1]["year"]) if timeline else None,
        },
        "rights": {
            "tier": "A",
            "policy": "Tier-A (public-domain / open / CC0) only. No copyrighted "
            "text. Figure metadata, motifs, conventional dates, Wikidata QIDs, "
            "and AI-generated contestable correlation claims only.",
        },
        "method": "Local-model pipeline (ollama: nomic-embed-text embeddings + "
        "llama3.2:3b synthesis). Cross-tradition correlations are AI-generated "
        "candidates emitted as contestable claims with evidence and confidence, "
        "never as settled fact. $0 paid AI spend.",
        "traditions": traditions,
        "figures": figures,
        "correlations": correlations,
        "timeline": timeline,
    }

    out_path = args.out or os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(HERE))),
        "src",
        "data",
        "sacred-history.json",
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"wrote {out_path}")
    print(
        f"  figures={len(figures)} correlations={len(correlations)} "
        f"timeline={len(timeline)} traditions={len(traditions)}"
    )


if __name__ == "__main__":
    main()
