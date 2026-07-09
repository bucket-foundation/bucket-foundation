# Quantum in Chemicals & Materials · I-chem
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Like pharma, chemicals is a native quantum-simulation target (`S-qsim`): designing catalysts, battery electrolytes, photochromic and semiconductor materials, and reaction pathways by computing electronic structure directly instead of trial-and-error lab work. McKinsey frames it as compressing decades of chemistry. This is the domain with the clearest *theoretical* quantum advantage — the algorithms (VQE, quantum phase estimation) map onto exactly what quantum computers do naturally.

## Real activity (named, dated)
- **BASF** — collaboration with **SEEQC** on quantum for homogeneous catalysis; with **Kipu Quantum** (2024) on optimization algorithms; broader hybrid catalyst-design program via the German QUTAC consortium.
- **Mitsubishi Chemical + PsiQuantum** — simulating **excited states of photochromic molecules** (smart windows, solar storage, data storage). Also **Mitsubishi + Xanadu** on semiconductor materials; long-running IBM case study.
- **Dow** — quantum chemistry exploration (historical IBM Quantum Network member).
- **Microsoft Azure Quantum Elements** — AI+quantum chemistry/materials platform pitched to chemical companies. **NVIDIA cuEST** (GPU electronic-structure library) — TSMC reports ~50x faster chemistry simulations; a *classical*-acceleration reminder that the near-term competition to quantum chemistry is GPU HPC, not other quantum machines.
- **Merck, Covestro, Evonik** — QUTAC members probing polymer/formulation chemistry.

## Key graded claims
- T1 Molecular electronic-structure simulation is a provably natural quantum-computer task — textbook (established in principle; hardware not yet capable at industrial scale)
- T3/T4 Photochromic excited-state simulation — Mitsubishi Chemical/PsiQuantum (exploratory)
- T4 Homogeneous-catalysis quantum modeling — BASF/SEEQC (research collaboration)
- T5 Chemicals/materials as a leading slice of McKinsey's ~$2.7T-by-2035 value estimate and BCG's $450–850B-by-2040 — analyst forecasts; grade hard, inflation-unadjusted and double-counted with pharma/energy

## Proven today vs promise vs hype
- **Proven:** VQE/QPE run on real hardware for tiny molecules (\ce{H2}, \ce{LiH}, small actives) — results classical DFT/coupled-cluster already match or beat.
- **Promise:** catalyst and photochromic design at useful accuracy — the strongest theoretical case in any industry, gated on thousands of logical qubits.
- **Hype:** "quantum is designing industrial catalysts now," trillion-dollar near-term chemicals TAM.

## Honest assessment
The theoretical case is the strongest in any industry — simulating quantum chemistry is what quantum computers are *for*. But \ce{FeMoco}-class catalysts and industrial reaction networks need error-corrected machines with thousands of logical qubits; today's devices simulate only tiny molecules classical methods already handle, and GPU-accelerated classical chemistry keeps raising the bar quantum must clear. Every named "pilot" is a research collaboration probing algorithms, not a deployed design tool. Honest timeline: fault-tolerant chemistry advantage is a **2030s** proposition. Hold the distinction — strong theory, essentially zero present-day production advantage.

## Sources
- McKinsey "Solving chemistry's toughest problems": https://www.mckinsey.com/capabilities/mckinsey-technology/our-insights/solving-chemistrys-toughest-problems-the-quantum-computing-advantage
- BASF/QUTAC catalysts: https://www.qutac.de/en/basf-how-quantum-computing-can-help-develop-chemical-catalysts/
- Mitsubishi Chemical/IBM: https://www.ibm.com/case-studies/mitsubishi-chemical
- NVIDIA cuEST / TSMC 50x chemistry: nvidianews.nvidia.com (GTC 2025)
- C&EN "Will quantum computing be chemistry's next AI?" (Nov 2025)
