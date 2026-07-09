# Laser & photonics subsystems · H-lasers
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Trapped-ion, neutral-atom, and NV-diamond machines are, physically, laser instruments. They need many stabilized laser tones — for trapping/cooling, Rydberg excitation, qubit-state manipulation, repumping, and readout — each at the right wavelength with sub-kHz linewidth, mode-hop-free tuning, and long-term frequency stability locked to an optical reference (increasingly an optical frequency comb, see `H-frequencycomb`). As atomic machines scale from tens to thousands of atoms, the laser subsystem becomes the dominant cost, footprint, and reliability risk — the atomic-modality analog of superconducting wiring. It is an arms-supplier layer: a handful of photonics vendors sit quietly under most atomic/ionic quantum computers, and the push is toward low-SWaP (size, weight, power) modules and photonic integrated circuits (PICs).

## Key players & state of the art (2025–26)
- **TOPTICA Photonics** (Germany): the dominant supplier of tunable diode-laser systems and frequency-stabilized references; serves virtually every major neutral-atom and ion lab and commercial system.
- **M Squared Lasers** (UK): high-performance Ti:sapphire and frequency-stabilized systems used for Rydberg excitation (the demanding blue/UV tones).
- **Vescent** (US): precision diode lasers, frequency combs, and servo/lock electronics widespread in atomic physics. Trapping power: **IPG Photonics**, **NKT Photonics**.
- **PIC integration**: IonQ + imec are developing photonic integrated circuits to route and deliver laser light on-chip for ion machines (2025), the same bet neutral-atom vendors are making — replacing free-space beam paths with waveguides to kill drift and shrink the footprint.

## Key graded claims
- [T1] Neutral-atom/ion machines require multiple sub-kHz-linewidth stabilized laser tones — atomic physics literature (established)
- [T4] TOPTICA/M Squared supply the Rydberg-excitation lasers for most neutral-atom systems — supply-chain analyses (claimed/reported)
- [T3] Photonic integrated circuits can shrink ion-machine laser delivery (IonQ × imec) — 2025 collaboration (roadmap/early)

## Trade-offs
Free-space bulk-optics laser tables give the best performance but do not scale — large, drift-prone, labor-intensive to align, and sensitive to vibration and temperature. PIC integration promises SWaP and manufacturability but currently trades away optical power and linewidth, especially at the blue/UV wavelengths ion qubits need. Laser reliability (diode lifetime, lock stability) directly bounds machine uptime: a single unlocked tone can halt the whole processor mid-computation.

## Conflicts / open questions
Does laser delivery integrate onto chips fast enough to keep pace with atom-count roadmaps (`H-neutral`, `H-ion`), or does the optics table become the scaling wall for atomic modalities the way wiring is for superconducting ones? Blue/UV PIC materials and on-chip high-power delivery are the specific unsolved pieces.

## Sources
toptica.com (quantum technologies / LASER 2025); globenewswire.com 2025/07/08 (neutral-atom market, Toptica/Hamamatsu); postquantum.com (neutral-atom supply chain); ionq.com/news (IonQ × imec PICs); arXiv:2304.08402.
