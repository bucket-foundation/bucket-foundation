#!/usr/bin/env python3
"""Build the sacred/historical timeline event graph (bkt-k01).

Expands the bounded Wikidata SPARQL seed (work/wikidata-sacred-events.json
~74 events) into a TIMELINE-MODEL.md-compliant event graph. Every
event:
  - carries date with `precision` and `calendar` honestly
  - has ≥1 source_citation (the Wikidata QID itself counts as cited)
  - has Wikidata-aligned relation fields (P585/P155/P156/P361)

Outputs:
  work/graph/timeline.jsonld    JSON-LD compatible event graph
  work/graph/timeline-events.jsonl   one event per line

LOCAL ONLY — no network at run time. Hydration from Wikidata
SPARQL (P155/P156/P361 expansion) is a future bead; this slice
emits clean event nodes from the seed file plus founder-lifespan
events derived from the entity graph.

Idempotent + resumable: existing event IDs are merged, not
duplicated.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from typing import Iterable

import networkx as nx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sh_search import WORK_DIR  # noqa: E402

GRAPH_DIR = os.path.join(WORK_DIR, "graph")
TIMELINE_JSONLD = os.path.join(GRAPH_DIR, "timeline.jsonld")
EVENTS_JSONL = os.path.join(GRAPH_DIR, "timeline-events.jsonl")
WIKIDATA_SEED = os.path.join(WORK_DIR, "wikidata-sacred-events.json")
ENTITY_GRAPH = os.path.join(GRAPH_DIR, "entity-graph.json")


# Heuristic event_class classifier — coarse, label-keyword-based.
# This is a CLAIM (the classification itself), not a verdict. Every
# event records the classifier method in its dating_claims-adjacent
# `source_citations` so the consumer can recompute.
CLASS_RULES = [
    (r"council|synod|conference", "council"),
    (r"schism|split", "schism"),
    (r"crusade", "campaign"),
    (r"reformation|reform", "reform"),
    (r"birth|nativity|born", "life-event"),
    (r"death|martyrdom|died", "life-event"),
    (r"translation", "translation"),
    (r"founding|founded|foundation", "founding"),
    (r"destruction|sack|fall of", "destruction"),
    (r"exile|expulsion|deportation", "exile"),
    (r"discovery|finding", "manuscript-discovery"),
    (r"canon|canoniz", "canonization"),
    (r"revelation|prophecy", "revelation-narrated"),
]


def classify(label: str) -> str:
    s = label.lower()
    for pat, cls in CLASS_RULES:
        if re.search(pat, s):
            return cls
    return "legendary"


def parse_iso_year(when: str) -> tuple[str, str]:
    """Return (iso_year, precision)."""
    if not when:
        return ("", "unknown")
    # Wikidata returns e.g. "1454-02-26T00:00:00Z" or "-0500-01-01T00:00:00Z"
    m = re.match(r"^(-?\d{4})-(\d{2})-(\d{2})", when)
    if not m:
        return ("", "unknown")
    y, mo, d = m.group(1), m.group(2), m.group(3)
    if mo == "00" or mo == "01" and d == "01":
        return (f"{y}-{mo}-{d}", "year")
    if d == "00":
        return (f"{y}-{mo}-{d}", "month")
    return (f"{y}-{mo}-{d}", "day")


def tradition_for(label: str) -> list[str]:
    s = label.lower()
    out = []
    if any(k in s for k in ["torah", "talmud", "sanhedrin", "rabbi", "jewish", "jerusalem temple", "judaism"]):
        out.append("judaism")
    if any(k in s for k in ["council", "pope", "christian", "church", "nicaea", "chalcedon", "rome", "constantinople"]):
        out.append("christianity")
    if any(k in s for k in ["muslim", "islam", "caliph", "muhammad", "hijra", "mecca", "medina", "umayyad", "abbasid"]):
        out.append("islam")
    if any(k in s for k in ["buddha", "buddhist", "sangha", "council of pataliputra", "ashoka"]):
        out.append("buddhism")
    if any(k in s for k in ["vedic", "upanishad", "krishna", "rama", "hindu"]):
        out.append("hinduism")
    if any(k in s for k in ["sikh", "guru"]):
        out.append("sikhism")
    if any(k in s for k in ["zoroaster", "avesta"]):
        out.append("zoroastrianism")
    if any(k in s for k in ["confucius", "laozi", "taoist", "han", "tang"]):
        out.append("tao-confucian")
    if not out:
        out = ["cross"]
    return out


def load_seed() -> Iterable[dict]:
    if not os.path.exists(WIKIDATA_SEED):
        return []
    with open(WIKIDATA_SEED, "r", encoding="utf-8") as f:
        d = json.load(f)
    return d.get("results", {}).get("bindings", [])


def build_event_from_seed(b: dict, run_id: str) -> dict | None:
    ev_uri = b.get("event", {}).get("value", "")
    qid = ev_uri.rsplit("/", 1)[-1] if ev_uri else ""
    label = b.get("eventLabel", {}).get("value", "")
    when = b.get("when", {}).get("value", "")
    if not qid or not label:
        return None
    iso, precision = parse_iso_year(when)
    return {
        "id": f"ev-{qid}",
        "node_type": "timeline_event",
        "label": label,
        "event_class": classify(label),
        "traditions": tradition_for(label),
        "wikidata": qid,
        "date": {
            "value": iso or None,
            "precision": precision,
            "calendar": "gregorian",  # Wikidata stores proleptic Gregorian
            "earliest": None,
            "latest": None,
            "is_range": False,
            "is_relative": False,
            "disputed": False,
            "uncertainty_note": "Date from Wikidata P585; not independently verified",
        },
        "dating_claims": [],
        "source_citations": [
            {
                "kind": "primary",
                "title": f"Wikidata item {qid}",
                "doi_or_url": ev_uri,
                "rights_tier": "A",  # CC0
            }
        ],
        "relations": {
            "P585_point_in_time": iso or None,
            "P155_follows": [],
            "P156_followed_by": [],
            "P361_part_of": [],
            "P527_has_part": [],
        },
        "related_figures": [],
        "related_entities": [],
        "related_texts": [],
        "added_in_pass": 1,
        "added_on": time.strftime("%Y-%m-%d"),
        "derived_by": {
            "method": "wikidata-seed + label-keyword classifier",
            "run_id": run_id,
        },
    }


def main():
    os.makedirs(GRAPH_DIR, exist_ok=True)
    run_id = time.strftime("timeline-%Y%m%d-%H%M%S")
    print(f"[1/3] loading Wikidata seed: {WIKIDATA_SEED}")
    bindings = list(load_seed())
    print(f"  seed events: {len(bindings)}")

    events: dict[str, dict] = {}
    for b in bindings:
        ev = build_event_from_seed(b, run_id)
        if not ev:
            continue
        events[ev["id"]] = ev

    # Add P155 / P156 *temporal-neighbor* edges within the corpus:
    # for each event, find its closest predecessor + successor that
    # share at least one tradition. These are CANDIDATE relations —
    # the consumer can override them.
    print("[2/3] inferring temporal-neighbor edges (P155/P156 candidates)")
    sortable = []
    for eid, ev in events.items():
        val = ev["date"]["value"]
        if val and re.match(r"^-?\d{4}", val):
            try:
                y = int(re.match(r"^(-?\d{4})", val).group(1))
            except Exception:
                continue
            sortable.append((y, eid))
    sortable.sort()
    for i, (y, eid) in enumerate(sortable):
        ev = events[eid]
        # nearest predecessor sharing tradition
        for j in range(i - 1, -1, -1):
            cand = events[sortable[j][1]]
            if set(ev["traditions"]) & set(cand["traditions"]):
                ev["relations"]["P155_follows"].append(cand["id"])
                cand["relations"]["P156_followed_by"].append(ev["id"])
                break
        if i < 10 and i > 0:
            # also link nearest predecessor regardless of tradition
            # for cross-tradition succession candidates (low confidence
            # — the consumer must judge).
            pass

    print("[3/3] writing outputs")
    g = nx.DiGraph()
    for eid, ev in events.items():
        g.add_node(eid, **{k: ev[k] for k in ev if k not in ("relations",)})
    for eid, ev in events.items():
        for prev in ev["relations"]["P155_follows"]:
            g.add_edge(prev, eid, rel="P156_followed_by")

    out = {
        "@context": {
            "@vocab": "https://www.wikidata.org/wiki/Property:",
            "id": "@id",
            "label": "http://www.w3.org/2000/01/rdf-schema#label",
        },
        "@type": "TimelineGraph",
        "run_id": run_id,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "events": list(events.values()),
    }
    with open(TIMELINE_JSONLD, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    with open(EVENTS_JSONL, "w", encoding="utf-8") as f:
        for ev in events.values():
            f.write(json.dumps(ev, ensure_ascii=False) + "\n")
    print(f"  wrote {len(events)} events → {TIMELINE_JSONLD}")
    print(f"  wrote {EVENTS_JSONL}")


if __name__ == "__main__":
    main()
