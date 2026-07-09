# Interconnects & modular quantum computing · H-intercon
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
No single chip or trap reaches a million qubits, so every serious roadmap goes modular: multiple processors linked by quantum interconnects that distribute entangled Bell pairs between modules, then consume them for teleported gates (the protocol under `F-teleport`). Three flavors, at three length scales: **short cryogenic microwave/chip-to-chip couplers** inside one fridge (cm-scale, fast, high-fidelity); **optical-photonic links** over fiber between fridges/racks/buildings (km-scale, slow, lossy); and **microwave-to-optical transduction** (`H-transduce`) to let a superconducting qubit talk to a fiber at all. Interconnect *quality*, more than raw qubit count, now gates every modality's endgame — a bad link below the QEC threshold poisons the whole logical computation.

## Key players & state of the art (2025–26)
- **Oxford (trapped ions)**: distributed quantum computing across an optical network link — deterministic teleported CZ gates between two photonically linked ion-trap modules, executing Grover's algorithm across the boundary (Nature, 2025). The cleanest full-stack demonstration of the modular paradigm to date.
- **Duke Quantum Center + IonQ (Monroe group)**: first *fully-distributed* GHZ (tripartite) state across a **three-node** network of single trapped-ion memories linked by photonic interconnects — three modules ~2 m apart, 3 m single-mode fibers to a central free-space GHZ generator; bounded fidelity $0.841(17) \le F \le 0.881(17)$ at a generation rate $0.095(5)\,\mathrm{s}^{-1}$, with a Mermin-inequality violation closing the detection loophole for the first time in a distributed multipartite state (Jun 2026). Clears the two-node barrier toward genuine networked/modular QC.
- **IBM**: Nighthawk's 2026–27 plan chains up to three 120-qubit modules (360 qubits) with **l-couplers** (short-range chip-to-chip); **Loon**'s c-couplers add long-range on-chip connectivity for qLDPC codes; **Flamingo** targets ~1 m cryogenic links between modules.
- **Photonic Inc.** (silicon T-centers): distributed entanglement between modules over telecom fiber, using a spin-photon interface native to the T-center (see `H-spinphoton`); roadmap targets ~200 kHz remote-entanglement rate at 99.8% fidelity.
- **PsiQuantum / Xanadu**: chip-to-chip photonic-qubit interconnects are native to the photonic modality (`H-photonic`) rather than an add-on.
- **Quantinuum / IonQ**: photonic interconnects are the declared scaling path beyond single-trap limits. Silicon-photonic CNOT-gate teleportation between separate chips demonstrated (PRL 2025–26).

## Key graded claims
- T2 Teleported two-qubit gates between separate ion-trap modules; algorithm run across the link — Nature s41586-024-08404-x (demonstrated)
- T3 First fully-distributed three-node GHZ state of remote ion memories, F ≈ 0.84–0.88, Mermin violation with detection loophole closed — Duke + IonQ, Goetting et al., arXiv:2606.17173 (2026) (demonstrated; preprint)
- T4 IBM 3×120-qubit multi-module systems in 2026 — IBM roadmap (roadmap)
- T4 Photonic Inc. 200 kHz / 99.8% distributed entanglement — company target (roadmap)

## Trade-offs
Optical links carry entanglement kilometers but at kHz rates and ~90–97% Bell-pair fidelities — orders of magnitude below intra-module gates (99.9%+). Microwave couplers are fast and high-fidelity but reach only centimeters. Entanglement distillation buys fidelity back at a further rate cost. The core tension: the faster and cleaner the link, the shorter its reach; bridging fridges cheaply needs a transducer that does not yet exist (`H-transduce`).

## Conflicts / open questions
**C-interconnect-loss** / **O-interconnect-loss**: whether modular interconnects can stay below the QEC threshold across module boundaries. Microwave-optical transducers remain far from the efficiency/added-noise needed for fridge-to-fridge superconducting links. Does modularity's overhead (slower inter-module gates) break QEC cycle budgets before it buys scale?

## Sources
Nature s41586-024-08404-x (Oxford distributed ions); Goetting et al., arXiv:2606.17173 (Duke/IonQ three-node GHZ, 2026); photonic.com networking releases; IBM roadmap/newsroom (Nov 2025); PRL (silicon-photonic CNOT teleportation); arXiv:2412.18458.
