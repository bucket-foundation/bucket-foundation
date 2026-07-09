# Chip-to-Chip Entanglement Fidelity · O-interconnect-loss
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
No single chip will hold the millions of qubits a useful computer needs, so every serious roadmap is **modular**: many smaller processors linked by quantum interconnects. The catch is that gates *across* a link are slower and lower-fidelity than gates on a chip. Long-range links (fridge-to-fridge, via microwave-to-optical transduction and photons) are lossy and probabilistic; even short on-substrate couplers add error. The sharp question is whether inter-module entanglement can be made good enough — high enough fidelity, high enough rate — that error correction still works *across* module boundaries, or whether the interconnect becomes the dominant error source that caps the whole machine (see H-intercon, H-transduce, F-teleport, A-qmemory-hw).

## Where the disagreement is
- **Modular-is-inevitable camp.** IBM's 2024 Flamingo demonstrated two Heron R2 chips linked over ~1 m couplers, and the entire roadmap (Cockatoo 2027 establishes module-to-module entanglement via l-couplers; Starling 2028–29 does magic-state injection across modules) is built on chip-to-chip and fridge-to-fridge links. Trapped-ion and neutral-atom platforms shuttle qubits or photons between zones with high fidelity; Quantinuum uses photonic links between QCCD units and reports high-fidelity entanglement across them. Codes tolerant of noisy inter-module links (lattice surgery across boundaries, qLDPC blocks connected by comparatively few long-range checks) exist on paper, and proponents argue distributed/networked QC (see A-qinternet) makes modularity a feature that also enables scaling past a single cryostat T3/T4.
- **Interconnect-caps-the-machine camp.** IBM's own Flamingo link reported roughly **3.5% error** across the coupler in 2024 — about two orders of magnitude worse than the best on-chip two-qubit gates T4. Photon-loss-limited remote-entanglement rates are slow relative to qubit coherence, and if inter-module error correction demands many rounds of noisy entanglement purification, the overhead could swamp the benefit. Microwave-to-optical transduction (the fridge-to-fridge path) still sits at low conversion efficiency with added noise, an unsolved component problem (H-transduce). Nobody has yet shown *fault-tolerant* logical operations spanning modules at scale T3.

## What would resolve it
A logical qubit whose stabilizer measurements *straddle two modules*, kept below threshold across the interconnect, sustained over many rounds — reproduced independently. IBM Cockatoo (2027) demonstrating below-threshold cross-module operation, or a trapped-ion/atom system running a logical gate across a photonic link at on-chip-comparable fidelity, would settle the direction. The negative signal: cross-link error rates that stay stuck near percent-level while on-chip gates keep improving, forcing architectures back toward monolithic chips they can't actually build.

## Sources
- IBM Quantum roadmap + Flamingo (Heron R2 link demo, 2024; ~3.5% coupler error) — ibm.com/quantum/blog T4
- Monroe et al., "Large-scale modular quantum-computer architecture with atomic memory and photonic interconnects," PRA 89, 022317 (2014) T2
- Benchmarking cavity-mediated interconnects, arXiv:2407.15651 (2024) T3
- Quantinuum QCCD photonic-link entanglement reports (2025–26) T3/T4
