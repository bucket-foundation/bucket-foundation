"""A deterministic, no-subprocess stand-in for every role in `hte.roles`.

`hte.llm.complete` dispatches here when fake mode is on (`HTE_LLM_MODE=fake`
or `complete(..., mode="fake")`), instead of shelling out to `claude -p`.
This module never imports `subprocess`, never touches a cache directory,
and never reads `hte.roles`' own call-site objects (`Vocabulary`,
`EvidenceItem`, `Hypothesis`, ...): `llm.complete`'s own contract only
ever hands a role function `(prompt, schema)`, the rendered prompt STRING
and the JSON schema it must answer against, so every stand-in below reads
whatever it needs back out of `prompt`'s own text by regular expression,
never off a live object. This is a structural constraint:
`hte.roles.generate`'s own prompt-building code (`_evidence_line`) never
prints an evidence item's extracted slots into the prompt at all, only its
kind, tier, quote, and id, so a stand-in generator that wants the item's
own actor/action/object/place/mechanism/year has to find them inside the
quoted text. `hte.synth.make_world`'s own evidence spans are written for
exactly this reading: a synthetic quote is not narrative prose (unlike
`hte.corpus.fixtures`' hand-written English or `hte.corpus.quantum_history`'s
real markdown), it is the fixed microformat `_ITEM_LINE_RE` below parses,
`"actor=<id> action=<id> object=<id> place=<id> mechanism=<id> year=<int>"`,
chosen so a synthetic corpus round-trips its own planted truth through
every role's prompt text losslessly.

Every function here is a pure function of `(role, prompt)`: identical
inputs give an identical output on every call, in this process or the
next, with no call to `random.random()` un-seeded. Where a role needs
"a random choice" (the generator's own neighbor proposal), the choice is
seeded from a sha256 of `(role, prompt)` itself
(`_rng_for`), so two campaigns run from the same synthetic world (the same
seed, so the same evidence text) always draw the identical neighbor, and
two different worlds draw two different ones. This is what
`tests/campaigns/test_random_campaigns.py`'s own determinism assertion
(same seed twice, identical `SUMMARY` entry) rests on.

Every function returns a plain dict matching its role's own JSON schema in
`hte.roles` exactly (the same contract `hte.llm.complete` gives every real
`claude -p` response); `hte.roles.judge` itself extracts `response
["p_a_wins"]` and clamps it, so `_judge` below returns a dict carrying
that key (never a bare float), matching `hte.llm.complete`'s own contract
for every other role too.
"""
from __future__ import annotations

import hashlib
import random
import re
from typing import Any, Mapping

from .belief import sigmoid

# --------------------------------------------------------------------------
# Shared parsing helpers
# --------------------------------------------------------------------------

# One evidence line, `hte.roles._evidence_line`'s own rendering of
# `- (kind, tier) 'quote' [id]`, where `quote` is `hte.synth.make_world`'s
# own microformat. This regex ignores the surrounding `- (kind, tier) '...'`
# wrapper entirely and matches the KV tokens plus the trailing `[id]`
# directly, so it is agnostic to `repr()`'s own quoting choice.
_ITEM_LINE_RE = re.compile(
    r"actor=(?P<actor>\S+)\s+action=(?P<action>\S+)\s+object=(?P<object>\S+)\s+"
    r"place=(?P<place>\S+)\s+mechanism=(?P<mechanism>\S+)\s+year=(?P<year>-?\d+)"
    r"[^\[\]]*\[(?P<id>[^\]]+)\]"
)

# `hte.roles._describe_hypothesis` prints the same five slot names but with
# `interval=[start,end]` in place of `year=<int>`, so `_ITEM_LINE_RE` never
# matches a hypothesis description; only an evidence line (or an
# `unknown_unknown`/`generate` evidence block built from the same
# microformat) does.


def _parse_evidence_lines(prompt: str) -> list[dict[str, Any]]:
    """Every evidence item's own slots plus its id, in the order they
    appear in `prompt` (`hte.roles._evidence_line`'s own microformat
    quote, `hte.synth.make_world`'s own writing of it). Empty when
    `prompt` carries no evidence line at all (a `generate()` call with no
    evidence in context, `"(no evidence supplied)"`)."""
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
    """`{slot_name: [concept_id, ...]}` for every slot line `hte.roles.
    generate`'s own `_vocab_slot_options` renders (`"actor: [{'id': ...,
    'label': ...}, ...]"`). Empty for a slot whose line is not present."""
    out: dict[str, list[str]] = {}
    for m in _VOCAB_LINE_RE.finditer(prompt):
        slot, body = m.group(1), m.group(2)
        ids = _VOCAB_ID_RE.findall(body)
        if ids:
            out[slot] = ids
    return out


def _rng_for(role: str, prompt: str) -> random.Random:
    """A `random.Random` seeded from `sha256(role, prompt)`: the same
    `(role, prompt)` pair always seeds the same generator, so any "random"
    choice a stand-in below makes is a deterministic function of its own
    inputs, never of wall-clock entropy."""
    h = hashlib.sha256()
    h.update(role.encode("utf-8"))
    h.update(b"\x00")
    h.update(prompt.encode("utf-8"))
    return random.Random(h.hexdigest())


_SLOTS = ("actor", "action", "object", "place", "mechanism")


# --------------------------------------------------------------------------
# generator
# --------------------------------------------------------------------------

_N_RE = re.compile(r"Propose exactly (\d+) distinct placements")


def _generator(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """Proposes placements from the evidence slots plus one random
    neighbor: one proposal per evidence item found in `prompt` (its own
    slots and id, echoed verbatim, up to the
    requested count `n`), then, once every item has contributed one
    proposal, one-slot random mutations of the first item (seeded from
    `(role, prompt)`, `_rng_for`) filling out the rest of `n`. With no
    evidence in context at all, every proposal is instead drawn fresh
    from the vocabulary options `prompt` names.
    """
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


# --------------------------------------------------------------------------
# critic
# --------------------------------------------------------------------------

_SUPPORT_BLOCK_RE = re.compile(r"Supporting evidence:\n(.*?)\n\nRefuting evidence:", re.DOTALL)
_HAS_LINE_RE = re.compile(r"^- \(", re.MULTILINE)


def _critic(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """Keeps a hypothesis when at least one linked evidence item supports
    it (a non-empty "Supporting evidence:" section, `hte.roles.critique`'s
    own prompt layout), rejects it otherwise, with a written reason
    either way."""
    m = _SUPPORT_BLOCK_RE.search(prompt)
    supporting = m.group(1) if m else ""
    if _HAS_LINE_RE.search(supporting):
        return {"keep": True, "issues": [], "rationale": "fake stand-in: at least one linked evidence item supports this hypothesis"}
    return {
        "keep": False,
        "issues": ["no supporting evidence linked to this hypothesis"],
        "rationale": "fake stand-in: the supporting-evidence section is empty",
    }


# --------------------------------------------------------------------------
# unknown_unknown
# --------------------------------------------------------------------------


def _unknown_unknown(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """Proposes one OTHER label per concept-bearing slot, unconditionally:
    a fixed, minimal stand-in for a role whose real job (reading unnamed
    slot values off the evidence) needs judgment this module does not
    attempt to fake."""
    proposals = [
        {
            "slot": slot,
            "label": f"Fake unnamed {slot}",
            "rationale": "fake stand-in: one OTHER proposal per slot, unconditional",
        }
        for slot in _SLOTS
    ]
    return {"proposals": proposals}


# --------------------------------------------------------------------------
# preservation_critic
# --------------------------------------------------------------------------


def _preservation_critic(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """A neutral adjustment: no expected-evidence guess, survival judged
    plausible, and a mid-scale `0.5` detectability adjustment, regardless
    of `prompt`. This role's real job (reading a period's own
    detectability context) needs domain judgment this stand-in does not
    attempt."""
    return {
        "expected_evidence": [],
        "could_have_survived": True,
        "detectability_adjustment": 0.5,
        "rationale": "fake stand-in: neutral detectability adjustment",
    }


# --------------------------------------------------------------------------
# judge
# --------------------------------------------------------------------------

_OPINION_TEXT_RE = re.compile(r"opinion:\s*(Opinion\([^)]*\)|None)")
_OPINION_FIELDS_RE = re.compile(r"b=([-\d.eE]+),\s*d=([-\d.eE]+),\s*u=([-\d.eE]+),\s*a=([-\d.eE]+)")


def _project_from_text(text: str) -> float:
    """`Opinion.project()` read back off `hte.roles.judge`'s own f-string
    interpolation of an `Opinion` (its dataclass `repr`, `"Opinion(b=...,
    d=..., u=..., a=...)"`), or `0.5` for `"None"` (no recorded opinion,
    the same reading `hte.tournament._seed_elo` gives an unopined
    hypothesis)."""
    if text == "None":
        return 0.5
    m = _OPINION_FIELDS_RE.search(text)
    if not m:
        return 0.5
    b, _d, u, a = (float(x) for x in m.groups())
    return b + a * u


def _judge(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """Returns the two hypotheses' projected-probability difference
    passed through a sigmoid: `p_a_wins = sigmoid(P(A) - P(B))`, read off
    the two `Opinion` reprs `hte.roles.judge`'s own prompt embeds. Neither
    opinion found reads as `P = 0.5` for both, giving `p_a_wins = 0.5`."""
    matches = _OPINION_TEXT_RE.findall(prompt)
    p_a = _project_from_text(matches[0]) if len(matches) > 0 else 0.5
    p_b = _project_from_text(matches[1]) if len(matches) > 1 else 0.5
    p_a_wins = sigmoid(p_a - p_b)
    return {"p_a_wins": p_a_wins, "rationale": f"fake stand-in: sigmoid(P(A)-P(B)) = sigmoid({p_a:.4f} - {p_b:.4f}) = {p_a_wins:.4f}"}


# --------------------------------------------------------------------------
# meta_review
# --------------------------------------------------------------------------

_POPULATION_LINE_RE = re.compile(r"^- \[", re.MULTILINE)


def _meta_review(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """A fixed schema filled from the population: `summary` names the
    population size read straight off `prompt`'s own per-hypothesis
    lines (`hte.roles.meta_review`'s own `"- [{h.short_id}] ..."`
    rendering); `flags` and `recommended_actions` stay fixed, since
    flagging a real pattern needs judgment this stand-in does not
    attempt."""
    n = len(_POPULATION_LINE_RE.findall(prompt))
    return {
        "summary": f"fake stand-in: reviewed a population of {n} hypotheses",
        "flags": [],
        "recommended_actions": ["continue"],
    }


# --------------------------------------------------------------------------
# self_report
# --------------------------------------------------------------------------

_MISSING_MASS_RE = re.compile(r"'missing_mass':\s*([-\d.eE]+)")
_STEADY_RE = re.compile(r"'steady':\s*(True|False)")
_BRIER_RE = re.compile(r"'calibration_brier':\s*([-\d.eE]+|None)")


def _self_report(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """A fixed schema filled from the population: `missing_mass_estimate`
    and `target_blind_steady` are read straight off `run_summary`'s own
    dict repr (`hte.roles.self_report`'s own `f"Run data: {dict(run)}"`),
    the two numbers this stand-in has no reason to guess at when they are
    already sitting in the prompt text; every other field stays a fixed
    placeholder."""
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


# --------------------------------------------------------------------------
# understanding
# --------------------------------------------------------------------------

_UNDERSTANDING_STATEMENT_RE = re.compile(r"Hypothesis:\s*(.*?)\n\n", re.DOTALL)


def _understanding(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """Echoes `hte.roles.understanding`'s own `statement` argument, read
    back off its `"Hypothesis: {statement}\\n\\n"` prompt line, wrapped in
    a fixed plain-language frame. Deterministic and non-empty for every
    prompt this role ever builds, so a fake-mode run always clears
    `hte.canon_writeback.write_back`'s own non-blank gate."""
    m = _UNDERSTANDING_STATEMENT_RE.search(prompt)
    statement = m.group(1).strip() if m else "this hypothesis"
    return {
        "explanation": f"fake stand-in explanation: in plain terms, {statement}",
    }


# --------------------------------------------------------------------------
# extract / escalation
# --------------------------------------------------------------------------

_DOC_RE = re.compile(r"Document:\n(.*)\Z", re.DOTALL)
_MICRO_LINE_RE = re.compile(
    r"actor=(\S+) action=(\S+) object=(\S+) place=(\S+) mechanism=(\S+) year=(-?\d+)"
)


def _extract(prompt: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """Echoes the fixture slots: reads the document text `hte.roles.
    extract`'s own prompt embeds (`"Document:\\n{document_text}"`), and
    for every line matching this package's own synthetic microformat
    (`hte.synth.make_world`'s evidence quotes), returns one item quoting
    that exact line verbatim (so `hte.roles.extract`'s own span-anchoring,
    `_locate_span`, finds it) with its slots echoed straight off the line.
    A document carrying no such line at all (`hte.corpus.fixtures`' or
    `hte.corpus.quantum_history`'s own real prose) instead gets one
    whole-document echo item with no slots named, so this stand-in never
    silently returns nothing for a document it cannot parse.
    """
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
    "judge": _judge,
    "meta_review": _meta_review,
    "self_report": _self_report,
    "understanding": _understanding,
    "extractor": _extract,
    "escalation": _extract,
}


def complete(prompt: str, *, role: str, schema: Mapping[str, Any]) -> dict[str, Any]:
    """The one entry point `hte.llm.complete` calls in fake mode: dispatch
    on `role` to the matching stand-in above, which reads whatever it
    needs out of `prompt`'s own text and returns a dict matching `schema`.
    Raises `KeyError` for a role this module has no stand-in for, rather
    than guessing at a schema it has never seen."""
    fn = _DISPATCH.get(role)
    if fn is None:
        raise KeyError(f"hte.fakellm has no deterministic stand-in for role {role!r}")
    return fn(prompt, schema)


__all__ = ["complete"]
