from __future__ import annotations

import hashlib
import random
import re
from typing import Any, Mapping

from .belief import sigmoid

_ITEM_LINE_RE = re.compile(
    r"actor=(?P<actor>\S+)\s+action=(?P<action>\S+)\s+object=(?P<object>\S+)\s+"
    r"place=(?P<place>\S+)\s+mechanism=(?P<mechanism>\S+)\s+year=(?P<year>-?\d+)"
    r"[^\[\]]*\[(?P<id>[^\]]+)\]"
)

def _parse_evidence_lines(prompt: str) -> list[dict[str, Any]]:
    out = []
    for m in _ITEM_LINE_RE.finditer(prompt):
        out.append({
            "actor": m.group("actor"), "action": m.group("action"), "object": m.group("object"),
            "place": m.group("place"), "mechanism": m.group("mechanism"),
            "year": int(m.group("year")), "id": m.group("id"),
        })
    return out

_VOCAB_LINE_RE = re.compile(r"^(actor|action|object|place|mechanism): (\[.*\])$", re.MULTILINE)
_VOCAB_ID_RE = re.compile(r"'id':\s*'([^']+)'")

def _parse_vocab_options(prompt: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for m in _VOCAB_LINE_RE.finditer(prompt):
        slot, body = m.group(1), m.group(2)
        ids = _VOCAB_ID_RE.findall(body)
        if ids:
            out[slot] = ids
    return out

def _rng_for(role: str, prompt: str) -> random.Random:
    h = hashlib.sha256()
    h.update(role.encode("utf-8"))
    h.update(b"\x00")
    h.update(prompt.encode("utf-8"))
    return random.Random(h.hexdigest())

_SLOTS = ("actor", "action", "object", "place", "mechanism")

_N_RE = re.compile(r"Propose exactly (\d+) distinct placements")

def _generator(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    items = _parse_evidence_lines(prompt)
    vocab_options = _parse_vocab_options(prompt)
    n_match = _N_RE.search(prompt)
    n = int(n_match.group(1)) if n_match else max(1, len(items) or 1)
    rng = _rng_for("generator", prompt)

    def _blank() -> dict[str, Any]:
        return {slot: (rng.choice(vocab_options[slot]) if vocab_options.get(slot) else f"other-{slot}") for slot in _SLOTS}

    proposals: list[dict[str, Any]] = []
    for item in items[:n]:
        proposals.append({
            **{slot: item[slot] for slot in _SLOTS},
            "time_hint": str(item["year"]),
            "supporting_evidence_ids": [item["id"]],
            "rationale": "fake stand-in: echoed from the evidence item's own slots",
        })

    base = items[0] if items else None
    while len(proposals) < n:
        values = dict(base) if base is not None else _blank()
        slot = rng.choice(_SLOTS)
        options = [o for o in vocab_options.get(slot, []) if o != values.get(slot)]
        if options:
            values[slot] = rng.choice(options)
        proposals.append({
            **{s: values[s] for s in _SLOTS},
            "time_hint": str(values.get("year", "")) if base is not None else "",
            "supporting_evidence_ids": [],
            "rationale": "fake stand-in: one random neighbor of the evidence-echoed base",
        })

    return {"proposals": proposals}

_SUPPORT_BLOCK_RE = re.compile(r"Supporting evidence:\n(.*?)\n\nRefuting evidence:", re.DOTALL)
_HAS_LINE_RE = re.compile(r"^- \(", re.MULTILINE)
_REFUTE_BLOCK_RE = re.compile(r"Refuting evidence:\n(.*?)(?:\n\n|\Z)", re.DOTALL)
_ID_RE = re.compile(r"\[([^\[\]]+)\]$", re.MULTILINE)

def _critic(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    m = _SUPPORT_BLOCK_RE.search(prompt)
    supporting = m.group(1) if m else ""
    r = _REFUTE_BLOCK_RE.search(prompt)
    refuting = r.group(1) if r else ""
    discrimination = {**{eid: "moderate" for eid in _ID_RE.findall(supporting)},
                      **{eid: "weak" for eid in _ID_RE.findall(refuting)}}
    if _HAS_LINE_RE.search(supporting):
        return {"keep": True, "issues": [], "rationale": "fake stand-in: at least one linked evidence item supports this hypothesis",
                "discrimination": discrimination}
    return {
        "keep": False,
        "issues": ["no supporting evidence linked to this hypothesis"],
        "rationale": "fake stand-in: the supporting-evidence section is empty",
        "discrimination": discrimination,
    }

def _unknown_unknown(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    proposals = [
        {
            "slot": slot,
            "label": f"Fake unnamed {slot}",
            "rationale": "fake stand-in: one OTHER proposal per slot, unconditional",
        }
        for slot in _SLOTS
    ]
    return {"proposals": proposals}

_CANDIDATE_BLOCK_RE = re.compile(r"Candidate items:\n(.*?)\n\n", re.DOTALL)

def _advocate(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    m = _CANDIDATE_BLOCK_RE.search(prompt)
    ids = _ID_RE.findall(m.group(1)) if m else []
    return {
        "support": [{"id": ids[0], "reason": "fake stand-in: first candidate"}] if ids else [],
        "decisive_test": "fake stand-in: no test named",
    }

def _preservation_critic(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "expected_evidence": [],
        "could_have_survived": True,
        "detectability_adjustment": 0.5,
        "rationale": "fake stand-in: neutral detectability adjustment",
    }

_JUDGE_COUNTS_RE = re.compile(r"^(?P<label>[AB]) \(supports=(?P<supports>\d+), refutes=(?P<refutes>\d+)\):", re.MULTILINE)

def _judge(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    counts = {m.group("label"): (int(m.group("supports")), int(m.group("refutes"))) for m in _JUDGE_COUNTS_RE.finditer(prompt)}
    supports_a, refutes_a = counts.get("A", (0, 0))
    supports_b, refutes_b = counts.get("B", (0, 0))
    net_a, net_b = supports_a - refutes_a, supports_b - refutes_b
    p_a_wins = sigmoid(net_a - net_b)
    return {"p_a_wins": p_a_wins, "rationale": f"fake stand-in: sigmoid(net(A)-net(B)) = sigmoid({net_a} - {net_b}) = {p_a_wins:.4f}"}

_POPULATION_LINE_RE = re.compile(r"^- \[", re.MULTILINE)

def _meta_review(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    n = len(_POPULATION_LINE_RE.findall(prompt))
    return {
        "summary": f"fake stand-in: reviewed a population of {n} hypotheses",
        "flags": [],
        "recommended_actions": ["continue"],
    }

_MISSING_MASS_RE = re.compile(r"'missing_mass':\s*([-\d.eE]+)")
_STEADY_RE = re.compile(r"'steady':\s*(True|False)")
_BRIER_RE = re.compile(r"'calibration_brier':\s*([-\d.eE]+|None)")

def _self_report(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    mm = _MISSING_MASS_RE.search(prompt)
    missing_mass = float(mm.group(1)) if mm else 0.0
    steady_m = _STEADY_RE.search(prompt)
    steady = steady_m.group(1) == "True" if steady_m else True
    brier_m = _BRIER_RE.search(prompt)
    brier_text = brier_m.group(1) if brier_m else "unknown"
    return {
        "assumptions": ["fake stand-in self-report: no real judgment applied"],
        "incomplete_vocabularies": [],
        "missing_mass_estimate": missing_mass,
        "calibration_summary": f"fake stand-in: calibration_brier={brier_text}",
        "target_blind_steady": steady,
        "target_blind_note": "fake stand-in: echoed from the run's own target_blind.steady",
    }

_UNDERSTANDING_STATEMENT_RE = re.compile(r"Hypothesis:\s*(.*?)\n\n", re.DOTALL)

def _understanding(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    m = _UNDERSTANDING_STATEMENT_RE.search(prompt)
    statement = m.group(1).strip() if m else "this hypothesis"
    return {
        "explanation": f"fake stand-in explanation: in plain terms, {statement}",
    }

_DOC_RE = re.compile(r"Document:\n(.*)\Z", re.DOTALL)
_MICRO_LINE_RE = re.compile(
    r"actor=(\S+) action=(\S+) object=(\S+) place=(\S+) mechanism=(\S+) year=(-?\d+)"
)

def _extract(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    m = _DOC_RE.search(prompt)
    doc = m.group(1) if m else ""
    items: list[dict[str, Any]] = []
    for line in doc.splitlines():
        mm = _MICRO_LINE_RE.search(line)
        if not mm:
            continue
        actor, action, obj, place, mechanism, year = mm.groups()
        items.append({
            "kind": "textual", "tier": "T3", "quote": line.strip(),
            "claim": "fake stand-in extraction: echoed from the synthetic microformat",
            "actor": actor, "action": action, "object": obj, "place": place, "mechanism": mechanism,
            "year": int(year), "stance": "positive",
        })
    if not items and doc.strip():
        items.append({
            "kind": "textual", "tier": "T3", "quote": doc.strip(),
            "claim": "fake stand-in extraction: whole-document echo, no recognizable microformat line",
        })
    return {"items": items}

_DISPATCH = {
    "generator": _generator,
    "critic": _critic,
    "unknown_unknown": _unknown_unknown,
    "preservation_critic": _preservation_critic,
    "advocate": _advocate,
    "judge": _judge,
    "meta_review": _meta_review,
    "self_report": _self_report,
    "understanding": _understanding,
    "extractor": _extract,
    "escalation": _extract,
}

def complete(prompt: str, *, role: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    fn = _DISPATCH.get(role)
    if fn is None:
        raise KeyError(f"hte.fakellm has no deterministic stand-in for role {role!r}")
    return fn(prompt, schema)

__all__ = ["complete"]
