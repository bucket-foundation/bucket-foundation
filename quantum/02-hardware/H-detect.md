# Single-photon detectors / SNSPDs · H-detect
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Photonic quantum computing, QKD, and much of quantum networking rest on detecting one photon at a time — fast, with near-unity efficiency and near-zero false counts. The dominant technology is the **superconducting nanowire single-photon detector (SNSPD)**: a current-biased superconducting nanowire (NbN, NbTiN, WSi, MoSi) held just below its critical current, where a single absorbed photon breaks superconductivity locally, forces the current to divert, and produces a measurable voltage spike. As of 2026 the SNSPD is the fastest and most efficient single-photon detector available, outperforming avalanche photodiodes (SPADs) and transition-edge sensors (TES) on efficiency, jitter, and dark counts at once. It is the emitter's counterpart (`H-photonsource` makes the photons; SNSPDs catch them) and a quiet load-bearing chokepoint: photonic QC and QKD scale no faster than their detector supply.

## Key players & state of the art (2025–26)
- **Single Quantum** (Netherlands): multi-pixel free-space arrays; a 6×6 NbTiN array built for the NASA/JPL Psyche deep-space optical-comms terminal, >50% system efficiency at 1550 nm, <15 ns per-pixel dead time.
- **ID Quantique** (Switzerland): ships the **ID281** and **ID281 Pro** turnkey SNSPD systems in closed-cycle cryostats; used in QKD and lab research; parallel-nanowire photon-number resolution.
- **Photon Spot** (US): turnkey SNSPD systems and cryostats, common in US labs. Others: **Quantum Opus**, **Scontel**, **Photec**.
- **State of the art**: system detection efficiency demonstrated >99%; dark-count rates ~0.25 counts/hour; timing jitter <3 ps; recovery ~500 ps (giving ~100s of MHz count rates). Large-area devices now reach mid-infrared (to ~7.4 µm). Waveguide-integrated SNSPDs on the same chip as the photonic circuit are the scaling path.

## Key graded claims
- T2 SNSPD system detection efficiency >99% with picosecond jitter and sub-Hz dark counts — peer-reviewed device papers (demonstrated)
- T2 6×6 SNSPD array flown for NASA Psyche deep-space optical comms — SPIE 2025 / Single Quantum (demonstrated)
- T1 SNSPDs are the fastest/most-efficient single-photon detectors as of 2026 — review literature (established)

## Trade-offs
SNSPDs need a cryostat (~1–3 K, a smaller cooler than a dilution fridge but still a system-cost and integration burden) versus room-temperature SPADs, which are cheaper but far noisier and slower. Scaling to the thousands-to-millions of pixels a PsiQuantum/Xanadu-class machine needs strains cryogenic wiring and readout (links to `H-control`, `H-cryocmos`, `H-paramp`). Photon-number resolution — telling one photon from two — remains hard and is a live research front (parallel nanowires, TES hybrids).

## Conflicts / open questions
Can SNSPD arrays scale to the pixel counts fusion-based photonic FTQC needs without a cryogenic-wiring blowup that recreates the superconducting-QC wiring problem? Does monolithic on-chip integration of detectors with the photonic circuit arrive before detector supply becomes the binding constraint on the whole modality?

## Sources
Wikipedia SNSPD; Nature Light: Science & Applications s41377-023-01374-1; Science Advances adt0502; idquantique.com (ID281 Pro); ADS 2025SPIE13699E; arXiv:2101.05407.
