# Cryogenic microwave wiring — coax, attenuators, isolators · H-wiring
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
The passive microwave plumbing that carries signals between room-temperature electronics (`H-control`) and the qubits at the bottom of the fridge (`H-cryo`) — and the single least-glamorous scaling wall in superconducting and spin QC. Every superconducting qubit needs on the order of 2–4 lines (drive, flux, readout in/out), each a coaxial cable running through four temperature stages. Three passive families dominate: **coax** (semi-rigid CuNi or stainless above 4 K for low thermal conductance; superconducting NbTi below 4 K for near-zero loss), **attenuators** anchored and distributed across stages (a canonical drive-line budget is ~20 dB at 4 K, ~10 dB at the still, ~20–30 dB at the mixing chamber), and **isolators / circulators** — bulky ferrite, magnetically biased, non-reciprocal parts on the output line that protect the qubit from amplifier back-action (`H-paramp`) but do not shrink or integrate. Filters (IR/low-pass, eccosorb) and thermal anchoring round out the chain.

The attenuators are not there to weaken the signal for its own sake; they thermalize the Johnson–Nyquist noise riding down each line, so the qubit sees a cold photon bath. Residual thermal occupation is $\bar n = \left(e^{\hbar\omega/k_BT}-1\right)^{-1}$; at 5 GHz and 20 mK, $\bar n \sim 10^{-5}$, but only if every stage is properly attenuated and anchored. Each coax also dumps conducted + radiated heat, so line count is capped by the fridge's cooling power — the bottleneck `H-cryocmos` and photonic I/O exist to break.

## Key players & state of the art (2025–26)
- **Coax / connectors**: HuberSuhner, Radiall, Maury Microwave; **cryo attenuators**: XMA/Omni-Spectra, Bluefors wiring kits.
- **Delft Circuits** (NL): flexible **Cri/oFlex** ribbon cabling puts dozens of lines in one flex, cutting the per-qubit space and heat-load footprint — the leading answer to the coax-count problem.
- **Low Noise Factory / Silent Waves / Quantum Microwave**: cryo isolators, directional couplers, and the output-chain components feeding the HEMT/TWPA readout.
- **Isolator replacement** is the hot research front: on-chip Josephson circulators, directional/nonreciprocal TWPAs, and multiplexed readout aim to delete the bulky ferrite parts entirely — none is yet a drop-in production replacement.

## Key graded claims
- T1 Distributed multi-stage attenuation + NbTi superconducting coax deliver $\bar n \ll 1$ thermal photons at the qubit — established cryo-microwave practice
- T3 Flexible ribbon cabling (Cri/oFlex-class) materially raises line density per fridge — Delft Circuits + lab deployments (demonstrated)
- T4 On-chip nonreciprocity will retire ferrite isolators at scale — research roadmap (not yet productized)

## Trade-offs
Every added line buys control fidelity and costs cooling power and volume; the ferrite isolators are the worst offenders on footprint and refuse to integrate. A million-qubit superconducting machine implies millions of coax lines — physically impossible in one fridge, which is exactly why the endgame forks toward cryo-CMOS multiplexing (`H-cryocmos`), photonic readout, and multi-fridge modularity (`H-intercon`, `H-transduce`). This node is the passive-supply-chain twin of the active control problem, split out from `H-cryo` (the fridge) and `H-fab` (the chip materials).

## Conflicts / open questions
Does the wiring bottleneck get solved by better passive engineering (denser ribbons, integrated isolators) or does it force an architectural escape (cryo-CMOS in-fridge control, optical I/O) before superconducting qubit counts reach the tens of thousands? The ferrite-isolator replacement is the pivotal unsolved passive component. Supply concentrates in few vendors — a chokepoint mirrored in `E-supplychain`.

## Sources
Krinner et al., "Engineering cryogenic setups for 100-qubit scale systems," EPJ Quantum Technology 6, 2 (2019); Delft Circuits Cri/oFlex documentation; Bluefors wiring guides; Low Noise Factory / Silent Waves component notes. Cross-links: `H-cryo`, `H-cryocmos`, `H-control`, `H-paramp`, `H-fab`, `H-intercon`, `E-supplychain`.
