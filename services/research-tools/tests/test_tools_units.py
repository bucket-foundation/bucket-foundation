"""No-network unit tests for UnitDimCheck (tools_units).

Verifies the ACTUAL SI dimensional analysis on KNOWN cases:
  * F = m*a (N = kg*m/s^2) is dimensionally CONSISTENT;
  * F = m*v (N = kg*m/s) is dimensionally INCONSISTENT (the load-bearing catch);
  * J = N*m is consistent (energy);
  * unit conversions return the textbook factors (1 km = 1000 m, 1 h = 3600 s,
    1 atm ≈ 101325 Pa, affine 100 degC = 212 degF);
  * incompatible-dimension conversion returns a structured error;
  * malformed input returns a structured error, never raises.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_units.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_units as u  # noqa: E402


# =========================================================================
# Load-bearing: dimensional-consistency catches F=ma vs F=mv.
# =========================================================================
def test_newton_second_law_consistent():
    out = u.run_units({"op": "check", "equation": "N = kg*m/s^2"})
    assert out["consistent"] is True
    assert out["verdict"] == "DIMENSIONALLY CONSISTENT"


def test_wrong_force_equation_inconsistent():
    # F = m*v  →  kg*m/s  ≠  N (kg*m/s^2): MUST be flagged inconsistent.
    out = u.run_units({"op": "check", "equation": "N = kg*m/s"})
    assert out["consistent"] is False
    assert out["verdict"] == "DIMENSIONALLY INCONSISTENT"


def test_demo_matches_ground_truth():
    out = u.run_units({"demo": True})
    assert out["consistent"] is True
    assert out["ground_truth"]["F_eq_ma_consistent"] is True
    assert out["ground_truth"]["F_eq_mv_consistent"] is False


def test_energy_equation_consistent():
    # J = N*m  (work = force × distance)
    out = u.run_units({"op": "check", "equation": "J = N*m"})
    assert out["consistent"] is True
    # and power P = J/s = W
    out2 = u.run_units({"op": "check", "equation": "W = J/s"})
    assert out2["consistent"] is True


# =========================================================================
# conversions (textbook factors)
# =========================================================================
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
    # length → mass is impossible
    out = u.run_units({"op": "convert", "value": 1, "from": "m", "to": "kg"})
    assert out.get("error")


# =========================================================================
# parse + edge cases
# =========================================================================
def test_parse_derived_unit():
    out = u.run_units({"op": "parse", "unit": "J/(mol*K)"})
    # molar gas-constant dimensions: M L^2 T^-2 N^-1 Theta^-1
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
