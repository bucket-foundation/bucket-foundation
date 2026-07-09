# Quantum advantage complexity theory — BQP, BPP & the separations · S-complexity
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
The complexity-theory scaffolding that tells you *what* quantum computers can provably do faster, and what "quantum advantage" formally means. **BQP** (bounded-error quantum polynomial time) is the class of problems a quantum computer solves efficiently; **BPP** is its classical randomized counterpart. The central facts: $\text{BPP}\subseteq\text{BQP}\subseteq\text{PSPACE}$, so quantum computers are no more powerful than classical ones up to polynomial space, and a proof that $\text{BQP}\neq\text{BPP}$ would imply $\text{P}\neq\text{PSPACE}$ — beyond current mathematics. This is why **every** quantum speedup is either (a) relative to the *best known* classical algorithm, not a proven separation (Shor, `S-shor`), or (b) proven only in a restricted **oracle / query model** (Grover, `S-grover`; Simon's problem, the first exponential query separation), or (c) proven under a **complexity-theoretic assumption** (sampling advantage rests on the non-collapse of the polynomial hierarchy). The map's `O-advantage` node is the empirical face of this node's theory.

## Where it stands (2025–26)
The strongest unconditional evidence that quantum beats classical is relativized. **Raz–Tal (STOC 2019)** built an oracle under which $\text{BQP}\not\subset\text{PH}$ (the polynomial hierarchy) — refuting the natural conjecture that quantum power stays inside the classical hierarchy, using the Forrelation problem and a deep bound against constant-depth (AC⁰) circuits. **Shallow-circuit separations** (Bravyi–Gosset–König, Science 2018, and the noise-robust follow-ups) prove a *provable, unconditional* advantage of constant-depth quantum over constant-depth classical circuits — one of the few speedups needing no complexity assumption at all. **Sampling advantage** (random circuit sampling, boson sampling; `S-bench`) is proven hard for classical computers *only if* the polynomial hierarchy does not collapse — a widely believed but unproven assumption, and one that erodes empirically as tensor-network methods improve (`S-tensornet`). **Interactive verification** (Mahadev 2018) lets a classical verifier check a quantum computation it cannot itself run, underwriting the "verifiable advantage" framing (`O-verification`). Dequantization (Tang, `S-hhl`/`S-qml`) is the counter-current: several claimed exponential separations collapsed when the classical input model was matched.

## Key graded claims
- [T1] $\text{BPP}\subseteq\text{BQP}\subseteq\text{PSPACE}$; $\text{BQP}\subseteq\text{P}^{\#\text{P}}$ — Bernstein–Vazirani, SIAM J. Comput. 26 (1997) (established)
- [T1] Oracle separation $\text{BQP}\not\subset\text{PH}$ — Raz–Tal, STOC 2019 (established, relativized)
- [T1] Unconditional constant-depth quantum > constant-depth classical — Bravyi–Gosset–König, Science 362, 308 (2018) (established)
- [T2] Sampling advantage hard unless PH collapses — Aaronson–Arkhipov (boson sampling, 2011); Bouland et al., Nat. Phys. 15 (2019) (established, conditional)
- [T2] Classical verification of quantum computation — Mahadev, FOCS 2018 (established)

## Speedup / caveat
This node is the *definition* of the caveat. No exponential quantum speedup over classical is unconditionally proven in the standard (non-oracle) model — proving one would resolve open problems in classical complexity. So the honest hierarchy of claims is: unconditional-but-shallow (Bravyi–Gosset–König) > relativized (Raz–Tal, Simon) > assumption-based (sampling) > best-known-classical (Shor, and the algorithms most people mean by "quantum advantage"). Grading every speedup by which rung it sits on is exactly the manual's job (`evidence/SCHEMA.md`).

## Conflicts / open questions
Whether $\text{BQP}\neq\text{BPP}$ at all (unknown, and likely as hard as P vs PSPACE). Whether any *practical* problem sits in the proven-hard regime with an efficient input model (the running `S-hhl`/`S-qram` question). Whether sampling hardness assumptions survive continued classical progress (`S-tensornet`, `S-bench`).

## Sources
SIAM J. Comput. 26, 1411 (1997); Raz–Tal, STOC 2019; Science 362, 308 (2018); Nat. Phys. 15, 159 (2019); Mahadev, FOCS 2018. Cross-links: `S-shor`, `S-grover`, `S-bench`, `S-tensornet`, `O-advantage`, `O-verification`.
