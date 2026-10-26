import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
QDIR = os.path.join(ROOT, "learning", "app", "corpus", "questions")

DIM = {
    "": "none", "x": "none", "%": "none", "1e-5": "none", "ppm": "none", "e-folds": "none", "k_B": "entropy-kB", "k_BT": "energy-kT",
    "bits": "information", "nats": "information", "bytes": "information",
    "m": "length", "km": "length", "cm": "length", "mm": "length", "nm": "length", "angstrom": "length", "pc": "length", "Mpc": "length", "million ly": "length", "bp": "length-bp",
    "m^2": "area", "angstrom^2": "area", "m^3/s": "volume-rate",
    "s": "time", "seconds": "time", "ms": "time", "microseconds": "time", "ns": "time", "fs": "time", "h": "time", "days": "time", "years": "time", "Gyr": "time",
    "1/s": "rate", "per second": "rate", "GHz": "rate", "rad/s": "rate",
    "m/s": "speed", "km/s": "speed", "km/h": "speed", "nm/s": "speed",
    "m^2/s": "diffusivity", "kg/m^3": "density", "kg m/s": "momentum",
    "J": "energy", "kJ": "energy", "eV": "energy", "J s": "action", "hbar^2": "action-squared",
    "kJ/mol": "molar-energy", "kcal/mol": "molar-energy",
    "J/K": "entropy", "K": "temperature", "degrees C": "temperature", "µK": "temperature", "uK": "temperature",
    "N": "force", "pN": "force", "N m": "torque", "N/m": "stiffness", "m/N": "compliance", "Pa": "pressure", "atm": "pressure",
    "V": "voltage", "mV": "voltage", "µV": "voltage", "A": "current", "C": "charge", "e": "charge",
    "F/m^2": "capacitance-area", "N m^2/C": "electric-flux", "s^2/(kg m)": "inverse-force-length", "m^2/(V s)": "mobility",
    "mol": "amount", "M": "concentration", "mM": "concentration", "micromolar/s": "concentration-rate", "fmol/s": "amount-rate",
    "g": "mass", "g/mol": "molar-mass", "kg/mol": "molar-mass", "m/z": "mass-charge",
    "million": "scale", "degrees": "angle", "o'clock": "clock", "dollars": "money", "points": "score",
    "spikes/s": "count-rate", "chars/s": "count-rate", "protons/s": "count-rate", "charges/s": "count-rate",
}
COUNT = {
    "electrons", "steps", "rows", "ions", "particles", "students", "switches", "groups", "orbitals", "molecules", "questions",
    "states", "levels", "values", "hops", "clauses", "lines", "samples", "coins", "copies", "vertices", "gates", "dimensions",
    "units", "equations", "entries", "baryons", "cells", "vesicles", "EPSPs", "patterns", "modes", "domains", "beads",
}
WORD_UNITS = {
    "seconds": "s", "milliseconds": "ms", "degrees": "degrees", "percent": "%", "bits": "bits", "nats": "nats", "bytes": "bytes",
    "days": "days", "years": "years", "dollars": "dollars", "points": "points", "percentage points": "points",
    "newtons": "N", "joules": "J", "microkelvin": "µK", "microvolts": "µV", "square angstroms": "angstrom^2", "radians": "",
    "millions": "million", "per s": "1/s", "bits per use": "bits", "units of k_B": "k_B", "units of e": "e",
    "units of hbar^2": "hbar^2", "units of 1e-5": "1e-5", "characters per second": "chars/s", "degrees C": "degrees C",
}
ASKED = re.compile(r"\bin\s+([\w^/µ%' -]{1,24}?)\s*\?\s*$")
HOW_MANY = re.compile(r"\bhow many\s+((?:percentage\s+)?[\w^]+)", re.I)
NAMED = {
    "points": "points", "days": "days", "years": "years", "degrees": "degrees", "coulombs": "C", "moles": "mol",
    "bits": "bits", "bytes": "bytes", "seconds": "seconds", "hours": "h", "k_bt": "k_BT", "percentage": "points",
}


def norm(u):
    u = u.strip()
    return WORD_UNITS.get(u, u)


def check(paths):
    hits = []
    for path in paths:
        deck = json.load(open(path, encoding="utf8"))
        for q in deck["questions"]:
            if q["kind"] != "calculate":
                continue
            unit = q.get("unit", "")
            where = (os.path.basename(path), q["id"], unit)
            if unit not in DIM and unit not in COUNT:
                hits.append(where + ("unit not on the allowlist",))
                continue
            prompt = q["prompt"]
            m = ASKED.search(prompt)
            asked = norm(m.group(1)) if m else None
            if asked is not None and asked not in DIM and asked not in COUNT:
                if re.fullmatch(r"(?:thousands|millions|billions|trillions)", asked):
                    hits.append(where + (f"prompt asks for {asked} with no unit",))
                asked = None
            if asked in DIM or asked in COUNT:
                if norm(unit) != asked and DIM.get(norm(unit), "count") != DIM.get(asked, "count"):
                    hits.append(where + (f"prompt asks for {asked}",))
                continue
            hm = HOW_MANY.search(prompt)
            if hm and re.search(r"\bper (?:second|s)\b", prompt[hm.start():]) and DIM.get(unit) not in ("count-rate", "rate"):
                hits.append(where + ("a count per second needs a rate unit",))
                continue
            if hm and not re.search(r"\bper\b|/", prompt + unit):
                named = NAMED.get(hm.group(1).split()[0].lower())
                if named is not None and named == unit:
                    continue
                if unit not in COUNT and DIM.get(unit) != "none":
                    hits.append(where + ("a count carries a physical unit",))
    return hits


if __name__ == "__main__":
    paths = sys.argv[1:] or sorted(glob.glob(os.path.join(QDIR, "*.json")))
    hits = check(paths)
    for h in hits:
        print(*h, sep="  ")
    print(f"check_units: {len(paths)} decks, {len(hits)} hits")
    sys.exit(1 if hits else 0)
