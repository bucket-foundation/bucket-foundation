"""No-network unit tests for MaterialsFeaturizer (tools_materials).

Verifies the ACTUAL Magpie-style featurization on compositions with KNOWN,
hand-checkable ground truth:
 * NaCl (50/50) has mean Pauling electronegativity = (0.93 + 3.16)/2 = 2.045
 (the load-bearing assertion) and molar mass ≈ 58.44 g/mol;
 * formula parsing handles subscripts, fractional stoichiometry, and nested
 parentheses (Fe2O3 → 40% Fe / 60% O; Mg(OH)2 → Mg1 O2 H2);
 * descriptor families (mean/range/avg_deviation/mode) are present and a flat
 feature vector is produced;
 * unknown elements + malformed formulas return a structured error, never raise.

Run: cd services/research-tools && python3 -m pytest tests/test_tools_materials.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_materials as m  # noqa: E402


# =========================================================================
# The load-bearing assertion: correct mean electronegativity for NaCl.
# =========================================================================
def test_nacl_mean_electronegativity():
    out = m.run_materials_featurizer({"demo": True})
    en = out["descriptors"]["electronegativity"]["mean"]
    # (0.93 Na + 3.16 Cl) / 2 = 2.045
    assert abs(en - 2.045) < 1e-3
    assert abs(out["molar_mass_g_per_mol"] - 58.44) < 0.01
    assert out["n_elements"] == 2
    gt = out["ground_truth"]
    assert abs(en - gt["mean_electronegativity"]) < 1e-3


# =========================================================================
# formula parsing
# =========================================================================
def test_parse_simple_subscripts():
    counts = m.parse_formula("Fe2O3")
    assert counts == {"Fe": 2.0, "O": 3.0}


def test_parse_fractions():
    counts = m.parse_formula("La0.7Sr0.3MnO3")
    assert abs(counts["La"] - 0.7) < 1e-9
    assert abs(counts["Sr"] - 0.3) < 1e-9
    assert counts["Mn"] == 1.0 and counts["O"] == 3.0


def test_parse_nested_parentheses():
    counts = m.parse_formula("Mg(OH)2")
    assert counts == {"Mg": 1.0, "O": 2.0, "H": 2.0}


def test_fe2o3_fractions():
    out = m.featurize("Fe2O3")
    assert abs(out["atomic_fractions"]["Fe"] - 0.4) < 1e-9
    assert abs(out["atomic_fractions"]["O"] - 0.6) < 1e-9
    # molar mass = 2*55.845 + 3*15.999 = 159.687
    assert abs(out["molar_mass_g_per_mol"] - 159.687) < 0.01


# =========================================================================
# descriptors + feature vector
# =========================================================================
def test_descriptor_families_present():
    out = m.run_materials_featurizer({"formula": "GaAs"})
    aw = out["descriptors"]["atomic_weight"]
    for stat in ("mean", "min", "max", "range", "avg_deviation", "mode"):
        assert stat in aw
    assert out["n_features"] > 0
    # an elemental single-element compound has range 0
    pure = m.featurize("Fe")
    assert pure["descriptors"]["atomic_weight"]["range"] == 0.0


def test_range_is_max_minus_min():
    out = m.featurize("NaCl")
    en = out["descriptors"]["electronegativity"]
    assert abs(en["range"] - (en["max"] - en["min"])) < 1e-6


# =========================================================================
# resilience, never crash on malformed input
# =========================================================================
def test_unknown_element_error():
    assert m.run_materials_featurizer({"formula": "Xx2O3"}).get("error")


def test_empty_and_garbage_error():
    assert m.run_materials_featurizer({"formula": ""}).get("error")
    assert m.run_materials_featurizer({"formula": "(((" }).get("error")
    assert m.run_materials_featurizer({"formula": 12345}).get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
