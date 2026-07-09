# Photonic qubits · H-photonic
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Qubits encoded in light — single photons (dual-rail, path, polarization, time-bin) or continuous-variable squeezed states (see `A-squeezed`). Computation interferes photons in integrated waveguide circuits (thin-film lithium niobate, silicon, or silicon-nitride) and measures them; the leading architecture is measurement-based **fusion** computation, where small entangled resource states are stitched into a large cluster state by probabilistic fusion gates. Photons barely decohere and travel telecom fiber, so networking is native and much of the machine runs warm — the catch is that photons do not interact, so gates are probabilistic, and **photon loss** is the dominant error. The modality leans on two other hardware nodes: deterministic photon sources (`H-photonsource`) and near-unity single-photon detectors (`H-detect`).

## Key players & state of the art (2025–26)
- **PsiQuantum**: Omega chipset (Feb 2025) manufactured at GlobalFoundries on 300 mm silicon photonics — single-photon sources, fusion-gate circuits, and cryogenic detectors integrated with chip-to-chip qubit interconnects. $1B Series E at $7B valuation (Sep 2025); ~$1B utility-scale datacenter build-outs announced for Brisbane and Chicago (Mar 2026). Bets on million-qubit fault tolerance, skipping NISQ entirely.
- **Xanadu**: Aurora (Jan 2025) — modular networked photonic computer: 12 qubits across 35 photonic chips + 13 km fiber, room-temperature apart from cryogenic detectors; uses GKP/CV encoding. IPO'd on Nasdaq/TSX Mar 2026 (~$302M raised). Earlier Borealis showed programmable Gaussian-boson-sampling advantage (Nature 2022).
- **QuiX Quantum** (Netherlands): €15M Series A to ship a first-generation ~8-qubit *universal* single-photon computer in 2026, on silicon-nitride chips. **ORCA Computing** (UK): PT-series time-bin/boson-sampling systems in national labs, fiber-based, rack-mounted. **TundraSystems** (UK) and **Quandela** (see `H-photonsource`) round out the field.

## Key graded claims
- T3 Omega chipset with integrated fusion + wafer-scale fab at GlobalFoundries — PsiQuantum (2025) (demonstrated, component-level)
- T4 Aurora: first scalable networked modular photonic QC — Xanadu press (claimed)
- T2 Gaussian-boson-sampling advantage (Borealis) — Xanadu, Nature (2022) (demonstrated, advantage contested by later classical algorithms)
- T6 Million-qubit photonic FTQC in datacenter form by late decade — PsiQuantum (roadmap)

## Trade-offs (vs other modalities)
Room-temperature circuits, native fiber networking, and reuse of the telecom/CMOS-photonics supply chain; against that, gates are probabilistic (fusion succeeds ~50%, so massive multiplexing and fast switching are required), photon loss compounds along every waveguide and coupler, detectors still need cryogenics (2–4 K), and no photonic machine has run a meaningful gate-based algorithm at scale. The loss budget for million-photon operation is unproven end-to-end.

## Conflicts / open questions
Fusion-based FTQC has no intermediate-scale public benchmark — the approach is close to all-or-nothing, so there is little early signal to grade against a roadmap. Whether deterministic, indistinguishable single-photon sources and low-loss switches arrive fast enough to close the loss budget is the field's binding question (see `H-photonsource`, `H-detect`).

## Sources
psiquantum.com/news (Omega); xanadu.ai press (Aurora) + Nature 606 (Borealis, 2022); quixquantum.com Series A; Optica OPN photonics roadmap (Jun 2025); The Quantum Insider.
