from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_units as u  # noqa: E402

def test_newton_second_law_consistent():
    out = u.run_units({"op": "check", "equation": "N = kg*m/s^2"})
    assert out["consistent"] is True
    assert out["verdict"] == "DIMENSIONALLY CONSISTENT"

def test_wrong_force_equation_inconsistent():
    out = u.run_units({"op": "check", "equation": "N = kg*m/s"})
    assert out["consistent"] is False
    assert out["verdict"] == "DIMENSIONALLY INCONSISTENT"

def test_demo_matches_ground_truth():
    out = u.run_units({"demo": True})
    assert out["consistent"] is True
    assert out["ground_truth"]["F_eq_ma_consistent"] is True
    assert out["ground_truth"]["F_eq_mv_consistent"] is False

def test_energy_equation_consistent():
    out = u.run_units({"op": "check", "equation": "J = N*m"})
    assert out["consistent"] is True
    out2 = u.run_units({"op": "check", "equation": "W = J/s"})
    assert out2["consistent"] is True

def test_km_to_m():
    out = u.run_units({"op": "convert", "value": 1, "from": "km", "to": "m"})
    assert abs(out["value_to"] - 1000.0) < 1e-9

def test_hours_to_seconds():
    out = u.run_units({"op": "convert", "value": 1, "from": "h", "to": "s"})
    assert abs(out["value_to"] - 3600.0) < 1e-9

def test_atm_to_pascal():
    out = u.run_units({"op": "convert", "value": 1, "from": "atm", "to": "Pa"})
    assert abs(out["value_to"] - 101325.0) < 1e-3

def test_affine_celsius_to_fahrenheit():
    out = u.run_units({"op": "convert", "value": 100, "from": "degC", "to": "degF"})
    assert abs(out["value_to"] - 212.0) < 1e-6
    out2 = u.run_units({"op": "convert", "value": 0, "from": "degC", "to": "degF"})
    assert abs(out2["value_to"] - 32.0) < 1e-6

def test_incompatible_conversion_error():
    out = u.run_units({"op": "convert", "value": 1, "from": "m", "to": "kg"})
    assert out.get("error")

def test_parse_derived_unit():
    out = u.run_units({"op": "parse", "unit": "J/(mol*K)"})
    dv = out["dimension_vector"]
    assert dv["M"] == "1" and dv["L"] == "2" and dv["T"] == "-2"
    assert dv["N"] == "-1" and dv["Theta"] == "-1"

def test_bad_op_error():
    assert u.run_units({"op": "frobnicate"}).get("error")

def test_unknown_unit_error():
    assert u.run_units({"op": "parse", "unit": "flurbles"}).get("error")
    assert u.run_units({"op": "convert", "value": 1, "from": "m", "to": "wibble"}).get("error")

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
