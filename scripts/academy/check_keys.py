import glob, json, math, os, sys
from math import e, log, log2, log10, sqrt, exp, pi, sin, cos, radians, degrees, asin, comb, factorial

def bent(p):
    return -p * log2(p) - (1 - p) * log2(1 - p)

E = {
"set-function": 2**3, "limit": 2 + 2, "group": 8, "derivative": 20 - 2 * 5 * 1, "integral": 4 * 5**2 / 2,
"vector-space": 5, "linear-map": 2 * 3 * 1, "inner-product": sqrt(1 + 4 + 4), "eigenvalue": 1.05**10,
"taylor": 1 + 0.1 + 0.1**2 / 2, "metric-space": sqrt(9 + 16), "spectral-theorem": 2 + 1, "stokes-theorem": 2**3 - 0**3,
"logic-proof": 8, "quantifiers-induction": sum(range(1, 101)), "set-theory-axioms": 16, "number-systems": 0.375,
"modular-arithmetic": (9 + 50) % 12, "polynomials-roots": 20 / 5, "combinatorics": comb(49, 6), "probability": 0.5 * 0.5,
"random-variables": 100 * 0.01, "ring-field": next(x for x in range(1, 7) if 3 * x % 7 == 1), "homomorphism": 3,
"complex-numbers": abs(3 + 4j), "sequences-series": 1 / (1 - 0.5), "multivariable-calculus": 2 * 1 * 2,
"ode": 100 * exp(0.5 * 4), "fourier": 1000 / 440, "topology": (2 - (1000 - 3000 + 2000)) / 2, "determinant": 3 * 2, "real-analysis": 0,
"fundamental-theorem-algebra": (1j * -1j).real, "central-limit-theorem": 1.71 / sqrt(100), "computability": 3 * 2,
"godel-incompleteness@01-mathematics": 12 + 3, "category-theory": 2 * 3, "trigonometry": 10 * sin(radians(60)),
"exponential-logarithm": log(2) / 0.05, "mean-value-theorems": 120 / 1.5, "optimization": (40 / 4)**2,
"change-of-variables": pi * 0.2**2, "orthogonality-least-squares": (10 + 12 + 14 + 16) / 4, "svd": 5 * 2,
"graph-theory": 4 * 3 / 2, "recurrence-generating": 55, "complex-analysis": 0, "measure-theory": 0, "manifolds": 3 + 3,
"bayes-theorem": 0.5 * 0.2 / (0.5 * 0.2 + 0.05 * 0.8), "prime-numbers": len([d for d in range(1, 61) if 60 % d == 0]),
"markov-chains": 0.4 / (0.1 + 0.4), "lagrange-multipliers": 5 * 5, "banach-fixed-point": cos(1), "galois-theory": factorial(5),

"kinematics": 0.5 * 3 * 8**2, "vectors": 50 * 20 * cos(radians(60)), "calculus-physics": 8 * 3, "newton-laws": 1200 * 20 / 4,
"momentum": 1000 * 20 / (1000 + 1500), "work-energy": 0.5 * 0.145 * 40**2, "energy-conservation": sqrt(2 * 9.8 * 45),
"rotational": 200 * 0.3, "gravitation": 6.674e-11 * 5.97e24 * 70 / 6.37e6**2, "lagrangian": 0.5 * 2 * 3**2 - 5,
"least-action": -10 * 3, "hamiltonian": 6 / 2, "shm": sqrt(40000 / 400), "waves": 343 / 440,
"coulomb": 8.99e9 * 1e-6 * 1e-6 / 0.1**2, "gauss-law": 8.85e-12 / 8.85e-12, "magnetism-lorentz": 1.6e-19 * 1e6 * 0.5,
"faraday": 0.6 / 0.2, "ampere-maxwell": 8.85e-12 * 2.26e11, "maxwell-equations": 1 / sqrt(1.257e-6 * 8.854e-12), "em-waves": 3e8 / 2.4e9,
"thermo-temperature": 6.02e23 * 1.381e-23 * 273 / 0.0224, "first-law-thermo": 500 - 200,
"entropy-second-law": 1000 / 300 - 1000 / 400, "boltzmann-entropy": 10, "boltzmann-distribution": exp(-1),
"geometric-optics": degrees(asin(sin(radians(45)) / 1.33)), "wave-optics": degrees(asin(650e-9 / 0.1e-3)),
"special-relativity": 2.2 / sqrt(1 - 0.64), "spacetime": sqrt(4**2 - 3**2), "mass-energy": 0.001 * (3e8)**2,
"equivalence-principle@02-physics": 60 * (9.8 + 2), "geodesics-curvature": 2 * pi * 6371 / 4,
"einstein-equation": 8 * pi * 6.674e-11 / (3e8)**4, "photoelectric-quantization": 6.626e-34 * 1.5e15 / 1.602e-19 - 4.0,
"matter-waves": 6.626e-34 / 5.3e-24, "wavefunction": 1 / 4, "schrodinger": 2 * 3**2, "operators-observables": 0.6 * 2 + 0.4 * 5,
"uncertainty": (6.626e-34 / (2 * pi)) / (2 * 1e-10), "quantum-tunneling": exp(2), "quantum-spin": 0.5 * 1.5,
"hydrogen-atom": 13.6 / 4 - 13.6 / 9, "quantum-entanglement": 1000 - 503, "qft-idea": 6.626e-34 * 3e8 / 500e-9 / 1.602e-19,
"standard-model": 3 * (2 / 3) - (2 / 3 - 2 / 3), "cosmology-glimpse": 70 * 100, "forces-friction": 0.4 * 30 * 9.8,
"fluids-bernoulli": 0.5 * 1000 * (4**2 - 2**2), "heat-engines-carnot": 1 - 300 / 800, "electric-potential": 0.5 * 100e-6 * 300**2,
"circuits-ohm": 12 / 3, "blackbody-planck": 2.898e-3 / 5800 * 1e9, "bohr-model": 1240 / 10.2, "quantum-harmonic-oscillator": 0.266 / 2,

"atom-nucleus-electrons": 14 - 6, "quantum-numbers": 2 * 4**2, "electron-configuration": 18 + 2 + 6, "periodic-table": 19 - 18,
"periodic-trends": 496 * 2.0, "effective-nuclear-charge": 11 - (2 * 1.00 + 8 * 0.85), "ionic-bond": 117 / 58.44,
"covalent-bond": 436 * 3.0, "electronegativity-polarity": 3.44 - 2.20, "lewis-structures": 5 - 3, "vsepr": 109.5 - 104.5,
"hybridization": 2 * 3, "mo-theory": (10 - 6) / 2, "metallic-bond": 2.0 * 60, "mole-concept": 36 / 18.0 * 6.022e23,
"stoichiometry": 4 * 16 / 2, "ideal-gas-law": 0.50 * 0.08206 * 300 / 2.0, "kinetic-molecular-theory": sqrt(32 / 4),
"intermolecular-forces": 100 + 162, "states-of-matter": 0.006 * 101325, "solutions-concentration": 0.154 * 0.50 * 58.44,
"enthalpy": 890.3 * 2.0, "entropy": 8.314 * log(2), "gibbs-free-energy": 30 / 0.100, "chemical-equilibrium": 0.80 / 0.20,
"le-chatelier": (1 + 3) - 2, "acids-bases": 0.10 * 0.050, "ph-scale": -log10(5.0e-3), "buffers": 4.7 + log10(10), "reaction-rate": 3,
"arrhenius-activation": 6000 * 8.314 / 1000, "catalysis": exp(10000 / (8.314 * 298)), "redox": 2,
"electrochemical-cells": -2 * 96485 * 1.10 / 1000, "nernst-equation": 0.0592 / 2 * log10(100), "schrodinger-atom": -13.6 / 4,
"functional-groups": 2 * 12.01 + 6 * 1.008 + 16.00, "isomerism": 2**3, "organic-reaction-types": 4,
"thermodynamics-vs-kinetics": exp(10000 / (8.314 * 373)), "computational-chemistry": 75, "coordination-complexes": 2 * 6 * 2,
"chemical-bond-energetics": 436 + 242 - 2 * 431, "acid-base-titration": 0.100 * 30.0 / 25.0, "oxidation-states": -1 + 8,
"phase-equilibria-clausius": exp(-40700 / 8.314 * (1 / 363 - 1 / 373)), "reaction-mechanisms": 4,
"equilibrium-thermo-link": exp(11400 / (8.314 * 298)), "colligative-properties": 2 * 1.86 * 2.0, "hess-law": -393.5 + 283.0,
"rate-laws-order": log(2) / 0.10, "transition-state-theory": 1.380649e-23 * 298 / 6.62607e-34, "solubility-product": sqrt(1.8e-10),
"beer-lambert-law": 0.60 / 15000, "crystal-field-theory": 4,

"bit": log2(64), "probability-basics": 10 / 6, "shannon-entropy": bent(0.25), "kraft-source-coding": 1.75 * 8000,
"mutual-information": 1.0 - 0.3, "channel-capacity": 1 - bent(0.11), "error-correcting-codes": 2 * 5 + 1,
"kolmogorov-complexity": 2**10, "set-function-relation": 4**3, "dfa-nfa": 2**4, "regular-languages": 5 + 3, "context-free": 5,
"chomsky-hierarchy": 4 * 3, "turing-machine": 4, "church-turing": 4 * 3 / 2, "decidability": 30**2, "halting-problem": 15, "big-o": 10**2,
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

BIO = {
"boltzmann": exp(-2.0), "partition-function": 1 + 1 / e, "free-energy": log(10) * 2, "gibbs": -0.6 * 6 * log(10),
"eigen-modes": 2, "hydrophobic": 50, "debye": 0.3 * 0.15**-0.5, "structure-hierarchy": 270 * 4, "ramachandran": 98,
"ideal-chain": 1.4 * 50**0.5, "wlc": 50 / 0.34, "two-state-folding": 100 / 101, "folding-funnel": log10(3) * 100,
"anfinsen": 3 * 2, "ddg": 1.8, "binding-kd": 0.75, "hill": 0.5, "mwc": 4 * 0.97, "michaelis": 50000 / 550,
"eyring": 6e12 * exp(-25), "fick": (10e-6)**2 / (2e-9) * 1e3, "einstein-stokes": 4.1e-21 / (12e-12 * pi), "random-walk": 0.2,
"nernst": 61 * (log10(5) - log10(140)), "bilayer": 1 / 1.05, "hodgkin-huxley": 110, "gnm": 100 - 1, "md": 5e8,
"alphafold-plddt": 90, "esm": -4, "idp-llps": 36, "amyloid": 3, "mdcath": 540, "poisson-boltzmann": e**(-1 / 0.78),
"langevin": 4.1e-13, "smoluchowski-rate": 4 * pi * 1e-18, "kramers": 10, "bragg": degrees(asin(0.154)),
"nmr-noe": 2.5 * sqrt(2), "fret": 1 / (1 + 0.8**6), "cryo-em-ctf": 350000, "helfrich": 160 * pi, "ghk": 20,
"cable-equation": exp(-2), "monte-carlo": exp(-2), "fep-wham": -8, "markov-state-model": 10 / log(1 / 0.9),
"contact-order": 0.15, "redox-potential": -2 * 96.485 * 1.14, "electron-transport-chain": 1000 * (4 + 4 + 2),
"chemiosmosis": 209, "atp-synthase": 10 / 3, "knf-allostery": 4 - 2.4, "pka-shift": 7.7, "ion-channel-gating": 1e5,
"membrane-transport": 100 * (3 - 2), "signal-transduction": 1000, "molecular-motors": 800, "entropic-elasticity": 0.615,
"polymer-gels": 4e4, "reaction-diffusion": 20, "optical-tweezers": 2, "afm": 100, "saxs": 1.8 * sqrt(5 / 3),
"mass-spec": 1000, "nmr-relaxation": 0.15, "cryo-em-workflow": 1e5, "cryo-em-revolution": 5, "ml-force-fields": 0.05,
"condensate-biophysics": 150, "circular-dichroism": 0.6, "patch-clamp": 2e-12 / 1.602e-19, "smfret-dynamics": 0.44,
"marcus-theory": -2.5, "verlet": 1, "rmsf": 8 * pi**2 / 3, "replica-exchange": 1.5**(1 / 15), "coarse-graining": 12,
"flory-scaling": 2**0.6, "rouse-model": 4, "equipartition": sqrt(4.14e-17) * 1e9, "chemical-potential": -2.58 * log(10),
"electrochemical-potential": 150 + 61.5 * 0.75, "mass-action": -8.314e-3 * 310 * 3 * log(10),
"arrhenius": exp(50000 / 8.314 * 10 / 93000), "osmotic-pressure": 300 * 8.314 * 310, "detailed-balance": 1e6 * e**2,
"fluctuation-dissipation": sqrt(4 * 4.14e-21 * 1e9 * 1e3) * 1e6, "le-chatelier@biophysics": exp(-50000 / 8.314 * 10 / 93000),
"stirling-approximation": 200 * log(10) - 100, "central-limit-theorem@biophysics": 100, "master-equation": 1 / 6,
"gaussian-integral": sqrt(pi) / 2, "lagrange-multipliers@biophysics": 25, "harmonic-approximation": 57.1,
"legendre-transform": 40, "saddle-point-method": log(sqrt(20 * pi) * (10 / e)**10), "correlation-function": 0.8 * 2,
"fourier-transform": 2, "onsager-reciprocity": 6, "linear-response-theory": 4e-17 / 4.1e-21, "itc": -5.8,
"spr": 100 * log(2), "fcs": 156.25, "epr": 2.0023 * 9.274e-24 * 0.35 / 6.626e-34 * 1e-9, "schrodinger-equation": 2,
"perturbation-theory": -0.02, "selection-rules": 2, "tunneling-wkb": exp(-5.12), "steady-state-approximation": 0.001,
"maxwell-dipole-radiation": 1e18, "dls": 2e-11 * 1.87e7**2, "dsc": 0.825, "analytical-ultracentrifugation": 4e-13 * 8.314 * 293 / 1.62e-11,
"radius-of-gyration": 0.38 * sqrt(50 / 3), "persistence-length": 51, "zeta-potential": -7.08e-10 * 0.03 / 8.9e-4,
"preferential-interaction": 5, "debye-waller-factor": 2.5 / pi**2, "electrostatics": 2.875e-21, "van-der-waals": 0.34 * 2**(1 / 6),
"hydrogen-bond": 2, "continuity-equation": 2, "gouy-chapman": 7.08e-10 / 7.8e-10, "debye-huckel-activity": 10**-0.0509,
"pi-stacking": 28.5, "cation-pi": 7.5, "salt-bridge": 20.75, "stern-layer": 0.16, "dlvo": 50 / 64, "hofmeister": 10,
"anion-pi": 8, "ch-pi": -4.5,
}
E.update({k if "@" in k else f"{k}@biophysics": v for k, v in BIO.items()})

MIND = {
"neuron-doctrine": 500, "neuron-structure": 50, "ionic-gradients": 500, "nernst": 26.7 * 2.302585,
"goldman": 25, "resting-potential": 20, "passive-cable": 10 / e**2, "voltage-gated-channels": 0.7,
"action-potential": 100, "hodgkin-huxley": 0.1, "saltatory-conduction": 1000 / 60, "chemical-synapse": 3,
"electrical-synapse": 2, "neurotransmitters-receptors": 100, "synaptic-integration": 50, "ltp-ltd": 50,
"hebbian-learning": 0.1, "stdp": 1 / e, "neural-coding": 60, "population-coding": 10, "neural-circuits": 30,
"working-memory": 60, "sensory-transduction": 1e5, "receptive-fields": 30, "hierarchical-processing": 20,
"motor-control": 1, "hippocampus-memory": 75, "memory-consolidation": 1 / e, "attention": 40,
"perception-inference": 0.8, "neural-oscillations": 25, "neuromodulation": 5, "integrate-and-fire": 500,
"neuronal-dynamics": 60, "perceptron": 0.5, "artificial-neural-networks": 78500, "predictive-coding": 3,
"reinforcement-learning-brain": 1, "neural-criticality": 1, "theories-of-consciousness": 0.5,
"brain-computer-interfaces": 1.5, "connectomics": 7550, "glia": 1, "reward-prediction-error": 0.2,
"cognitive-map": 58.8, "drift-diffusion": 400, "efficient-coding": 3, "neurovascular-coupling": 15,
"interoception": 15 / 285 * 100, "amygdala-emotion": 45, "sleep-memory-replay": 10, "free-energy-principle": 2,
"tripartite-synapse": 10, "homeostatic-plasticity": 3, "oja-rule": 0.8, "bcm-rule": 2.25, "hopfield-network": 14,
"backpropagation": -0.128, "sparse-coding": 0.05, "signal-detection-theory": 2,
}
E.update({f"{k}@07-mind": v for k, v in MIND.items()})

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
