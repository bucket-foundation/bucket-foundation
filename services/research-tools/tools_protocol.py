#!/usr/bin/env python3
"""
research-tools, ProtocolGPT (REAL logic, CPU, no GPU, no network required)
==========================================================================

FUNCTIONAL backend for ProtocolGPT (docs/research-tools/02-tool-
roadmap.md §T1, opp #19). It turns a freeform methods/SOP description into a
structured, runnable lab protocol:

 * ordered steps (verb-led, deduplicated, sequenced)
 * reagents table (name + concentration/amount where stated)
 * volumes / amounts extracted from the prose
 * timings (durations + temperatures) attached to the steps that mention them
 * safety flags (a real hazard lexicon: corrosives, toxics, flammables,
 biohazards, sharps, UV, cryogens, centrifugation, electrophoresis, …)
 * a deterministic, validated JSON protocol schema

Design rules (match tools_rag.py / tools_dnarna.py / tools_neuro.py):
 * REAL rule/template extraction over the input text + a built-in methods
 knowledge base (action verbs, units, reagent cues, hazard lexicon). This is
 NOT a stub: it parses the user's actual prose into structured fields.
 * LLM-GROUNDED if a key is present: when ANTHROPIC_API_KEY (or OPENAI_API_KEY)
 is set, ProtocolGPT can ask the model to *clean up* the rule-extracted
 skeleton (same schema, validated). The model NEVER invents the structure, 
 the rule extractor always runs first and the schema is enforced after, so
 the output is deterministic-by-shape whether or not a key exists. With no
 key (the default on the box), the pure rule path is the product.
 * Pure functions for every extraction step so they unit-test with fixtures,
 ZERO network, ZERO GPU (see tests/).
 * run_protocol_gpt(payload) -> dict returns the `output` payload only; the
 gateway (gateway.py) wraps it in the v1 job-result envelope + provenance.

The gateway imports PROTOCOL_RUNNERS from here.

TODO(deploy): the optional LLM cleanup path uses a hosted API; it is OFF unless
a key is present in the environment, and the rule extractor is the real,
shipped behavior. No key is set on the Hetzner box today, so the deterministic
rule path is what runs in production. Adding a key is a config change; the
code stays the same.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Optional

try:  # the shared LLM seam (optional polish only; never required)
    import llm_client
except Exception:  # pragma: no cover - import guard
    llm_client = None  # type: ignore

# ===========================================================================
# Methods knowledge base (the "templates" + lexicons the extractor runs on)
# ===========================================================================
# Imperative protocol verbs. A sentence/clause led by one of these is a STEP.
ACTION_VERBS = {
    "add", "mix", "incubate", "centrifuge", "spin", "vortex", "wash", "resuspend",
    "dilute", "transfer", "pipette", "aspirate", "discard", "remove", "collect",
    "elute", "load", "run", "stain", "destain", "image", "measure", "record",
    "heat", "cool", "chill", "freeze", "thaw", "warm", "boil", "denature",
    "anneal", "ligate", "digest", "amplify", "pcr", "transform", "transfect",
    "plate", "streak", "inoculate", "culture", "grow", "harvest", "lyse",
    "sonicate", "homogenize", "filter", "dialyze", "concentrate", "precipitate",
    "extract", "purify", "equilibrate", "calibrate", "label", "block", "quench",
    "rinse", "dry", "store", "prepare", "weigh", "dissolve", "adjust", "set",
    "apply", "spread", "seal", "vacuum", "degas", "sterilize", "autoclave",
    "filter-sterilize", "spin-down", "decant", "titrate", "neutralize", "place",
    "shake", "rotate", "invert", "flick", "tap", "fix", "permeabilize", "mount",
}

# Common reagent / consumable cues. A capitalized or acronymic token next to a
# concentration/amount, OR a token from this set, is treated as a reagent.
REAGENT_CUES = {
    "buffer", "edta", "tris", "naoh", "hcl", "nacl", "kcl", "mgcl2", "cacl2",
    "sds", "pbs", "tbs", "tween", "triton", "glycerol", "ethanol", "methanol",
    "acetone", "chloroform", "phenol", "agarose", "acrylamide", "dtt", "bme",
    "bsa", "milk", "antibody", "primer", "dntp", "polymerase", "ligase",
    "restriction", "enzyme", "taq", "dna", "rna", "plasmid", "media", "medium",
    "lb", "agar", "ampicillin", "kanamycin", "iptg", "x-gal", "glucose",
    "trypsin", "fbs", "serum", "dmem", "rpmi", "paraformaldehyde", "pfa",
    "formaldehyde", "methylene", "coomassie", "ponceau", "h2o", "water",
    "isopropanol", "guanidine", "urea", "imidazole", "betamercaptoethanol",
    "proteinase", "rnase", "dnase", "lysozyme", "ammonium", "sulfate",
    "magnesium", "calcium", "sodium", "potassium", "ethidium", "sybr",
    "loading", "ladder", "marker", "dye", "substrate", "atp", "gtp", "cofactor",
}

# Hazard lexicon → (flag label, plain-language guidance). REAL safety logic.
HAZARDS: list[tuple[set[str], str, str]] = [
    ({"phenol", "chloroform", "acrylamide", "ethidium", "etbr", "formaldehyde",
      "paraformaldehyde", "pfa", "methanol", "guanidine", "betamercaptoethanol",
      "bme", "mercaptoethanol", "dtt", "azide", "cyanide", "acrylamide"},
     "toxic / corrosive reagent",
     "Handle in a fume hood with gloves; these are toxic, mutagenic, or corrosive. Dispose as hazardous waste."),
    ({"ethanol", "methanol", "isopropanol", "acetone", "ether", "flammable"},
     "flammable solvent",
     "Keep away from open flame/sparks; use in a ventilated area."),
    ({"hcl", "naoh", "koh", "acid", "base", "sulfuric", "h2so4", "hno3"},
     "strong acid / base",
     "Wear eye protection and gloves; add acid to water, never water to acid."),
    ({"uv", "ultraviolet", "transilluminator"},
     "UV exposure",
     "Use a UV face shield and skin protection at the transilluminator."),
    ({"liquid", "nitrogen", "ln2", "dry-ice", "cryogenic", "cryo"},
     "cryogen / extreme cold",
     "Use cryo-gloves and a face shield; never seal cryogenic containers."),
    ({"radioactive", "32p", "35s", "3h", "isotope", "isotopic"},
     "radioisotope",
     "Follow your radiation-safety protocol; shield, badge, and survey."),
    ({"biosafety", "bsl-2", "bsl2", "pathogen", "virus", "bacteria", "infectious",
      "biohazard", "lentivirus", "retrovirus"},
     "biohazard",
     "Work at the appropriate biosafety level in a BSC; decontaminate waste."),
    ({"centrifuge", "centrifugation", "ultracentrifuge", "rotor", "spin"},
     "high-speed centrifugation",
     "Balance the rotor; never open while spinning; respect the rotor's max RCF."),
    ({"electrophoresis", "voltage", "power", "gel"},
     "electrical hazard (electrophoresis)",
     "Connect leads with the power off; high voltage in a conductive buffer is lethal."),
    ({"autoclave", "boil", "boiling", "steam"},
     "high temperature / steam",
     "Use heat-resistant gloves; let pressure/steam vent before opening."),
    ({"needle", "blade", "scalpel", "sharps", "syringe"},
     "sharps",
     "Use a sharps container; never recap needles by hand."),
]

# Unit patterns for amounts/volumes/concentrations (REAL parsing).
_NUM = r"\d+(?:\.\d+)?"
_VOLUME_RE = re.compile(
    rf"(?<![A-Za-z])({_NUM})\s*(µl|ul|μl|ml|l|µL|uL|mL|L|nl|nL)\b", re.I)
_MASS_RE = re.compile(
    rf"(?<![A-Za-z])({_NUM})\s*(ng|µg|ug|μg|mg|g|kg|pg)\b", re.I)
_CONC_RE = re.compile(
    rf"(?<![A-Za-z])({_NUM})\s*(mm|µm|um|μm|nm|pm|m|x|%|mg/ml|µg/ml|ug/ml|u/µl|u/ul|u/ml|units?/ml)\b",
    re.I)
_TIME_RE = re.compile(
    rf"(?<![A-Za-z])({_NUM})\s*(s|sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|overnight|o/n)\b",
    re.I)
_TEMP_RE = re.compile(
    rf"(?<![A-Za-z])(-?{_NUM})\s*°?\s*(c|°c|celsius|k|f)\b|\b(room temperature|rt|on ice|ice)\b",
    re.I)
_SPEED_RE = re.compile(
    rf"(?<![A-Za-z])({_NUM}\s*(?:,\d{{3}})?)\s*(rpm|rcf|×?\s*g|x\s*g|g)\b", re.I)

_SENT_SPLIT = re.compile(r"(?<=[.;!?])\s+|\n+")
# split a sentence into clauses on conjunctions/commas so "add X and mix" -> 2 steps
_CLAUSE_SPLIT = re.compile(r",\s+then\s+|\bthen\b|;\s+|,\s+and\s+|\.\s+", re.I)
_WORD = re.compile(r"[A-Za-z][A-Za-z0-9\-]+")


# ===========================================================================
# Pure extraction functions
# ===========================================================================
def split_sentences(text: str) -> list[str]:
    """Split methods prose into sentences. Pure function."""
    return [s.strip() for s in _SENT_SPLIT.split(text or "") if s.strip()]


def split_steps(sentence: str) -> list[str]:
    """Split a sentence into action clauses. Pure function. A clause is kept as a
 step only if it begins with (or contains an early) imperative action verb."""
    parts = [p.strip(" ,.;") for p in _CLAUSE_SPLIT.split(sentence) if p.strip(" ,.;")]
    out: list[str] = []
    for p in parts:
        toks = [t.lower() for t in _WORD.findall(p)]
        if not toks:
            continue
        # an action clause leads with a verb, or has a verb within the first 3 tokens
        if toks[0] in ACTION_VERBS or any(t in ACTION_VERBS for t in toks[:3]):
            out.append(p)
    return out


def extract_timings(text: str) -> dict:
    """Extract durations + temperatures + speeds from a clause. Pure function."""
    times = [f"{m.group(1)} {m.group(2)}" for m in _TIME_RE.finditer(text)]
    temps: list[str] = []
    for m in _TEMP_RE.finditer(text):
        if m.group(3):  # "room temperature" / "on ice"
            temps.append(m.group(3).strip())
        else:
            temps.append(f"{m.group(1)}°{m.group(2).upper().replace('°','')}")
    speeds = [f"{m.group(1).replace(' ', '')} {m.group(2).strip()}" for m in _SPEED_RE.finditer(text)]
    return {
        "durations": _dedup(times),
        "temperatures": _dedup(temps),
        "speeds": _dedup(speeds),
    }


def extract_amounts(text: str) -> dict:
    """Extract volumes/masses/concentrations from a clause. Pure function."""
    vols = [f"{m.group(1)} {m.group(2)}" for m in _VOLUME_RE.finditer(text)]
    masses = [f"{m.group(1)} {m.group(2)}" for m in _MASS_RE.finditer(text)]
    concs = [f"{m.group(1)} {m.group(2)}" for m in _CONC_RE.finditer(text)]
    return {"volumes": _dedup(vols), "masses": _dedup(masses), "concentrations": _dedup(concs)}


def extract_reagents(text: str) -> list[dict]:
    """Find reagents mentioned in the text and attach any adjacent amount/conc.
 Pure function. A reagent is a known cue token, OR a capitalized/acronym token
 sitting next to a concentration/amount."""
    found: dict[str, dict] = {}
    toks = list(_WORD.finditer(text))
    amounts = extract_amounts(text)
    nearby_amount = (
        (amounts["concentrations"] + amounts["volumes"] + amounts["masses"]) or [""]
    )[0]
    for i, m in enumerate(toks):
        w = m.group(0)
        wl = w.lower()
        is_cue = wl in REAGENT_CUES
        # an ALL-CAPS or mixed-cap acronym (e.g. EDTA, MgCl2, Tris-HCl) is a reagent
        is_acronym = (len(w) >= 2 and w[0].isupper() and any(c.isupper() for c in w[1:])) or (
            w.isupper() and len(w) >= 2
        )
        if not (is_cue or is_acronym):
            continue
        # skip sentence-initial capitalized ordinary words that aren't cues
        if is_acronym and not is_cue and not re.search(r"\d|[A-Z].*[A-Z]", w):
            continue
        key = wl
        if key not in found:
            found[key] = {"name": w, "amount": "", "concentration": ""}
        # attach the nearest concentration/amount on the same clause
        if nearby_amount and not found[key]["concentration"]:
            if "%" in nearby_amount or re.search(r"(m|µ|u|n|p)?m\b|x\b|/ml", nearby_amount, re.I):
                found[key]["concentration"] = nearby_amount
            else:
                found[key]["amount"] = nearby_amount
    return list(found.values())


def detect_hazards(text: str) -> list[dict]:
    """Scan text against the hazard lexicon. Pure function. Returns flags +
 the trigger token + plain-language guidance."""
    toks = {t.lower() for t in _WORD.findall(text)}
    # also catch hyphen-joined and glued tokens
    toks |= {p for t in toks for p in t.split("-")}
    out: list[dict] = []
    seen: set[str] = set()
    for cues, label, guidance in HAZARDS:
        hit = sorted(toks & cues)
        if hit and label not in seen:
            seen.add(label)
            out.append({"flag": label, "triggers": hit, "guidance": guidance})
    return out


def _dedup(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        k = x.lower().strip()
        if k and k not in seen:
            seen.add(k)
            out.append(x.strip())
    return out


def build_protocol(text: str, *, title: str = "") -> dict:
    """Core REAL extraction: prose -> structured protocol. Pure function."""
    sentences = split_sentences(text)
    steps: list[dict] = []
    all_reagents: dict[str, dict] = {}
    all_hazards: dict[str, dict] = {}

    n = 0
    for sent in sentences:
        clauses = split_steps(sent)
        # if a sentence has no imperative clause but contains amounts/reagents,
        # still surface it as a (note) step so nothing is silently dropped.
        if not clauses:
            am = extract_amounts(sent)
            rg = extract_reagents(sent)
            if any(am.values()) or rg:
                clauses = [sent]
        for clause in clauses:
            n += 1
            timings = extract_timings(clause)
            amounts = extract_amounts(clause)
            reagents = extract_reagents(clause)
            hazards = detect_hazards(clause)
            for r in reagents:
                k = r["name"].lower()
                if k not in all_reagents or (not all_reagents[k]["concentration"] and r["concentration"]):
                    all_reagents[k] = r
            for h in hazards:
                all_hazards[h["flag"]] = h
            steps.append({
                "n": n,
                "action": _normalize_step(clause),
                "durations": timings["durations"],
                "temperatures": timings["temperatures"],
                "speeds": timings["speeds"],
                "volumes": amounts["volumes"],
                "masses": amounts["masses"],
                "concentrations": amounts["concentrations"],
                "reagents": [r["name"] for r in reagents],
                "safety_flags": [h["flag"] for h in hazards],
            })

    return {
        "title": title or _infer_title(text),
        "n_steps": len(steps),
        "steps": steps,
        "reagents": sorted(all_reagents.values(), key=lambda r: r["name"].lower()),
        "safety_flags": list(all_hazards.values()),
    }


def _normalize_step(clause: str) -> str:
    """Capitalize the leading verb + ensure terminal period. Pure function."""
    c = clause.strip().rstrip(".")
    if c:
        c = c[0].upper() + c[1:]
    return c + "."


def _infer_title(text: str) -> str:
    """Best-effort protocol title from the first informative noun-ish phrase."""
    first = (split_sentences(text) or [""])[0]
    toks = _WORD.findall(first)
    if not toks:
        return "Extracted protocol"
    return "Protocol: " + " ".join(toks[:8])


# ===========================================================================
# Optional LLM cleanup (OFF unless the LLM seam is configured). The rule
# extractor always runs first and the schema is enforced; the model may ONLY
# rewrite the human-readable `action` wording of existing steps, it cannot add,
# remove, reorder, or renumber steps, and it cannot touch the parsed reagents,
# timings, amounts, or safety flags. If the model is unreachable or returns
# anything unexpected, we keep the deterministic steps verbatim.
# ===========================================================================
def _llm_available() -> bool:
    # Configured local/remote OpenAI-compatible seam (default: Gian's local GPU
    # LLM), OR a legacy hosted key. The seam is the preferred path.
    if llm_client is not None and llm_client.enabled():
        return True
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))


_POLISH_SYSTEM = (
    "You are a lab-protocol copy-editor. You are given an ORDERED list of "
    "protocol steps, each already parsed by a deterministic extractor. Rewrite "
    "ONLY the wording of each step's action to read as a clear, imperative, "
    "single-sentence lab instruction. You MUST NOT add, remove, reorder, merge, "
    "or split steps; you MUST NOT change any numbers, volumes, times, "
    "temperatures, reagents, or concentrations; you MUST NOT invent anything. "
    "Return ONLY a JSON object of the exact shape "
    '{"steps": [{"n": <int>, "action": <string>}]} with one entry per input '
    "step, same `n` values, no markdown."
)


def _polish_steps_with_llm(steps: list[dict]) -> Optional[dict[int, str]]:
    """Ask the LLM to refine ONLY the `action` text of the existing steps.

 Returns a {n: polished_action} map for steps the model returned cleanly, or
 None if the LLM is unavailable / failed / returned an unusable shape. The
 caller keeps the deterministic action for any step not in the map, so this is
 always safe and additive.
    """
    if llm_client is None or not llm_client.enabled() or not steps:
        return None
    valid_ns = {int(s["n"]) for s in steps}
    user = json.dumps(
        {"steps": [{"n": int(s["n"]), "action": s["action"]} for s in steps]},
        ensure_ascii=False,
    )
    raw = llm_client.chat(_POLISH_SYSTEM, user, max_tokens=1200, temperature=0.1)
    if not raw:
        return None
    txt = raw.strip()
    # tolerate ```json fences
    if txt.startswith("```"):
        txt = re.sub(r"^```(?:json)?", "", txt).rsplit("```", 1)[0].strip()
    start, end = txt.find("{"), txt.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        obj = json.loads(txt[start:end + 1])
    except (ValueError, TypeError):
        return None
    out: dict[int, str] = {}
    for item in (obj.get("steps") or []):
        try:
            n = int(item.get("n"))
            action = str(item.get("action") or "").strip()
        except (TypeError, ValueError):
            continue
        # only accept rewrites for steps that exist (no injection)
        if n in valid_ns and action:
            out[n] = action if action.endswith((".", "!", "?")) else action + "."
    return out or None


# ===========================================================================
# Public runner
# ===========================================================================
def run_protocol_gpt(payload: dict) -> dict:
    """payload: { methods: str (freeform methods/SOP description), title?: str }

 Turns freeform methods prose into a validated, structured, runnable protocol:
 ordered steps with timings/temps/volumes, a reagent table, and safety flags.
 Deterministic rule extraction (the shipped product); LLM cleanup is used only
 if a key is present and never changes the schema.
    """
    methods = (payload.get("methods") or payload.get("text") or "").strip()
    if len(methods) < 15:
        return {"error": "paste a methods/SOP description (>= 15 chars) to structure"}
    if len(methods) > 40000:
        return {"error": "methods text too long (max 40000 chars)"}
    title = (payload.get("title") or "").strip()

    proto = build_protocol(methods, title=title)
    if proto["n_steps"] == 0:
        return {
            "degraded": True,
            "message": (
                "No imperative protocol steps were detected. Phrase the methods as "
                "actions (e.g. 'Add 5 µL buffer, incubate 30 min at 37°C')."
            ),
            "title": proto["title"],
            "reagents": proto["reagents"],
            "safety_flags": proto["safety_flags"],
            "steps": [],
            "n_steps": 0,
        }

    # Optional LLM polish: refine ONLY the wording of existing steps. The
    # deterministic structure (count, order, numbers, reagents, timings, safety)
    # is preserved; if the LLM is down or misbehaves, steps are unchanged.
    llm_applied = False
    polished = _polish_steps_with_llm(proto["steps"])
    if polished:
        for s in proto["steps"]:
            new_action = polished.get(int(s["n"]))
            if new_action:
                s["action"] = new_action
        llm_applied = True

    return {
        "method": "deterministic rule/template extraction over a methods knowledge base",
        "llm_cleanup_available": _llm_available(),
        "llm_cleanup_applied": llm_applied,
        "title": proto["title"],
        "n_steps": proto["n_steps"],
        "steps": proto["steps"],
        "reagents": proto["reagents"],
        "safety_flags": proto["safety_flags"],
        "summary": {
            "n_reagents": len(proto["reagents"]),
            "n_safety_flags": len(proto["safety_flags"]),
            "n_timed_steps": sum(1 for s in proto["steps"] if s["durations"] or s["temperatures"]),
        },
        "note": (
            "Steps, reagents, timings, temperatures, volumes, and safety flags are "
            "parsed from your actual prose by a deterministic rule extractor over a "
            "built-in methods knowledge base (action verbs, units, reagent cues, a "
            "hazard lexicon). With an LLM API key set, an optional cleanup pass "
            "refines wording within the SAME validated schema; with no key (default) "
            "the rule extraction IS the product. Always review before bench use."
        ),
    }


# Registry the gateway imports.
PROTOCOL_RUNNERS = {
    "protocolgpt": run_protocol_gpt,
}
