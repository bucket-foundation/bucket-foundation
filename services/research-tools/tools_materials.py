#!/usr/bin/env python3
from __future__ import annotations

import re
from typing import Any, Optional

_ELEMENTS: dict[str, tuple] = {
    "H": (1, 1.008, 2.20, 25, 14.01, 1, 1, 1),
    "He": (2, 4.0026, None, 31, 0.95, 1, 18, 2),
    "Li": (3, 6.94, 0.98, 145, 453.65, 2, 1, 1),
    "Be": (4, 9.0122, 1.57, 105, 1560.0, 2, 2, 2),
    "B": (5, 10.81, 2.04, 85, 2349.0, 2, 13, 3),
    "C": (6, 12.011, 2.55, 70, 3823.0, 2, 14, 4),
    "N": (7, 14.007, 3.04, 65, 63.15, 2, 15, 5),
    "O": (8, 15.999, 3.44, 60, 54.36, 2, 16, 6),
    "F": (9, 18.998, 3.98, 50, 53.53, 2, 17, 7),
    "Ne": (10, 20.180, None, 38, 24.56, 2, 18, 8),
    "Na": (11, 22.990, 0.93, 180, 370.95, 3, 1, 1),
    "Mg": (12, 24.305, 1.31, 150, 923.0, 3, 2, 2),
    "Al": (13, 26.982, 1.61, 125, 933.47, 3, 13, 3),
    "Si": (14, 28.085, 1.90, 110, 1687.0, 3, 14, 4),
    "P": (15, 30.974, 2.19, 100, 317.30, 3, 15, 5),
    "S": (16, 32.06, 2.58, 100, 388.36, 3, 16, 6),
    "Cl": (17, 35.45, 3.16, 100, 171.6, 3, 17, 7),
    "Ar": (18, 39.948, None, 71, 83.80, 3, 18, 8),
    "K": (19, 39.098, 0.82, 220, 336.53, 4, 1, 1),
    "Ca": (20, 40.078, 1.00, 180, 1115.0, 4, 2, 2),
    "Sc": (21, 44.956, 1.36, 160, 1814.0, 4, 3, 3),
    "Ti": (22, 47.867, 1.54, 140, 1941.0, 4, 4, 4),
    "V": (23, 50.942, 1.63, 135, 2183.0, 4, 5, 5),
    "Cr": (24, 51.996, 1.66, 140, 2180.0, 4, 6, 6),
    "Mn": (25, 54.938, 1.55, 140, 1519.0, 4, 7, 7),
    "Fe": (26, 55.845, 1.83, 140, 1811.0, 4, 8, 8),
    "Co": (27, 58.933, 1.88, 135, 1768.0, 4, 9, 9),
    "Ni": (28, 58.693, 1.91, 135, 1728.0, 4, 10, 10),
    "Cu": (29, 63.546, 1.90, 135, 1357.77, 4, 11, 11),
    "Zn": (30, 65.38, 1.65, 135, 692.68, 4, 12, 12),
    "Ga": (31, 69.723, 1.81, 130, 302.91, 4, 13, 3),
    "Ge": (32, 72.630, 2.01, 125, 1211.4, 4, 14, 4),
    "As": (33, 74.922, 2.18, 115, 1090.0, 4, 15, 5),
    "Se": (34, 78.971, 2.55, 115, 494.0, 4, 16, 6),
    "Br": (35, 79.904, 2.96, 115, 265.8, 4, 17, 7),
    "Kr": (36, 83.798, 3.00, 88, 115.79, 4, 18, 8),
    "Rb": (37, 85.468, 0.82, 235, 312.46, 5, 1, 1),
    "Sr": (38, 87.62, 0.95, 200, 1050.0, 5, 2, 2),
    "Y": (39, 88.906, 1.22, 180, 1799.0, 5, 3, 3),
    "Zr": (40, 91.224, 1.33, 155, 2128.0, 5, 4, 4),
    "Nb": (41, 92.906, 1.60, 145, 2750.0, 5, 5, 5),
    "Mo": (42, 95.95, 2.16, 145, 2896.0, 5, 6, 6),
    "Tc": (43, 98.0, 1.90, 135, 2430.0, 5, 7, 7),
    "Ru": (44, 101.07, 2.20, 130, 2607.0, 5, 8, 8),
    "Rh": (45, 102.91, 2.28, 135, 2237.0, 5, 9, 9),
    "Pd": (46, 106.42, 2.20, 140, 1828.05, 5, 10, 10),
    "Ag": (47, 107.87, 1.93, 160, 1234.93, 5, 11, 11),
    "Cd": (48, 112.41, 1.69, 155, 594.22, 5, 12, 12),
    "In": (49, 114.82, 1.78, 155, 429.75, 5, 13, 3),
    "Sn": (50, 118.71, 1.96, 145, 505.08, 5, 14, 4),
    "Sb": (51, 121.76, 2.05, 145, 903.78, 5, 15, 5),
    "Te": (52, 127.60, 2.10, 140, 722.66, 5, 16, 6),
    "I": (53, 126.90, 2.66, 140, 386.85, 5, 17, 7),
    "Xe": (54, 131.29, 2.60, 108, 161.40, 5, 18, 8),
    "Cs": (55, 132.91, 0.79, 260, 301.59, 6, 1, 1),
    "Ba": (56, 137.33, 0.89, 215, 1000.0, 6, 2, 2),
    "La": (57, 138.91, 1.10, 195, 1193.0, 6, 3, 3),
    "Ce": (58, 140.12, 1.12, 185, 1068.0, 6, 3, 4),
    "Pr": (59, 140.91, 1.13, 185, 1208.0, 6, 3, 5),
    "Nd": (60, 144.24, 1.14, 185, 1297.0, 6, 3, 6),
    "Sm": (62, 150.36, 1.17, 185, 1345.0, 6, 3, 8),
    "Eu": (63, 151.96, 1.20, 185, 1099.0, 6, 3, 9),
    "Gd": (64, 157.25, 1.20, 180, 1585.0, 6, 3, 10),
    "Tb": (65, 158.93, 1.10, 175, 1629.0, 6, 3, 11),
    "Dy": (66, 162.50, 1.22, 175, 1680.0, 6, 3, 12),
    "Ho": (67, 164.93, 1.23, 175, 1734.0, 6, 3, 13),
    "Er": (68, 167.26, 1.24, 175, 1802.0, 6, 3, 14),
    "Yb": (70, 173.05, 1.10, 175, 1097.0, 6, 3, 16),
    "Lu": (71, 174.97, 1.27, 175, 1925.0, 6, 3, 3),
    "Hf": (72, 178.49, 1.30, 155, 2506.0, 6, 4, 4),
    "Ta": (73, 180.95, 1.50, 145, 3290.0, 6, 5, 5),
    "W": (74, 183.84, 2.36, 135, 3695.0, 6, 6, 6),
    "Re": (75, 186.21, 1.90, 135, 3459.0, 6, 7, 7),
    "Os": (76, 190.23, 2.20, 130, 3306.0, 6, 8, 8),
    "Ir": (77, 192.22, 2.20, 135, 2719.0, 6, 9, 9),
    "Pt": (78, 195.08, 2.28, 135, 2041.4, 6, 10, 10),
    "Au": (79, 196.97, 2.54, 135, 1337.33, 6, 11, 11),
    "Hg": (80, 200.59, 2.00, 150, 234.32, 6, 12, 12),
    "Tl": (81, 204.38, 1.62, 190, 577.0, 6, 13, 3),
    "Pb": (82, 207.2, 2.33, 180, 600.61, 6, 14, 4),
    "Bi": (83, 208.98, 2.02, 160, 544.7, 6, 15, 5),
}

_PROP_IDX = {
    "atomic_weight": 1,
    "electronegativity": 2,
    "atomic_radius": 3,
    "melting_point": 4,
    "period": 5,
    "group": 6,
    "n_valence": 7,
    "atomic_number": 0,
}

_TOKEN = re.compile(r"([A-Z][a-z]?)|(\d+\.?\d*)|(\()|(\))")

def parse_formula(formula: str) -> dict[str, float]:
    s = (formula or "").replace(" ", "")
    if not s:
        return {}
    tokens = []
    i = 0
    while i < len(s):
        m = _TOKEN.match(s, i)
        if not m:
            raise ValueError(f"unexpected character '{s[i]}' in formula")
        tokens.append(m.group(0))
        i = m.end()

    pos = 0

    def parse_group() -> dict[str, float]:
        nonlocal pos
        counts: dict[str, float] = {}
        while pos < len(tokens):
            tok = tokens[pos]
            if tok == "(":
                pos += 1
                inner = parse_group()
                if pos >= len(tokens) or tokens[pos] != ")":
                    raise ValueError("unbalanced parentheses")
                pos += 1
                mult = 1.0
                if pos < len(tokens) and re.fullmatch(r"\d+\.?\d*", tokens[pos]):
                    mult = float(tokens[pos])
                    pos += 1
                for el, n in inner.items():
                    counts[el] = counts.get(el, 0.0) + n * mult
            elif tok == ")":
                break
            elif re.fullmatch(r"[A-Z][a-z]?", tok):
                el = tok
                pos += 1
                n = 1.0
                if pos < len(tokens) and re.fullmatch(r"\d+\.?\d*", tokens[pos]):
                    n = float(tokens[pos])
                    pos += 1
                counts[el] = counts.get(el, 0.0) + n
            else:
                raise ValueError(f"misplaced number '{tok}' in formula")
        return counts

    result = parse_group()
    if pos != len(tokens):
        raise ValueError("unbalanced parentheses")
    return result

def _stats_for_property(prop: str, fractions: dict[str, float]) -> Optional[dict]:
    vals: list[tuple[float, float]] = []
    idx = _PROP_IDX[prop]
    for el, frac in fractions.items():
        rec = _ELEMENTS.get(el)
        if rec is None:
            continue
        v = rec[idx]
        if v is None:
            continue
        vals.append((frac, float(v)))
    if not vals:
        return None
    fsum = sum(f for f, _ in vals)
    if fsum <= 0:
        return None
    mean = sum((f / fsum) * v for f, v in vals)
    raw_vals = [v for _, v in vals]
    vmin, vmax = min(raw_vals), max(raw_vals)
    rng = vmax - vmin
    avg_dev = sum((f / fsum) * abs(v - mean) for f, v in vals)
    mode_el = max(fractions.items(), key=lambda kv: kv[1])[0]
    mode_rec = _ELEMENTS.get(mode_el)
    mode_val = float(mode_rec[idx]) if (mode_rec and mode_rec[idx] is not None) else None
    return {
        "mean": round(mean, 5),
        "min": round(vmin, 5),
        "max": round(vmax, 5),
        "range": round(rng, 5),
        "avg_deviation": round(avg_dev, 5),
        "mode": (round(mode_val, 5) if mode_val is not None else None),
    }

def featurize(formula: str) -> dict:
    counts = parse_formula(formula)
    if not counts:
        return {"error": "empty formula"}
    unknown = [el for el in counts if el not in _ELEMENTS]
    if unknown:
        return {"error": f"unknown element(s): {', '.join(sorted(unknown))} (table covers H–Bi + common lanthanides)"}
    total = sum(counts.values())
    if total <= 0:
        return {"error": "formula amounts sum to zero"}
    fractions = {el: n / total for el, n in counts.items()}

    properties = [
        "atomic_number", "atomic_weight", "electronegativity", "atomic_radius",
        "melting_point", "period", "group", "n_valence",
    ]
    descriptors: dict[str, dict] = {}
    for p in properties:
        st = _stats_for_property(p, fractions)
        if st is not None:
            descriptors[p] = st

    molar_mass = sum(n * _ELEMENTS[el][1] for el, n in counts.items())
    n_elements = len(counts)

    feature_vector: dict[str, float] = {}
    for p, st in descriptors.items():
        for stat in ("mean", "range", "avg_deviation"):
            if st.get(stat) is not None:
                feature_vector[f"{p}_{stat}"] = st[stat]

    return {
        "formula": formula,
        "composition": {el: round(n, 6) for el, n in counts.items()},
        "atomic_fractions": {el: round(f, 6) for el, f in fractions.items()},
        "n_elements": n_elements,
        "molar_mass_g_per_mol": round(molar_mass, 4),
        "descriptors": descriptors,
        "feature_vector": {k: round(v, 5) for k, v in feature_vector.items()},
        "n_features": len(feature_vector),
    }

def run_materials_featurizer(payload: dict) -> dict:
    raw = payload.get("formula")
    demo = bool(payload.get("demo")) or (isinstance(raw, str) and raw.strip().lower() == "demo")
    if demo:
        formula = "NaCl"
    elif isinstance(raw, str):
        formula = raw.strip()
        if not formula:
            return {"error": 'provide a chemical formula (e.g. "Fe2O3"), or "demo"'}
        if len(formula) > 200:
            return {"error": "formula too long (max 200 chars)"}
    else:
        return {"error": 'provide a chemical formula (e.g. "Fe2O3"), or "demo"'}

    try:
        result = featurize(formula)
    except ValueError as e:
        return {"error": f"could not parse formula: {e}"}
    if "error" in result:
        return result

    result["demo"] = demo
    result["method"] = (
        "Composition parsed to atomic fractions; for each tabulated elemental "
        "property (atomic weight, Pauling electronegativity, atomic radius, "
        "melting point, period, group, valence-electron count) the composition-"
        "weighted mean, range (max−min), average deviation, and mode-element value "
        "are computed, the Magpie/ElementProperty descriptor family (Ward et al. "
        "2016) used as ML features for inorganic-material property prediction. "
        "Built-in element table; no network, no GPU."
    )
    result["note"] = (
        "Field tool for materials: 'ML in materials science' is already a top "
        "recurring research topic, but featurization pipelines are hand-rolled per "
        "group. These are composition-only (Magpie) descriptors, structural "
        "descriptors (coordination, Voronoi, site features) need a crystal "
        "structure and are a documented follow-up."
    )
    if demo:
        result["ground_truth"] = {
            "formula": "NaCl",
            "mean_electronegativity": 2.045,
            "molar_mass_g_per_mol": round(22.990 + 35.45, 4),
            "n_elements": 2,
        }
        result["note"] = (
            "DEMO: NaCl (rock salt). 50/50 Na+Cl → mean Pauling EN = "
            "(0.93 + 3.16)/2 = 2.045; molar mass ≈ 58.44 g/mol. " + result["note"]
        )
    return result

MATERIALS_RUNNERS = {
    "materialsfeaturizer": run_materials_featurizer,
}
