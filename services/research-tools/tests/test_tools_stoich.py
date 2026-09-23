from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_stoich as st  # noqa: E402

def test_water_balances_2_1_2():
    out = st.run_stoich_balance({"equation": "H2 + O2 -> H2O"})
    assert out["coefficients"] == [2, 1, 2]
    assert out["balanced_equation"] == "2 H2 + O2 -> 2 H2O"

def test_demo_is_water():
    out = st.run_stoich_balance({"demo": True})
    assert out["coefficients"] == [2, 1, 2]
    assert out["ground_truth"]["coefficients"] == [2, 1, 2]

def test_propane_combustion():
    out = st.run_stoich_balance({"equation": "C3H8 + O2 -> CO2 + H2O"})
    assert out["coefficients"] == [1, 5, 3, 4]

def test_iron_oxide():
    out = st.run_stoich_balance({"equation": "Fe + O2 -> Fe2O3"})
    assert out["coefficients"] == [4, 3, 2]

def test_ammonia_synthesis():
    out = st.run_stoich_balance({"equation": "N2 + H2 -> NH3"})
    assert out["coefficients"] == [1, 3, 2]

def test_parens_and_balance():
    out = st.run_stoich_balance({"equation": "Ca(OH)2 + HCl -> CaCl2 + H2O"})
    assert out["coefficients"] == [1, 2, 1, 2]

def test_molar_mass_water():
    assert abs(st.molar_mass("H2O") - 18.015) < 0.01

def test_limiting_reagent():
    out = st.run_stoich_balance({
        "equation": "H2 + O2 -> H2O",
        "amounts": {"H2": 2, "O2": 2},
    })
    s = out["stoichiometry"]
    assert s["limiting_reagent"] == "H2"
    assert abs(s["extent_of_reaction"] - 1.0) < 1e-6
    assert abs(s["product_moles"]["H2O"] - 2.0) < 1e-6
    assert abs(s["reactant_moles_remaining"]["O2"] - 1.0) < 1e-6

def test_no_arrow_error():
    assert st.run_stoich_balance({"equation": "H2 + O2 H2O"}).get("error")

def test_garbage_error():
    assert st.run_stoich_balance({"equation": ""}).get("error")
    assert st.run_stoich_balance({"equation": 12345}).get("error")
    assert st.run_stoich_balance({"equation": "Zz -> Qq"}).get("error")

def test_unbalanceable_returns_error():
    out = st.run_stoich_balance({"equation": "Na -> Cl"})
    assert out.get("error")

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
