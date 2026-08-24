#!/usr/bin/env python3
"""
research-tools, StoichBalance (REAL equation balancing + stoichiometry, CPU)
=============================================================================

Per-field tool for **chemistry** (20,531 profiled researchers). Reaction
informatics (`reaction-informatics` in research-atlas/docs/USERS_NEEDS.md) is a
named gap: reaction data is locked in vendor formats and there is no open,
scriptable handling of even basic reaction arithmetic. The first arithmetic
operation on any reaction is BALANCING it, then computing limiting reagent and
theoretical yield.

StoichBalance does both with REAL linear algebra, no lookup tables, no
heuristics:

 1. Balancing as a null-space problem
 ----------------------------------------------------------------------
 A chemical equation is balanced when, for every element, the total atoms on
 the left equal the total on the right. Building the element-by-species
 matrix A (rows = elements, columns = species, sign +1 for reactants, −1 for
 products, entries = subscript counts), the balanced coefficient vector x is
 any nonzero solution of A·x = 0, i.e. a basis vector of the null space of
 A. We compute the null space exactly over the rationals (integer Gaussian
 elimination + fraction arithmetic), then scale to the smallest positive
 integers via the LCM of denominators / GCD of numerators. This is the
 standard linear-algebra method (Risteski; any physical-chemistry text).

 2. Stoichiometry / limiting reagent
 ----------------------------------------------------------------------
 Given balanced coefficients + reactant amounts (moles, or grams with molar
 masses), the limiting reagent is the reactant minimizing amount/coeff; the
 theoretical product amounts follow from the mole ratios.

Parsing reuses a self-contained recursive-descent formula parser (subscripts,
nested parentheses, hydrates via "·"/".") and a built-in atomic-mass table.
Deterministic; never raises on malformed input, returns a structured
{"error": ...}.

The gateway imports STOICH_RUNNERS from here.
"""
from __future__ import annotations

import re
from fractions import Fraction
from math import gcd
from typing import Optional


# ---------------------------------------------------------------------------
# Atomic masses (g/mol, standard atomic weights, IUPAC). H..Bi + common.
# ---------------------------------------------------------------------------
_MASS: dict[str, float] = {
    "H": 1.008, "He": 4.0026, "Li": 6.94, "Be": 9.0122, "B": 10.81, "C": 12.011,
    "N": 14.007, "O": 15.999, "F": 18.998, "Ne": 20.180, "Na": 22.990,
    "Mg": 24.305, "Al": 26.982, "Si": 28.085, "P": 30.974, "S": 32.06,
    "Cl": 35.45, "Ar": 39.948, "K": 39.098, "Ca": 40.078, "Sc": 44.956,
    "Ti": 47.867, "V": 50.942, "Cr": 51.996, "Mn": 54.938, "Fe": 55.845,
    "Co": 58.933, "Ni": 58.693, "Cu": 63.546, "Zn": 65.38, "Ga": 69.723,
    "Ge": 72.630, "As": 74.922, "Se": 78.971, "Br": 79.904, "Kr": 83.798,
    "Rb": 85.468, "Sr": 87.62, "Y": 88.906, "Zr": 91.224, "Nb": 92.906,
    "Mo": 95.95, "Tc": 98.0, "Ru": 101.07, "Rh": 102.91, "Pd": 106.42,
    "Ag": 107.87, "Cd": 112.41, "In": 114.82, "Sn": 118.71, "Sb": 121.76,
    "Te": 127.60, "I": 126.90, "Xe": 131.29, "Cs": 132.91, "Ba": 137.33,
    "La": 138.91, "Ce": 140.12, "W": 183.84, "Pt": 195.08, "Au": 196.97,
    "Hg": 200.59, "Tl": 204.38, "Pb": 207.2, "Bi": 208.98,
}

_TOKEN = re.compile(r"([A-Z][a-z]?)|(\d+\.?\d*)|(\()|(\))|([·.])")


def parse_formula(formula: str) -> dict[str, float]:
    """Parse a chemical formula → {element: count}. Supports nested parentheses
 and hydrate dots ('·' or '.'). Raises ValueError on malformed input."""
    s = (formula or "").replace(" ", "")
    if not s:
        return {}
    tokens: list[str] = []
    i = 0
    while i < len(s):
        m = _TOKEN.match(s, i)
        if not m:
            raise ValueError(f"unexpected character '{s[i]}'")
        tokens.append(m.group(0))
        i = m.end()

    pos = 0

    def parse_group(stop_on_dot: bool) -> dict[str, float]:
        nonlocal pos
        counts: dict[str, float] = {}
        while pos < len(tokens):
            tok = tokens[pos]
            if tok == "(":
                pos += 1
                inner = parse_group(False)
                if pos >= len(tokens) or tokens[pos] != ")":
                    raise ValueError("unbalanced parentheses")
                pos += 1
                mult = 1.0
                if pos < len(tokens) and re.fullmatch(r"\d+\.?\d*", tokens[pos]):
                    mult = float(tokens[pos]); pos += 1
                for el, n in inner.items():
                    counts[el] = counts.get(el, 0.0) + n * mult
            elif tok == ")":
                break
            elif tok in ("·", "."):
                # hydrate separator: an optional leading multiplier then a sub-formula
                pos += 1
                hyd_mult = 1.0
                if pos < len(tokens) and re.fullmatch(r"\d+\.?\d*", tokens[pos]):
                    hyd_mult = float(tokens[pos]); pos += 1
                inner = parse_group(True)
                for el, n in inner.items():
                    counts[el] = counts.get(el, 0.0) + n * hyd_mult
            elif re.fullmatch(r"[A-Z][a-z]?", tok):
                el = tok
                pos += 1
                n = 1.0
                if pos < len(tokens) and re.fullmatch(r"\d+\.?\d*", tokens[pos]):
                    n = float(tokens[pos]); pos += 1
                counts[el] = counts.get(el, 0.0) + n
            else:
                raise ValueError(f"misplaced number '{tok}'")
        return counts

    result = parse_group(False)
    if pos != len(tokens):
        raise ValueError("unbalanced parentheses")
    return result


def _split_species(side: str) -> list[str]:
    return [p.strip() for p in side.split("+") if p.strip()]


def _parse_equation(eq: str) -> tuple[list[str], list[str]]:
    eq = eq.replace("⟶", "->").replace("→", "->").replace("=", "->").replace("➔", "->")
    parts = re.split(r"->", eq)
    if len(parts) != 2:
        raise ValueError("equation must have exactly one arrow (use '->' or '=')")
    left = _split_species(parts[0])
    right = _split_species(parts[1])
    if not left or not right:
        raise ValueError("both sides need at least one species")
    return left, right


# ---------------------------------------------------------------------------
# Exact rational null-space (one-dimensional) via fraction Gaussian elimination
# ---------------------------------------------------------------------------
def _nullspace_vector(A: list[list[Fraction]], ncols: int) -> Optional[list[Fraction]]:
    """Return ONE nonzero null-space vector of A (rows = equations), or None if
 the null space is trivial. Exact rational reduced row echelon form."""
    M = [row[:] for row in A]
    nrows = len(M)
    pivot_cols: list[int] = []
    r = 0
    for c in range(ncols):
        # find a pivot in column c at or below row r
        piv = None
        for rr in range(r, nrows):
            if M[rr][c] != 0:
                piv = rr
                break
        if piv is None:
            continue
        M[r], M[piv] = M[piv], M[r]
        pv = M[r][c]
        M[r] = [x / pv for x in M[r]]
        for rr in range(nrows):
            if rr != r and M[rr][c] != 0:
                factor = M[rr][c]
                M[rr] = [a - factor * b for a, b in zip(M[rr], M[r])]
        pivot_cols.append(c)
        r += 1
        if r == nrows:
            break
    free_cols = [c for c in range(ncols) if c not in pivot_cols]
    if not free_cols:
        return None  # trivial null space only
    # set the first free var = 1, solve the rest
    free = free_cols[0]
    x = [Fraction(0)] * ncols
    x[free] = Fraction(1)
    for idx, pc in enumerate(pivot_cols):
        # pivot row idx: x[pc] = -sum(coeff * x[freevar]) over free columns
        x[pc] = -M[idx][free]  # since only the chosen free var is 1
    return x


def _to_smallest_integers(x: list[Fraction]) -> list[int]:
    """Scale a rational vector to the smallest positive integer vector."""
    denoms = [f.denominator for f in x]
    lcm = 1
    for d in denoms:
        lcm = lcm * d // gcd(lcm, d)
    ints = [int(f * lcm) for f in x]
    # ensure all positive: flip sign if needed (basis vector may be negated)
    nonzero = [v for v in ints if v != 0]
    if nonzero and all(v <= 0 for v in nonzero):
        ints = [-v for v in ints]
    g = 0
    for v in ints:
        g = gcd(g, abs(v))
    if g > 1:
        ints = [v // g for v in ints]
    return ints


def balance_equation(eq: str) -> dict:
    left, right = _parse_equation(eq)
    species = left + right
    nL = len(left)
    parsed: list[dict[str, float]] = []
    elements: list[str] = []
    for sp in species:
        comp = parse_formula(sp)
        if not comp:
            return {"error": f"could not parse species '{sp}'"}
        parsed.append(comp)
        for el in comp:
            if el not in elements:
                elements.append(el)
    # element matrix: reactants +count, products -count
    A: list[list[Fraction]] = []
    for el in elements:
        row: list[Fraction] = []
        for k, comp in enumerate(parsed):
            cnt = comp.get(el, 0.0)
            sign = 1 if k < nL else -1
            row.append(Fraction(sign) * Fraction(cnt).limit_denominator(10**6))
        A.append(row)
    vec = _nullspace_vector(A, len(species))
    if vec is None:
        return {"error": "no nonzero balancing coefficients exist (equation may be unbalanceable as written)"}
    coeffs = _to_smallest_integers(vec)
    if any(c <= 0 for c in coeffs):
        return {"error": "no all-positive integer balancing found (check the equation)"}
    # verify the balance exactly
    for ei, el in enumerate(elements):
        lhs = sum(coeffs[k] * parsed[k].get(el, 0.0) for k in range(nL))
        rhs = sum(coeffs[k] * parsed[k].get(el, 0.0) for k in range(nL, len(species)))
        if abs(lhs - rhs) > 1e-6:
            return {"error": "internal: computed coefficients do not balance (please report)"}
    return {
        "reactants": left,
        "products": right,
        "n_reactants": nL,
        "species": species,
        "coefficients": coeffs,
        "elements": elements,
    }


def _format_balanced(left, right, coeffs, nL) -> str:
    def term(c: int, sp: str) -> str:
        return (f"{c} {sp}" if c != 1 else sp)
    lhs = " + ".join(term(coeffs[k], left[k]) for k in range(nL))
    rhs = " + ".join(term(coeffs[nL + k], right[k]) for k in range(len(right)))
    return f"{lhs} -> {rhs}"


def molar_mass(formula: str) -> Optional[float]:
    try:
        comp = parse_formula(formula)
    except ValueError:
        return None
    total = 0.0
    for el, n in comp.items():
        if el not in _MASS:
            return None
        total += n * _MASS[el]
    return round(total, 4) if comp else None


def run_stoich_balance(payload: dict) -> dict:
    """payload: {
 equation: str (e.g. "H2 + O2 -> H2O"), or "demo",
 amounts: {species_formula: moles} (optional → limiting reagent),
 amounts_g: {species_formula: grams} (optional, alt to amounts)
 }

 Balance a chemical equation by exact rational null-space of the element
 matrix, then (if amounts given) compute the limiting reagent + theoretical
 product yields. Deterministic; never raises on malformed input.
    """
    raw = payload.get("equation")
    demo = bool(payload.get("demo")) or (isinstance(raw, str) and raw.strip().lower() == "demo")
    eq = "H2 + O2 -> H2O" if demo else (raw if isinstance(raw, str) else "")
    if not isinstance(eq, str) or not eq.strip():
        return {"error": 'provide a chemical equation (e.g. "H2 + O2 -> H2O"), or "demo"'}
    if len(eq) > 1000:
        return {"error": "equation too long (max 1000 chars)"}

    try:
        bal = balance_equation(eq)
    except ValueError as e:
        return {"error": f"could not parse equation: {e}"}
    if "error" in bal:
        return bal

    left, right = bal["reactants"], bal["products"]
    coeffs, nL = bal["coefficients"], bal["n_reactants"]
    species = bal["species"]
    masses = {sp: molar_mass(sp) for sp in species}

    out = {
        "demo": demo,
        "input_equation": eq.strip(),
        "balanced_equation": _format_balanced(left, right, coeffs, nL),
        "reactants": left,
        "products": right,
        "coefficients": coeffs,
        "elements": bal["elements"],
        "molar_masses_g_per_mol": {sp: masses[sp] for sp in species if masses[sp] is not None},
        "method": (
            "Balanced by computing a basis of the null space of the element "
            "matrix A (rows = elements, columns = species, +count for reactants, "
            "−count for products) over the rationals via exact fraction Gaussian "
            "elimination, then scaled to the smallest positive integers (LCM of "
            "denominators / GCD of numerators). The balance is then re-verified "
            "element-by-element. No lookup tables, no heuristics."
        ),
        "note": (
            "Field tool for chemistry: reaction informatics is a named atlas gap. "
            "Balancing is exact linear algebra; the limiting-reagent calculation "
            "(when amounts are supplied) follows the balanced mole ratios. "
            "Redox half-reaction balancing in acidic/basic media is a follow-up."
        ),
    }

    # optional stoichiometry / limiting reagent
    amounts = payload.get("amounts")
    amounts_g = payload.get("amounts_g")
    moles: dict[str, float] = {}
    if isinstance(amounts, dict) and amounts:
        for sp, v in amounts.items():
            try:
                moles[sp.strip()] = float(v)
            except Exception:
                continue
    elif isinstance(amounts_g, dict) and amounts_g:
        for sp, g in amounts_g.items():
            mm = masses.get(sp.strip()) or molar_mass(sp.strip())
            try:
                gg = float(g)
            except Exception:
                continue
            if mm and mm > 0:
                moles[sp.strip()] = gg / mm
    if moles:
        coeff_of = {sp: coeffs[i] for i, sp in enumerate(species)}
        # extent of reaction limited by each supplied reactant: moles/coeff
        reactant_extents = {}
        for sp in left:
            if sp in moles and coeff_of.get(sp):
                reactant_extents[sp] = moles[sp] / coeff_of[sp]
        if reactant_extents:
            limiting = min(reactant_extents, key=reactant_extents.get)
            extent = reactant_extents[limiting]
            products_formed = {
                sp: round(extent * coeff_of[sp], 6) for sp in right if coeff_of.get(sp)
            }
            leftover = {
                sp: round(moles[sp] - extent * coeff_of[sp], 6)
                for sp in left if sp in moles and coeff_of.get(sp)
            }
            out["stoichiometry"] = {
                "supplied_moles": {k: round(v, 6) for k, v in moles.items()},
                "limiting_reagent": limiting,
                "extent_of_reaction": round(extent, 6),
                "product_moles": products_formed,
                "reactant_moles_remaining": leftover,
            }

    if demo:
        # H2 + O2 -> H2O balances to 2 H2 + 1 O2 -> 2 H2O.
        out["ground_truth"] = {
            "balanced": "2 H2 + O2 -> 2 H2O",
            "coefficients": [2, 1, 2],
        }
        out["note"] = "DEMO: H2 + O2 -> H2O balances to 2 H2 + O2 -> 2 H2O. " + out["note"]
    return out


# Registry the gateway imports.
STOICH_RUNNERS = {
    "stoichbalance": run_stoich_balance,
}
