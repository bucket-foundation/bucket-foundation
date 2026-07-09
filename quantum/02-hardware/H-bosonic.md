# Bosonic / cat qubits · H-bosonic
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Qubits encoded in the many-level state space of a harmonic oscillator (a superconducting cavity or resonator mode) instead of a two-level system, so a single physical mode carries redundancy that a normal qubit does not. **Cat qubits** store information in superpositions of two coherent states |α⟩ and |−α⟩; a two-photon drive stabilizes them so that bit-flips are suppressed *exponentially in the photon number* |α|², leaving only phase-flips for a simple 1D repetition code to catch — turning a 2D error-correction problem into a 1D one. GKP (grid) and binomial codes are sibling encodings that protect against small displacements. The goal across all of them: collapse the physical-per-logical overhead that makes the surface code so brutal.

## Key players & state of the art (2025–26)
- **Alice & Bob** (Paris): Boson 4 chip reached >1 hour bit-flip lifetime (Sep 2025, up from 7 minutes in 2024); the "squeezed cat" scheme cut correction cost (2025); the "Elevator Codes" preprint (Jan 2026) claims a ~15:1 physical:logical ratio at ~10,000× lower logical error. Raised €100M (Jan 2025); roadmap: 100 logical qubits by 2030.
- **AWS**: Ocelot chip (Nature, Feb 2025) — first integrated multi-cat-qubit chip combining cat stabilization with a distance-5 repetition code; bit-flip times approaching 1 s; AWS claims up to ~90% QEC-overhead reduction vs surface codes for a target logical error rate.
- **Nord Quantique** (Sherbrooke): multimode bosonic (GKP/binomial) encoding in 3D cavities; demonstrated error correction beyond break-even and pitches high logical density per physical unit — a single mode doing the work of a small code block.
- Yale (the modality's academic origin — Devoret/Schoelkopf lineage) continues to set GKP and cavity-coherence records.

## Key graded claims
- [T2] Ocelot: cat-qubit + repetition-code chip, ~1 s bit-flip times — AWS, Nature (2025) (demonstrated)
- [T4] Boson 4: >1 hr bit-flip lifetime — Alice & Bob release (claimed)
- [T3] Elevator codes: ~15:1 overhead, 10,000× lower error — Alice & Bob preprint, Jan 2026 (claimed, theory + partial demo)
- [T4] 100 logical qubits by 2030 — Alice & Bob roadmap (roadmap)

## Trade-offs (vs other modalities)
Reuses the entire transmon fab/cryo stack (`H-fab`, `H-cryo`) but promises an order-of-magnitude smaller QEC overhead *if* the noise-bias holds under operation; against that, phase-flips remain and must still be corrected, gate sets on biased-noise qubits are awkward (bias-preserving CNOTs are the hard case), and no bosonic machine has yet run multi-logical-qubit algorithms. Most overhead numbers are extrapolations from single-digit-qubit demos.

## Conflicts / open questions
Does the exponential bit-flip suppression survive once you do *fast gates* on the cat rather than just storing it — i.e., does the noise bias hold during computation, not only in memory? That is the load-bearing assumption behind every overhead claim in this node.

## Sources
AWS Ocelot (Nature, Feb 2025); alice-bob.com newsroom (squeezed cat, Boson 4, Elevator Codes preprint); postquantum.com cat-qubit + Nord Quantique analyses; The Quantum Insider (Mar 2025).
