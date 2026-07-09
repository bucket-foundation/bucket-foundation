# Superconducting (transmon) qubits · H-supercon
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Artificial atoms made from superconducting circuits — a Josephson junction gives a nonlinear inductance, so the two lowest energy levels of the circuit form a qubit. The transmon variant runs the junction shunted by a large capacitor to flatten its sensitivity to charge noise, trading anharmonicity for stability; the fluxonium variant shunts with a large inductance and reaches higher anharmonicity and longer coherence at the cost of a harder control problem. Qubits are driven with shaped microwave pulses at ~4–6 GHz and read out dispersively through a coupled resonator; the whole chip sits at ~10–20 mK in a dilution refrigerator (see `H-cryo`), with readout amplified by a near-quantum-limited parametric amplifier (see `H-paramp`). This is the most mature gate-based modality by deployed-system count and the one IBM, Google, and Rigetti build on.

## Key players & state of the art (2025–26)
- **IBM**: Nighthawk (Nov 2025) — 120 transmons on a square lattice targeting 5,000-gate circuits in 2025, rising to 7,500 (2026), 10,000 (2027), 15,000 (2028), chained into three-module 360-qubit configs via l-couplers. Loon (2025) demonstrated c-couplers giving six-way non-nearest-neighbor connectivity for qLDPC codes while holding several-hundred-µs coherence. Roadmap: Kookaburra (2026, first qLDPC memory + logic-processing unit), Cockatoo (2027), **Starling** fault-tolerant system in 2029 (200 logical qubits, 100M gates), Blue Jay (2033, ~2,000 logical).
- **Google**: Willow, 105 qubits — below-threshold surface-code QEC (Nature 2024): logical error suppressed Λ ≈ 2.14× per code-distance step (d=3→5→7), distance-7 logical memory outliving the best physical qubit by 2.4×, with a real-time decoder. Roadmap: a long-lived logical qubit, then ~1M physical qubits.
- **Rigetti**: Cepheus-1-108Q GA system (Apr 2026), 99.1% median 2Q fidelity via a modular 4×9-qubit chiplet tiling; targets 150+ qubits at 99.7% by late 2026, 1,000+ by end-2027.
- **IQM**: Radiance, ~150 qubits, 99.91% 2Q fidelity reported Mar 2026. **OQC** (UK): coaxmon 3D architecture. **SEEQC**: single-flux-quantum (SFQ) digital control on-chip.
- **Coherence records**: a Princeton 2D transmon on tantalum/high-resistivity-silicon reached T1 ≈ 1.68 ms (Q ≈ 2.5×10⁷), roughly 3× the prior best (Nature 2025) — direct evidence the TLS/materials bottleneck (see `H-fab`) is still yielding to substrate engineering.

## Key graded claims
- T2 Below-threshold surface-code error correction on 105-qubit Willow — Nature s41586-024-08449-y (2024) (demonstrated)
- T2 2D transmon T1 up to 1.68 ms on tantalum/Si — Princeton, Nature (2025) (demonstrated)
- T4 IBM Starling: fault-tolerant, 200 logical qubits by 2029 — IBM roadmap (roadmap)
- T4 Rigetti 99.1% median 2Q on 108-qubit GA system — company release, Apr 2026 (claimed)
- T4 IQM 99.91% 2Q fidelity on Radiance — company claim, Mar 2026 (claimed)

## Trade-offs (vs other modalities)
Fast gates (tens of ns, ~1000× faster than ions), lithographic fab, and the deepest industrial base; against that, coherence measured in ~0.1–1.7 ms, mostly fixed nearest-neighbor connectivity, dilution cryogenics, and TLS defects that cap and drift coherence. Wiring heat-load and fridge volume dominate the scaling problem past ~1,000 qubits, which is why every roadmap turns to cryo-CMOS (`H-cryocmos`), 3D integration (`H-package`), and modular interconnects (`H-intercon`).

## Conflicts / open questions
Can qLDPC codes (IBM) beat the surface code's overhead in real hardware, or is the surface code's higher threshold worth its worse encoding rate? Does the modality hit a wiring/cryo wall before millions of qubits, forcing fridge-to-fridge links that depend on unsolved microwave-optical transduction (`H-transduce`)?

## Sources
IBM Quantum blog "large-scale FTQC" + roadmap 2025/2026; Google Quantum AI, Nature s41586-024-08449-y; Princeton Nature s41586-025-09687-4 (millisecond transmon); Rigetti investor release; IQM Radiance release; quantumzeitgeist.com superconducting guide (2026).
