"""No-network unit tests for StoichBalance (tools_stoich).

Verifies the ACTUAL null-space balancing on equations with KNOWN coefficients:
  * H2 + O2 -> H2O   → 2, 1, 2  (the load-bearing assertion);
  * combustion C3H8 + O2 -> CO2 + H2O → 1, 5, 3, 4;
  * a redox-ish case Fe + O2 -> Fe2O3 → 4, 3, 2;
  * limiting-reagent stoichiometry on a known case;
  * malformed input returns a structured error, never raises.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_stoich.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_stoich as st  # noqa: E402


# =========================================================================
# Load-bearing: H2 + O2 -> H2O balances to 2, 1, 2.
# =========================================================================
def test_water_balances_2_1_2():
    out = st.run_stoich_balance({"equation": "H2 + O2 -> H2O"})
    assert out["coefficients"] == [2, 1, 2]
    assert out["balanced_equation"] == "2 H2 + O2 -> 2 H2O"


def test_demo_is_water():
    out = st.run_stoich_balance({"demo": True})
    assert out["coefficients"] == [2, 1, 2]
    assert out["ground_truth"]["coefficients"] == [2, 1, 2]


def test_propane_combustion():
    # C3H8 + O2 -> CO2 + H2O  →  1, 5, 3, 4
    out = st.run_stoich_balance({"equation": "C3H8 + O2 -> CO2 + H2O"})
    assert out["coefficients"] == [1, 5, 3, 4]


def test_iron_oxide():
    # Fe + O2 -> Fe2O3  →  4, 3, 2
    out = st.run_stoich_balance({"equation": "Fe + O2 -> Fe2O3"})
    assert out["coefficients"] == [4, 3, 2]


def test_ammonia_synthesis():
    # N2 + H2 -> NH3  →  1, 3, 2
    out = st.run_stoich_balance({"equation": "N2 + H2 -> NH3"})
    assert out["coefficients"] == [1, 3, 2]


def test_parens_and_balance():
    # Ca(OH)2 + HCl -> CaCl2 + H2O  →  1, 2, 1, 2
    out = st.run_stoich_balance({"equation": "Ca(OH)2 + HCl -> CaCl2 + H2O"})
    assert out["coefficients"] == [1, 2, 1, 2]


# =========================================================================
# molar mass + limiting reagent
# =========================================================================
def test_molar_mass_water():
    # H2O = 2*1.008 + 15.999 = 18.015
    assert abs(st.molar_mass("H2O") - 18.015) < 0.01


def test_limiting_reagent():
    # 2 H2 + O2 -> 2 H2O. Supply 2 mol H2, 2 mol O2.
    # extent: H2 → 2/2 = 1; O2 → 2/1 = 2. H2 is limiting (smaller extent).
    # product water = extent * 2 = 2 mol; O2 remaining = 2 - 1*1 = 1 mol.
    out = st.run_stoich_balance({
        "equation": "H2 + O2 -> H2O",
        "amounts": {"H2": 2, "O2": 2},
    })
    s = out["stoichiometry"]
    assert s["limiting_reagent"] == "H2"
    assert abs(s["extent_of_reaction"] - 1.0) < 1e-6
    assert abs(s["product_moles"]["H2O"] - 2.0) < 1e-6
    assert abs(s["reactant_moles_remaining"]["O2"] - 1.0) < 1e-6


# =========================================================================
# robustness
# =========================================================================
def test_no_arrow_error():
    assert st.run_stoich_balance({"equation": "H2 + O2 H2O"}).get("error")


def test_garbage_error():
    assert st.run_stoich_balance({"equation": ""}).get("error")
    assert st.run_stoich_balance({"equation": 12345}).get("error")
    # distinct fictitious elements on each side cannot conserve atoms → error
    assert st.run_stoich_balance({"equation": "Zz -> Qq"}).get("error")


def test_unbalanceable_returns_error():
    # An element on the left with no home on the right cannot balance.
    out = st.run_stoich_balance({"equation": "Na -> Cl"})
    assert out.get("error")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
