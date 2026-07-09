# Packaging, interposers & 3D integration · H-package
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Once a superconducting chip passes a few hundred qubits, you cannot route every control and readout line in from the edges of a single plane — wiring congestion, microwave crosstalk, and mechanical stress make 2D layout a dead end. The fix is borrowed from classical chip packaging and pushed into the superconducting, millikelvin regime: **flip-chip** bonding (a qubit chip bump-bonded face-to-face to a separate wiring/readout chip), **through-silicon vias (TSVs)** carrying signals vertically through the substrate, and **silicon interposers** hosting superconducting coplanar-waveguide routing between chiplets. This lets a machine partition into a **qubit chiplet + bus/wiring chiplet** stack — the quantum analog of 2.5D/3D heterogeneous integration — so qubit count can grow without the signal fan-out choking it.

## Key players & state of the art (2025–26)
- **MIT Lincoln Laboratory** pioneered superconducting TSVs and 3D-integrated qubit stacks (high-coherence tileable 3D architectures; silicon hard-stop spacers for controlled flip-chip gaps). **IBM** and **Google** both run flip-chip processes in production (Google's Sycamore/Willow and IBM's Heron/Nighthawk use multi-layer wiring and bump bonds).
- **QuantWare** (Delft): explicitly markets chiplets + 3D packaging ("VIO" vertical I/O) to let smaller labs build high-density modules — packaging-as-a-product.
- **imec**, **Chalmers**, and foundry programs develop superconducting TSV and micro-bump processes; through-sapphire-substrate machining is an alternative route (arXiv:2406.09930). A 2026 review (arXiv:2602.04831) surveys large-scale superconducting integration; microwave-crosstalk characterization in planar/3D devices is an active measurement front (arXiv:2606.02440).

## Key graded claims
- T2 High-coherence qubits preserved through TSV/flip-chip 3D integration — MIT-LL, arXiv:2107.11140 / 1708.02226 (demonstrated)
- T4 Chiplet + interposer packaging enables high-density modular qubit stacks — QuantWare (claimed)
- T3 3D partition (qubit chiplet + bus chiplet) as the path past 2D wiring limits — IEEE/review literature (demonstrated at small scale)

## Trade-offs
3D integration buys signal density and routing headroom but adds lossy interfaces — every bump bond, via, and dielectric layer is a candidate home for TLS defects (`H-fab`) that can degrade the very coherence the packaging is meant to serve. Flip-chip gaps must be controlled to microns; TSV superconductivity must survive thermal cycling to mK. The engineering is a constant fight between more connectivity and preserved coherence.

## Conflicts / open questions
Can 3D packaging scale line density fast enough to feed thousand-qubit chips without importing enough interface loss to cap coherence? Does the industry converge on a standard interposer/chiplet interface (a "quantum socket"), or stay bespoke per vendor? Packaging is emerging as a distinct chokepoint alongside the fridge and the controller.

## Sources
arXiv:2107.11140, 1708.02226, 1907.12882 (MIT-LL 3D/TSV); arXiv:2602.04831 (2026 large-scale integration review); 2406.09930 (through-sapphire); 2606.02440 (microwave crosstalk); QuantWare VIO materials; NSF interposer-packaging report (par.nsf.gov/10340124).
