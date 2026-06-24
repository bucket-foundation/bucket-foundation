#!/usr/bin/env python3
"""
research-tools — UnitDimCheck (REAL dimensional analysis + unit conversion, CPU)
================================================================================

UNIVERSAL tool (physics-astro 108,466 PIs + engineering 93,027 + all quantitative
fields). Dimensional analysis is the single cheapest correctness check in all of
physical science: an equation that is not dimensionally homogeneous is WRONG,
full stop, before any number is plugged in. Yet most lab code has no unit layer,
and "the units didn't match" is a classic, expensive class of error (Mars
Climate Orbiter). UnitDimCheck gives a scriptable, no-dependency unit engine.

Three REAL operations over the 7 SI base dimensions
(mass M, length L, time T, electric current I, temperature Θ, amount N,
luminous intensity J):

  1. Unit parsing + dimension extraction
     ----------------------------------------------------------------------
     Parse a unit expression ("kg*m/s^2", "N", "J/(mol*K)", "m s^-2") into a
     dimension vector (the integer/rational exponents of the 7 base dimensions)
     AND an SI conversion factor. A built-in table of SI base + derived + common
     metric/imperial units, each with (factor-to-SI, dimension-vector), is
     composed multiplicatively.

  2. Unit conversion
     ----------------------------------------------------------------------
     Convert a value between two units IFF their dimension vectors are equal
     (otherwise a structured error naming the mismatch). value_to = value_from *
     factor_from / factor_to. (Affine temperatures °C/°F are handled specially.)

  3. Equation dimensional-consistency check
     ----------------------------------------------------------------------
     Given "LHS = RHS" where each side is a product/quotient of unit symbols,
     check that both sides reduce to the same dimension vector — catching, e.g.,
     F = m*a (consistent: both M·L·T⁻²) vs the wrong F = m*v (M·L·T⁻¹ ≠ M·L·T⁻²).

Everything is exact rational arithmetic over Fractions; deterministic; never
raises on malformed input (returns a structured {"error": ...}).

The gateway imports UNITS_RUNNERS from here.
"""
from __future__ import annotations

import re
from fractions import Fraction
from typing import Optional

# 7 SI base dimensions, fixed order.
_DIMS = ["M", "L", "T", "I", "Theta", "N", "J"]
_DIM_LABEL = {
    "M": "mass", "L": "length", "T": "time", "I": "current",
    "Theta": "temperature", "N": "amount", "J": "luminous_intensity",
}


def _z() -> dict[str, Fraction]:
    return {d: Fraction(0) for d in _DIMS}


def _dim(**kw) -> dict[str, Fraction]:
    v = _z()
    for k, val in kw.items():
        v[k] = Fraction(val)
    return v


# ---------------------------------------------------------------------------
# Unit table: symbol -> (SI factor, dimension vector). Factor converts the unit
# TO its SI coherent unit. REAL physical constants.
# ---------------------------------------------------------------------------
_M = _dim(M=1)
_L = _dim(L=1)
_T = _dim(T=1)
_I = _dim(I=1)
_TH = _dim(Theta=1)
_N = _dim(N=1)
_J = _dim(J=1)
_FORCE = _dim(M=1, L=1, T=-2)        # N
_ENERGY = _dim(M=1, L=2, T=-2)       # J
_POWER = _dim(M=1, L=2, T=-3)        # W
_PRESSURE = _dim(M=1, L=-1, T=-2)    # Pa
_CHARGE = _dim(I=1, T=1)             # C
_VOLT = _dim(M=1, L=2, T=-3, I=-1)   # V
_FREQ = _dim(T=-1)                   # Hz

_UNITS: dict[str, tuple[float, dict]] = {
    # base
    "kg": (1.0, _M), "g": (1e-3, _M), "mg": (1e-6, _M), "t": (1000.0, _M),
    "lb": (0.45359237, _M), "oz": (0.028349523, _M),
    "m": (1.0, _L), "cm": (1e-2, _L), "mm": (1e-3, _L), "um": (1e-6, _L),
    "nm": (1e-9, _L), "km": (1000.0, _L), "in": (0.0254, _L), "ft": (0.3048, _L),
    "mi": (1609.344, _L), "angstrom": (1e-10, _L),
    "s": (1.0, _T), "ms": (1e-3, _T), "us": (1e-6, _T), "ns": (1e-9, _T),
    "min": (60.0, _T), "h": (3600.0, _T), "hr": (3600.0, _T), "day": (86400.0, _T),
    "yr": (3.15576e7, _T),
    "A": (1.0, _I), "mA": (1e-3, _I),
    "K": (1.0, _TH),
    "mol": (1.0, _N), "mmol": (1e-3, _N),
    "cd": (1.0, _J),
    # derived
    "N": (1.0, _FORCE), "kN": (1000.0, _FORCE), "dyn": (1e-5, _FORCE),
    "J": (1.0, _ENERGY), "kJ": (1000.0, _ENERGY), "cal": (4.184, _ENERGY),
    "kcal": (4184.0, _ENERGY), "eV": (1.602176634e-19, _ENERGY),
    "Wh": (3600.0, _ENERGY), "kWh": (3.6e6, _ENERGY), "erg": (1e-7, _ENERGY),
    "W": (1.0, _POWER), "kW": (1000.0, _POWER), "MW": (1e6, _POWER),
    "hp": (745.6998716, _POWER),
    "Pa": (1.0, _PRESSURE), "kPa": (1000.0, _PRESSURE), "MPa": (1e6, _PRESSURE),
    "bar": (1e5, _PRESSURE), "atm": (101325.0, _PRESSURE),
    "mmHg": (133.322387415, _PRESSURE), "torr": (133.322368421, _PRESSURE),
    "psi": (6894.757293, _PRESSURE),
    "C": (1.0, _CHARGE), "V": (1.0, _VOLT),
    "Hz": (1.0, _FREQ), "kHz": (1000.0, _FREQ), "MHz": (1e6, _FREQ), "GHz": (1e9, _FREQ),
    "L": (1e-3, _dim(L=3)), "mL": (1e-6, _dim(L=3)), "uL": (1e-9, _dim(L=3)),
}

_AFFINE = {  # temperature: (slope to K, offset to K)
    "degC": (1.0, 273.15), "C_temp": (1.0, 273.15),
    "degF": (5.0 / 9.0, 255.3722222222222),
}


def _norm_token(tok: str) -> str:
    """Normalize unicode/aliases in a unit token."""
    tok = tok.replace("μ", "u").replace("Å", "angstrom").replace("°", "deg")
    return tok


def parse_unit(expr: str) -> tuple[Optional[float], Optional[dict], Optional[str]]:
    """Parse a unit expression → (SI factor, dimension vector, error).

    Grammar: products via '*' or whitespace, division via '/', powers via
    '^n' or 'unit2'/'unit-2' (e.g. 's^-2', 'm2'). '1' is dimensionless. Pure;
    never raises — returns ("error" string) on bad input.
    """
    s = _norm_token((expr or "").strip())
    if not s:
        return None, None, "empty unit"
    if s in ("1", "dimensionless", "-"):
        return 1.0, _z(), None
    # split into numerator / denominator around the first top-level '/'
    # (no parentheses nesting beyond one level supported, which covers the
    #  J/(mol*K) idiom: strip the parens).
    s = s.replace("·", "*").replace(" ", "*")
    # handle a single division
    if "/" in s:
        num, den = s.split("/", 1)
    else:
        num, den = s, ""
    num = num.strip("*()")
    den = den.strip("*()")

    factor = 1.0
    dim = _z()

    def apply(part: str, sign: int) -> Optional[str]:
        nonlocal factor, dim
        for raw in re.split(r"\*+", part):
            raw = raw.strip()
            if not raw or raw == "1":
                continue
            # extract trailing exponent: m^-2, m2, m^2, s-1
            mexp = re.match(r"^([A-Za-z]+)(?:\^?(-?\d+(?:\.\d+)?))?$", raw)
            if not mexp:
                return f"could not parse unit token '{raw}'"
            sym, exps = mexp.group(1), mexp.group(2)
            exp = Fraction(exps) if exps else Fraction(1)
            if sym not in _UNITS:
                return f"unknown unit '{sym}'"
            f, dv = _UNITS[sym]
            factor *= f ** float(exp * sign)
            for d in _DIMS:
                dim[d] += dv[d] * exp * sign
        return None

    err = apply(num, 1)
    if err:
        return None, None, err
    if den:
        err = apply(den, -1)
        if err:
            return None, None, err
    return factor, dim, None


def _dim_str(dim: dict) -> str:
    parts = []
    for d in _DIMS:
        e = dim[d]
        if e != 0:
            parts.append(f"{_DIM_LABEL[d]}^{e}" if e != 1 else _DIM_LABEL[d])
    return " · ".join(parts) if parts else "dimensionless"


def _dim_equal(a: dict, b: dict) -> bool:
    return all(a[d] == b[d] for d in _DIMS)


def convert(value: float, from_u: str, to_u: str) -> dict:
    # affine temperature special-case
    fu, tu = _norm_token(from_u.strip()), _norm_token(to_u.strip())
    aff_map = {"degC": "degC", "degF": "degF"}
    if fu in aff_map or tu in aff_map:
        def to_k(v, u):
            if u == "degC":
                return v + 273.15
            if u == "degF":
                return (v - 32) * 5.0 / 9.0 + 273.15
            if u == "K":
                return v
            return None
        def from_k(v, u):
            if u == "degC":
                return v - 273.15
            if u == "degF":
                return (v - 273.15) * 9.0 / 5.0 + 32
            if u == "K":
                return v
            return None
        k = to_k(value, fu)
        res = from_k(k, tu) if k is not None else None
        if res is None:
            return {"error": "temperature conversion only supports K, degC, degF"}
        return {"value_to": round(res, 8), "from": from_u, "to": to_u, "affine": True}

    ff, fd, e1 = parse_unit(from_u)
    if e1:
        return {"error": f"from-unit: {e1}"}
    tf, td, e2 = parse_unit(to_u)
    if e2:
        return {"error": f"to-unit: {e2}"}
    if not _dim_equal(fd, td):
        return {"error": f"incompatible dimensions: {_dim_str(fd)} vs {_dim_str(td)}"}
    res = value * ff / tf
    return {"value_to": round(res, 10), "from": from_u, "to": to_u,
            "dimension": _dim_str(fd), "affine": False}


def check_equation(eq: str) -> dict:
    eq = eq.replace("=", "\x00").split("\x00")
    if len(eq) != 2:
        return {"error": "equation must have exactly one '=' (e.g. 'N = kg*m/s^2')"}
    lhs, rhs = eq[0].strip(), eq[1].strip()
    lf, ld, e1 = parse_unit(lhs)
    if e1:
        return {"error": f"left side: {e1}"}
    rf, rd, e2 = parse_unit(rhs)
    if e2:
        return {"error": f"right side: {e2}"}
    consistent = _dim_equal(ld, rd)
    return {
        "lhs": lhs, "rhs": rhs,
        "lhs_dimension": _dim_str(ld),
        "rhs_dimension": _dim_str(rd),
        "consistent": consistent,
        "verdict": "DIMENSIONALLY CONSISTENT" if consistent else "DIMENSIONALLY INCONSISTENT",
    }


def run_units(payload: dict) -> dict:
    """payload (one of):
      { op: "convert", value: float, from: str, to: str }
      { op: "check",   equation: str }   e.g. "N = kg*m/s^2"
      { op: "parse",   unit: str }       e.g. "J/(mol*K)"
      { demo: true }  or  { op: "demo" } -> checks F = m*a (consistent)

    Real SI dimensional analysis, unit conversion, and equation consistency.
    Exact rational dimension arithmetic; deterministic; never raises.
    """
    op = (payload.get("op") or "").strip().lower()
    demo = bool(payload.get("demo")) or op == "demo"
    if demo:
        out = check_equation("N = kg*m/s^2")
        out["demo"] = True
        out["op"] = "check"
        out["method"] = _METHOD
        out["note"] = (
            "DEMO: 'N = kg*m/s^2' (Newton's second law, F = m·a). Both sides "
            "reduce to mass·length·time^-2 → DIMENSIONALLY CONSISTENT. By "
            "contrast 'N = kg*m/s' (F = m·v) reduces to mass·length·time^-1 and "
            "is flagged inconsistent. " + _NOTE
        )
        out["ground_truth"] = {"F_eq_ma_consistent": True, "F_eq_mv_consistent": False}
        return out

    if op == "convert":
        try:
            value = float(payload.get("value"))
        except Exception:
            return {"error": "convert needs a numeric 'value'"}
        fu = payload.get("from"); tu = payload.get("to")
        if not isinstance(fu, str) or not isinstance(tu, str) or not fu.strip() or not tu.strip():
            return {"error": "convert needs 'from' and 'to' unit strings"}
        res = convert(value, fu, tu)
        if "error" in res:
            return res
        res.update({"op": "convert", "value_from": value, "demo": False, "method": _METHOD, "note": _NOTE})
        return res

    if op == "check":
        eq = payload.get("equation")
        if not isinstance(eq, str) or "=" not in eq:
            return {"error": "check needs an 'equation' string with '=' (e.g. 'J = N*m')"}
        res = check_equation(eq)
        if "error" in res:
            return res
        res.update({"op": "check", "demo": False, "method": _METHOD, "note": _NOTE})
        return res

    if op == "parse":
        u = payload.get("unit")
        if not isinstance(u, str) or not u.strip():
            return {"error": "parse needs a 'unit' string"}
        f, d, err = parse_unit(u)
        if err:
            return {"error": err}
        return {
            "op": "parse", "unit": u, "si_factor": f,
            "dimension": _dim_str(d),
            "dimension_vector": {k: str(d[k]) for k in _DIMS if d[k] != 0},
            "demo": False, "method": _METHOD, "note": _NOTE,
        }

    return {"error": 'op must be "convert", "check", "parse", or use demo'}


_METHOD = (
    "Units are parsed into the 7 SI base dimensions (M, L, T, I, Θ, N, J) with an "
    "exact rational exponent vector plus an SI conversion factor, composed "
    "multiplicatively over a built-in table of base/derived/metric/imperial "
    "units. Conversion requires equal dimension vectors; consistency checking "
    "compares the reduced dimension vectors of both sides of an equation. Affine "
    "temperatures (°C/°F) are handled separately. No external libraries."
)
_NOTE = (
    "Universal tool (physics, engineering, every quantitative field): dimensional "
    "homogeneity is the cheapest correctness check there is — an equation that is "
    "not dimensionally consistent is wrong before any number is computed. The "
    "table covers the common SI/derived/imperial units; uncommon units are an "
    "easy additive extension."
)


# Registry the gateway imports.
UNITS_RUNNERS = {
    "unitdimcheck": run_units,
}
