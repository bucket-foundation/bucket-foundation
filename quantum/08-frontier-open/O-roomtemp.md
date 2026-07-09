# Room-Temperature & Photonic Scaling Paths · O-roomtemp
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
Superconducting and spin qubits live at millikelvin temperatures inside dilution refrigerators — a cost, wiring, and I/O ceiling that gets brutal at a million qubits. Photonic qubits run gates at room temperature, ship through ordinary fiber, and can be fabbed in semiconductor foundries; NV-diamond systems also operate warm. If either path scales, the economics change category: data-center racks instead of cryostats, networking for free, CMOS-foundry manufacturing. The sharp question is whether photonics' *own* tax — photon loss, probabilistic entangling gates, and the cryogenic single-photon detectors it still needs — comes in cheaper than the dilution-refrigerator tax it removes. "Room temperature" is a claim about *where the hard part moves*, not about eliminating it.

## Where the disagreement is
- **Path-changes-the-economics camp.** **Xanadu's Aurora** (Jan 2025, *Nature*): a modular, networked photonic machine — 4 server racks, 35 photonic chips, 13 km of fiber, 12 physical qubits — presented as scalable in principle to thousands of racks and millions of qubits; Xanadu targets ~1,000 logical qubits by 2029 at ~100:1 [T2 for the demo; T4/T6 for the extrapolation]. **PsiQuantum** partners with GlobalFoundries to fab million-qubit photonic systems, with utility-scale sites announced in Brisbane and Chicago and a multi-hundred-million-dollar raise [T4]. Fusion-based-QEC papers argue photonic loss thresholds are reachable [T3]. On the warm-hardware side, Quantum Brilliance's NV-diamond modules run fully cryo-free.
- **Extrapolation-is-huge camp.** "Room temperature" carries an asterisk — the superconducting-nanowire single-photon detectors (SNSPDs) at the heart of every photonic scheme are cryogenic, so the cryoplant shrinks rather than disappears [T3, CACM]. Photon loss plays the role decoherence plays elsewhere, and current per-component losses sit orders of magnitude above fusion thresholds; **Aurora's 12 physical qubits against a million-qubit roadmap is the largest extrapolation ratio in the industry** [T3/T6]. PsiQuantum has published no full-system demo at any qubit count, making its million-qubit target the field's biggest single T4 claim. NV-diamond is genuinely cryo-free but sits far behind on qubit count and two-qubit gate fidelity [T3]. Room-temperature *superconductivity* — which would remove the fridge for the transmon path entirely — remains unconfirmed after the retracted LK-99 and Ranga Dias episodes [T3].

## What would resolve it
A photonic machine demonstrating error-corrected logical qubits with **published end-to-end loss budgets** — even ~10 logical qubits would validate the architecture and move it from T4 to T2. For the economics claim: a cost-per-logical-qubit-hour comparison against a superconducting system once both exist at comparable capability. PsiQuantum's first full-stack public benchmark is the single most information-rich pending event on this node; Aurora scaling from 12 to hundreds of physical qubits with loss held constant would be the second.

## Sources
- Xanadu Aurora — *Nature* s41586-024-08406-9 (2025) [T2]; Xanadu roadmap [T4]
- PsiQuantum / GlobalFoundries partnership + Brisbane/Chicago site announcements [T4]
- CACM, "Making Qubits with Photons" (SNSPD-cryogenics caveat) [T3]
- Springer J. Supercomputing photonic FTQC review (2025); Tom's Hardware photonics roadmap [T3/T5]
