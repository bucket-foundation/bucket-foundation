import glob, json, math, os, sys
from math import log, log2, log10, sqrt, exp, pi, sin, cos, radians, degrees, asin, comb, factorial

def bent(p):
    return -p * log2(p) - (1 - p) * log2(1 - p)

E = {
"set-function": 2**3, "limit": 2 + 2, "group": 8, "derivative": 20 - 2 * 5 * 1, "integral": 4 * 5**2 / 2,
"vector-space": 5, "linear-map": 2 * 3 * 1, "inner-product": sqrt(1 + 4 + 4), "eigenvalue": 1.05**10,
"taylor": 1 + 0.1 + 0.1**2 / 2, "metric-space": sqrt(9 + 16), "spectral-theorem": 2 + 1, "stokes-theorem": 2**3 - 0**3,
"logic-proof": 8, "quantifiers-induction": sum(range(1, 101)), "set-theory-axioms": 16, "number-systems": 3 / 8,
"modular-arithmetic": (9 + 50) % 12, "polynomials-roots": 20 / 5, "combinatorics": comb(49, 6), "probability": 0.5 * 0.5,
"random-variables": 100 * 0.01, "ring-field": next(x for x in range(1, 7) if 3 * x % 7 == 1), "homomorphism": 3,
"complex-numbers": abs(3 + 4j), "sequences-series": 1 / (1 - 0.5), "multivariable-calculus": 2 * 1 * 2,
"ode": 100 * exp(0.5 * 4), "fourier": 1000 / 440, "topology": 1, "determinant": 3 * 2, "real-analysis": 0,
"fundamental-theorem-algebra": (1j * -1j).real, "central-limit-theorem": 1.71 / sqrt(100), "computability": 3 * 2,
"godel-incompleteness@01-mathematics": 3, "category-theory": 2 * 3, "trigonometry": 10 * sin(radians(60)),
"exponential-logarithm": log(2) / 0.05, "mean-value-theorems": 120 / 1.5, "optimization": (40 / 4)**2,
"change-of-variables": pi * 0.2**2, "orthogonality-least-squares": (10 + 12 + 14 + 16) / 4, "svd": 5 * 2,
"graph-theory": 4 * 3 / 2, "recurrence-generating": 55, "complex-analysis": 0, "measure-theory": 0, "manifolds": 2,
"bayes-theorem": 0.5 * 0.2 / (0.5 * 0.2 + 0.05 * 0.8), "prime-numbers": len([d for d in range(1, 61) if 60 % d == 0]),
"markov-chains": 0.4 / (0.1 + 0.4), "lagrange-multipliers": 5 * 5, "banach-fixed-point": cos(1), "galois-theory": factorial(5),

"kinematics": 0.5 * 3 * 8**2, "vectors": 50 * 20 * cos(radians(60)), "calculus-physics": 8 * 3, "newton-laws": 1200 * 20 / 4,
"momentum": 1000 * 20 / (1000 + 1500), "work-energy": 0.5 * 0.145 * 40**2, "energy-conservation": sqrt(2 * 9.8 * 45),
"rotational": 200 * 0.3, "gravitation": 6.674e-11 * 5.97e24 * 70 / 6.37e6**2, "lagrangian": 0.5 * 2 * 3**2 - 5,
"least-action": -10 * 3, "hamiltonian": 6 / 2, "shm": sqrt(40000 / 400), "waves": 343 / 440,
"coulomb": 8.99e9 * 1e-6 * 1e-6 / 0.1**2, "gauss-law": 8.85e-12 / 8.85e-12, "magnetism-lorentz": 1.6e-19 * 1e6 * 0.5,
"faraday": 0.6 / 0.2, "ampere-maxwell": 2, "maxwell-equations": 1 / sqrt(1.257e-6 * 8.854e-12), "em-waves": 3e8 / 2.4e9,
"thermo-temperature": 6.02e23 * 1.381e-23 * 273 / 0.0224, "first-law-thermo": 500 - 200,
"entropy-second-law": 1000 / 300 - 1000 / 400, "boltzmann-entropy": 10, "boltzmann-distribution": exp(-1),
"geometric-optics": degrees(asin(sin(radians(45)) / 1.33)), "wave-optics": degrees(asin(650e-9 / 0.1e-3)),
"special-relativity": 2.2 / sqrt(1 - 0.64), "spacetime": sqrt(4**2 - 3**2), "mass-energy": 0.001 * (3e8)**2,
"equivalence-principle@02-physics": 60 * (9.8 + 2), "geodesics-curvature": 2 * pi * 6371 / 4,
"einstein-equation": 8 * pi * 6.674e-11 / (3e8)**4, "photoelectric-quantization": 6.626e-34 * 1.5e15 / 1.602e-19 - 4.0,
"matter-waves": 6.626e-34 / 5.3e-24, "wavefunction": 1 / 4, "schrodinger": 2 * 3**2, "operators-observables": 0.6 * 2 + 0.4 * 5,
"uncertainty": (6.626e-34 / (2 * pi)) / (2 * 1e-10), "quantum-tunneling": exp(2), "quantum-spin": 0.5 * 1.5,
"hydrogen-atom": 13.6 / 4 - 13.6 / 9, "quantum-entanglement": 1000, "qft-idea": 6.626e-34 * 3e8 / 500e-9 / 1.602e-19,
"standard-model": 2 / 3 + 2 / 3 - 1 / 3, "cosmology-glimpse": 70 * 100, "forces-friction": 0.4 * 30 * 9.8,
"fluids-bernoulli": 0.5 * 1000 * (4**2 - 2**2), "heat-engines-carnot": 1 - 300 / 800, "electric-potential": 0.5 * 100e-6 * 300**2,
"circuits-ohm": 12 / 3, "blackbody-planck": 2.898e-3 / 5800 * 1e9, "bohr-model": 1240 / 10.2, "quantum-harmonic-oscillator": 0.266 / 2,

"atom-nucleus-electrons": 6 + 8, "quantum-numbers": 2 * 4**2, "electron-configuration": 18 + 2 + 6, "periodic-table": 19 - 18,
"periodic-trends": 496 * 2.0, "effective-nuclear-charge": 11 - (2 * 1.00 + 8 * 0.85), "ionic-bond": 117 / 58.44,
"covalent-bond": 436 * 3.0, "electronegativity-polarity": 3.44 - 2.20, "lewis-structures": 4 + 4, "vsepr": 109.5 - 104.5,
"hybridization": 4, "mo-theory": (10 - 6) / 2, "metallic-bond": 2.0 * 60, "mole-concept": 36 / 18.0 * 6.022e23,
"stoichiometry": 4 * 16 / 2, "ideal-gas-law": 0.50 * 0.08206 * 300 / 2.0, "kinetic-molecular-theory": sqrt(32 / 4),
"intermolecular-forces": 100 + 162, "states-of-matter": 0.006 * 101325, "solutions-concentration": 0.154 * 0.50 * 58.44,
"enthalpy": 890.3 * 2.0, "entropy": 8.314 * log(2), "gibbs-free-energy": 30 / 0.100, "chemical-equilibrium": 0.80 / 0.20,
"le-chatelier": 4, "acids-bases": 0.10 * 0.050, "ph-scale": -log10(5.0e-3), "buffers": 4.7 + log10(10), "reaction-rate": 3,
"arrhenius-activation": 6000 * 8.314 / 1000, "catalysis": exp(10000 / (8.314 * 298)), "redox": 2,
"electrochemical-cells": -2 * 96485 * 1.10 / 1000, "nernst-equation": 0.0592 / 2 * log10(100), "schrodinger-atom": -13.6 / 4,
"functional-groups": 2 * 12.01 + 6 * 1.008 + 16.00, "isomerism": 2**3, "organic-reaction-types": 4,
"thermodynamics-vs-kinetics": exp(10000 / (8.314 * 298)), "computational-chemistry": 75, "coordination-complexes": 12,
"chemical-bond-energetics": 436 + 242 - 2 * 431, "acid-base-titration": 0.100 * 30.0 / 25.0, "oxidation-states": -1 + 8,
"phase-equilibria-clausius": exp(-40700 / 8.314 * (1 / 363 - 1 / 373)), "reaction-mechanisms": 4,
"equilibrium-thermo-link": exp(11400 / (8.314 * 298)), "colligative-properties": 2 * 1.86 * 2.0, "hess-law": -393.5 + 283.0,
"rate-laws-order": log(2) / 0.10, "transition-state-theory": 1.380649e-23 * 298 / 6.62607e-34, "solubility-product": sqrt(1.8e-10),
"beer-lambert-law": 0.60 / 15000, "crystal-field-theory": 4,

"bit": log2(64), "probability-basics": 10 / 6, "shannon-entropy": bent(0.25), "kraft-source-coding": 1.75 * 8000,
"mutual-information": 1.0 - 0.3, "channel-capacity": 1 - bent(0.11), "error-correcting-codes": 2 * 5 + 1,
"kolmogorov-complexity": 2**10, "set-function-relation": 4**3, "dfa-nfa": 2**4, "regular-languages": 5 + 3, "context-free": 5,
"chomsky-hierarchy": 4, "turing-machine": 4, "church-turing": 4, "decidability": 30**2, "halting-problem": 15, "big-o": 10**2,
"divide-and-conquer": log2(1024), "dynamic-programming": 51, "graph-algorithms": 3, "hashing-data-structures": 23 % 16,
"complexity-p": 1e10 / 1e9, "complexity-np": 2**40, "reductions": 5 - 2, "np-completeness": 21, "space-complexity": 30 * 4,
"propositional-logic": 32, "predicate-logic": 8, "proof-systems": 7, "godel-incompleteness@04-information": 5,
"one-way-functions": 2048, "public-key-crypto": 2 * 10, "pseudorandomness": bin(0x61 ^ 0xFF).count("1"),
"pac-learning": math.ceil((log(1000) + log(1 / 0.05)) / 0.1), "vc-dimension": 8,
"entropy-statistical-mechanics-link": 1.380649e-23 * 300 * log(2), "neural-network-learning": 100 * 50 + 50,
"randomized-algorithms": 0.25**10, "kl-divergence": 0.5 * log2(2) + 0.5 * log2(2 / 3),
"conditional-probability-bayes": 100 / 10099, "regular-expressions": 8, "greedy-algorithms": 2 + 1 + 1 + 3,
"amortized-analysis": 2**10 - 1, "time-hierarchy": 100**2, "rate-distortion": 0.5 * log2(4), "approximation-algorithms": 12,
"typical-sequences-aep": 100 * bent(0.9), "perfect-secrecy": 1e6, "huffman-coding": 0.4 + 0.6 + 0.6 + 0.3,
"lambda-calculus": 1 + 2 + 2 + 2, "fast-fourier-transform": 1024 / 10, "master-theorem": math.ceil(log2(1e6)), "rices-theorem": 3,
"data-processing-inequality": 0.15, "differential-entropy": log(2), "lempel-ziv": 6, "diffie-hellman": pow(pow(5, 15, 23), 6, 23),
"cryptographic-hash": 128, "boolean-circuits": 63,
}

LEGACY = {"00-learning-to-learn", "06-cosmology"}
QDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "learning", "app", "corpus", "questions")


def deck_paths(argv):
    if argv:
        return argv
    return [p for p in sorted(glob.glob(os.path.join(QDIR, "*.json"))) if os.path.basename(p)[:-5] not in LEGACY]


def check(paths):
    bad = []
    for path in paths:
        deck = json.load(open(path))
        for q in deck["questions"]:
            if q["kind"] != "calculate":
                continue
            a = q["atom"]
            key = f"{a}@{deck['branch']}" if f"{a}@{deck['branch']}" in E else a
            if key not in E:
                bad.append((deck["branch"], q["id"], "no independent value"))
                continue
            want, got = E[key], q["answer"]
            tol = q.get("tol", 0) + abs(want) * q.get("relTol", 0)
            if abs(want - got) > max(tol, 1e-12):
                bad.append((deck["branch"], q["id"], got, want))
    return bad


if __name__ == "__main__":
    paths = deck_paths(sys.argv[1:])
    bad = check(paths)
    for b in bad:
        print(b)
    print(f"check_keys: {len(paths)} decks, {len(bad)} flagged")
    sys.exit(1 if bad else 0)
