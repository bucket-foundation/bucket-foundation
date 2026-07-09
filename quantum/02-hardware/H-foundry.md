# The 300 mm / wafer-scale foundry ecosystem · H-foundry
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
The distinct-from-materials question of *who can actually manufacture qubits at wafer scale, on industrial tooling, with yield*. `H-fab` covers the materials science (junctions, films, TLS); this node covers the **foundry ecosystem** — the 200/300 mm semiconductor lines being retooled to make superconducting, silicon-spin, and photonic quantum chips, and the strategic fact that quantum is increasingly won or lost on manufacturing uniformity rather than single-device records. The pitch that pulled billions into silicon spin and photonics is precisely this: if a qubit can be built in a CMOS-compatible 300 mm flow, the entire semiconductor industry becomes the quantum fab, and Moore's-law-style volume follows.

## Key players & state of the art (2025–26)
- **imec** (Belgium): the anchor R&D foundry. Ran a 300 mm superconducting-qubit CMOS flow (Nature npj 2024) and, with **Diraq**, produced gate-defined silicon spin qubits at >99% 2Q fidelity from a standard 300 mm line (Nature, 2025) — the strongest evidence to date that foundry-made qubits can hit error-correction-grade fidelity.
- **GlobalFoundries**: manufactures PsiQuantum's Omega **photonic** chipset on 300 mm silicon photonics, and hosts Equal1's cryo-CMOS control in its 22FDX FD-SOI process (`H-cryocmos`) — one commercial fab serving multiple modalities.
- **Intel**: its own 300 mm line makes Tunnel Falls spin-qubit chips with high-volume test infrastructure. **SkyWater** (US) runs quantum/superconducting programs; **national fabs** (SQMS at Fermilab, LPS/US-government lines) and **TSMC-adjacent** research round out capacity. **SQC** patterned 250k-register donor devices with industrial STM/CMOS tooling (2025).

## Key graded claims
- [T2] Error-correction-grade qubits produced from a standard 300 mm industrial flow (spin) — Diraq/imec, Nature (2025) (demonstrated)
- [T2] Commercial 300 mm silicon-photonics fab makes integrated photonic-QC chips — PsiQuantum/GlobalFoundries (demonstrated, component-level)
- [T4] "Foundry compatibility ⇒ Moore's-law-style qubit scaling" — industry thesis (claimed)

## Trade-offs
A merchant foundry buys uniformity, volume, metrology, and yield learning that no lab can match — but it constrains you to the materials and geometries the line already qualifies (no exotic substrates, restricted junction processes), which is exactly where lab-scale coherence records still live (`H-fab`). Retooling a fab for quantum (superconducting films, mK-relevant dielectrics, ²⁸Si, single-photon devices) is expensive and slow, and the volume that justifies it does not exist yet — a chicken-and-egg problem.

## Conflicts / open questions
Does foundry uniformity actually hold across thousands of qubits on a wafer, or does device-to-device spread reappear at scale (the historic silicon-spin killer)? Which modality's foundry bet pays off first — silicon spin (native CMOS), photonics (silicon photonics), or superconducting (needs bespoke films)? Whether a true merchant "quantum foundry" market emerges, or each vendor stays captive to one R&D fab (imec, GF, Intel).

## Sources
PMC11446867 (imec 300 mm superconducting flow); Diraq/imec Nature (2025); PsiQuantum/GlobalFoundries Omega; Intel Tunnel Falls; SQC 250k-register release; postquantum.com silicon-spin + photonic ecosystem analyses.
