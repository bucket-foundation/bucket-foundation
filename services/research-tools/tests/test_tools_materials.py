from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_materials as m  # noqa: E402

def test_nacl_mean_electronegativity():
    out = m.run_materials_featurizer({"demo": True})
    en = out["descriptors"]["electronegativity"]["mean"]
    assert abs(en - 2.045) < 1e-3
    assert abs(out["molar_mass_g_per_mol"] - 58.44) < 0.01
    assert out["n_elements"] == 2
    gt = out["ground_truth"]
    assert abs(en - gt["mean_electronegativity"]) < 1e-3

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
    assert abs(out["molar_mass_g_per_mol"] - 159.687) < 0.01

def test_descriptor_families_present():
    out = m.run_materials_featurizer({"formula": "GaAs"})
    aw = out["descriptors"]["atomic_weight"]
    for stat in ("mean", "min", "max", "range", "avg_deviation", "mode"):
        assert stat in aw
    assert out["n_features"] > 0
    pure = m.featurize("Fe")
    assert pure["descriptors"]["atomic_weight"]["range"] == 0.0

def test_range_is_max_minus_min():
    out = m.featurize("NaCl")
    en = out["descriptors"]["electronegativity"]
    assert abs(en["range"] - (en["max"] - en["min"])) < 1e-6

def test_unknown_element_error():
    assert m.run_materials_featurizer({"formula": "Xx2O3"}).get("error")

def test_empty_and_garbage_error():
    assert m.run_materials_featurizer({"formula": ""}).get("error")
    assert m.run_materials_featurizer({"formula": "(((" }).get("error")
    assert m.run_materials_featurizer({"formula": 12345}).get("error")

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
