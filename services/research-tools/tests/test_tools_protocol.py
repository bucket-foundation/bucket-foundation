"""No-network unit tests for ProtocolGPT (tools_protocol).

Verifies the ACTUAL rule extraction on real methods prose:
  * imperative clauses become ordered steps;
  * timings/temperatures/volumes/concentrations are parsed from the text;
  * reagents are pulled into a table;
  * the hazard lexicon flags toxic/flammable/biohazard/etc. reagents.

ProtocolGPT touches NO network and needs NO GPU, so these run fully offline.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_protocol.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_protocol as p  # noqa: E402


# =========================================================================
# Pure extraction functions
# =========================================================================
def test_split_steps_picks_imperative_clauses():
    steps = p.split_steps("Add 5 µL buffer, then incubate for 30 min and mix gently")
    joined = " ".join(steps).lower()
    assert any("add" in s.lower() for s in steps)
    assert any("incubate" in s.lower() for s in steps)
    assert "mix" in joined


def test_extract_timings_durations_temps_speeds():
    t = p.extract_timings("incubate for 30 min at 37°C then spin at 12000 rpm")
    assert "30 min" in t["durations"]
    assert any("37" in x for x in t["temperatures"])
    assert any("rpm" in x for x in t["speeds"])


def test_extract_amounts_volumes_and_conc():
    a = p.extract_amounts("add 10 µL of 1 M NaCl and 2 mg protein")
    assert "10 µL" in a["volumes"]
    assert any("M" in c for c in a["concentrations"])
    assert any("mg" in m for m in a["masses"])


def test_extract_reagents_finds_known_and_acronyms():
    reagents = p.extract_reagents("add 5 µL EDTA and 10 µL Tris-HCl buffer")
    names = {r["name"].lower() for r in reagents}
    assert "edta" in names
    # "buffer" is a known cue; Tris-HCl is an acronym reagent
    assert any("buffer" in n for n in names) or any("tris" in n for n in names)


def test_detect_hazards_flags_toxic_and_flammable():
    hz = p.detect_hazards("extract with phenol and chloroform, then wash with ethanol")
    flags = {h["flag"] for h in hz}
    assert "toxic / corrosive reagent" in flags
    assert "flammable solvent" in flags


def test_detect_hazards_biohazard_and_uv():
    hz = p.detect_hazards("image the gel on the UV transilluminator; handle the lentivirus in a BSC")
    flags = {h["flag"] for h in hz}
    assert "UV exposure" in flags
    assert "biohazard" in flags


# =========================================================================
# Full runner — real protocol structuring on a realistic methods paragraph
# =========================================================================
METHODS = (
    "Prepare a 50 mL culture in LB medium with 100 µg/ml ampicillin. "
    "Inoculate with a single colony and grow overnight at 37°C with shaking. "
    "Harvest the cells by centrifugation at 4000 rpm for 10 min. "
    "Resuspend the pellet in 5 mL lysis buffer containing 1 mM EDTA and 10 mM Tris. "
    "Sonicate on ice for 2 min. "
    "Add phenol and chloroform to extract the protein, then mix vigorously."
)


def test_run_protocol_gpt_structures_real_methods():
    out = p.run_protocol_gpt({"methods": METHODS})
    assert out.get("error") is None
    assert out["n_steps"] >= 5, "should extract multiple ordered steps"
    # steps are sequentially numbered
    ns = [s["n"] for s in out["steps"]]
    assert ns == list(range(1, len(ns) + 1))
    # at least one step carries a parsed timing + temperature
    assert any(s["durations"] for s in out["steps"])
    assert any(s["temperatures"] for s in out["steps"])
    # reagents table is populated (ampicillin/EDTA/Tris/buffer/medium…)
    reagent_names = {r["name"].lower() for r in out["reagents"]}
    assert reagent_names, "reagent table should not be empty"
    # the phenol/chloroform step raises a toxic-reagent safety flag
    flags = {f["flag"] for f in out["safety_flags"]}
    assert "toxic / corrosive reagent" in flags
    # the centrifugation + autoclave/boil-free path still flags centrifugation
    assert "high-speed centrifugation" in flags


def test_run_protocol_gpt_validation():
    assert p.run_protocol_gpt({"methods": "short"}).get("error")
    assert p.run_protocol_gpt({}).get("error")


def test_run_protocol_gpt_no_steps_degrades_gracefully():
    # prose with no imperative actions + no amounts -> degraded, never crashes
    out = p.run_protocol_gpt({"methods": "This is a discussion of why the field matters a lot."})
    assert out.get("error") is None
    assert out.get("degraded") is True
    assert out["n_steps"] == 0


def test_run_protocol_gpt_is_deterministic():
    a = p.run_protocol_gpt({"methods": METHODS})
    b = p.run_protocol_gpt({"methods": METHODS})
    assert a["steps"] == b["steps"]
    assert a["reagents"] == b["reagents"]


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
