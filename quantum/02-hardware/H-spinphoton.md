# Spin-photon interfaces — T-centers, SiV/SnV, rare-earth emitters · H-spinphoton
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
The physical component that lets a stationary matter qubit (an electron or nuclear **spin**) emit a **photon** whose state — polarization, time-bin, or frequency — is entangled with the spin. That single-emitter primitive is what turns an isolated qubit into a network node: interfere photons from two remote emitters, herald on a detector click, and the two distant spins are entangled (the heralded-entanglement protocol under `F-teleport`, the building block of modular QC `H-intercon` and the quantum internet `A-qinternet` / repeaters). Unlike microwave↔optical transduction (`H-transduce`), which frequency-converts a photon with no memory attached, and unlike deterministic photon sources for photonic computing (`H-photonsource`), which want indistinguishable photons but no long-lived spin, a spin-photon interface must deliver **both** a coherent optical transition and a spin qubit that outlives many entanglement attempts.

The hard figures of merit: the **zero-phonon-line fraction** (Debye–Waller factor — how much emission lands in the coherent, interference-usable line rather than the phonon sideband), photon **indistinguishability**, spin **coherence** $T_2$, emission **wavelength** (telecom O/C-band beats visible for fiber reach), and the resulting remote-entanglement **rate × fidelity**. Nanophotonic cavities rescue weak emitters via the Purcell effect, $F_P = \frac{3}{4\pi^2}\left(\frac{\lambda}{n}\right)^3 \frac{Q}{V}$, funnelling emission into the ZPL and raising cooperativity $C = g^2/(\kappa\gamma)$ toward the deterministic-interface regime.

## Key players & state of the art (2025–26)
- **Silicon T-centers** (Photonic Inc., Canada): spin-photon interface native to silicon, emitting at telecom **1326 nm** — CMOS-foundry-compatible and fiber-ready; distributed entanglement between modules demonstrated, roadmap ~200 kHz remote-entanglement rate at 99.8% fidelity (see `H-intercon`).
- **Group-IV diamond color centers** — **SiV / SnV** (Harvard/Lukin, QuTech, academic + Quantum Brilliance-adjacent): cavity-coupled SiV memory nodes and **tin-vacancy** centers combine a strong ZPL with better spin coherence than the NV (`H-nv`); high-fidelity spin-photon entanglement in nanophotonic cavities.
- **Rare-earth ions** — **erbium** in silicon or Y₂SiO₅: telecom **1.5 µm** emission and exceptional coherence, but weak dipoles that require strong cavity Purcell enhancement to emit usefully.
- **Quantum dots**: brightest, most indistinguishable photons, but short spin coherence and spectral diffusion limit them as memory nodes (they excel as sources instead — `H-photonsource`).

## Key graded claims
- [T3] Telecom-band (1326 nm) silicon T-center spin-photon entanglement, foundry-compatible — Photonic Inc. (demonstrated; rate/fidelity targets still roadmap)
- [T2/T3] Cavity-enhanced SiV/SnV spin-photon entanglement at high fidelity in diamond nanophotonics — Harvard/QuTech (demonstrated in lab)
- [T4] 200 kHz / 99.8% remote entanglement over telecom fiber — company target (roadmap)

## Trade-offs
Every candidate trades brightness against coherence against wavelength. Diamond centers give clean optics and good spin memory but need exotic fabrication and mostly emit in the visible; T-centers and erbium reach telecom fiber but start dim and lean on cavities; quantum dots are bright but forgetful. No single emitter yet wins all axes at once — which is why this is a distinct node rather than a footnote to `H-silicon` (electrically-controlled spin *compute*) or `H-nv` (NV sensing/compute). The spin-photon interface is the emitter node that makes matter-qubit networking possible at all.

## Conflicts / open questions
Which emitter reaches deterministic, high-rate, high-fidelity, telecom-band operation first — and does cavity integration (`H-photonsource`, `H-package`) hold coherence while boosting brightness? Whether spin-photon links can stay above the entanglement-distillation threshold across real fiber decides if matter-qubit modality networks natively and sidesteps the microwave-transduction wall (`H-transduce`) that superconducting machines face.

## Sources
Photonic Inc. T-center networking releases; Harvard/Lukin SiV cavity-QED memory-node papers (Nature/Science 2020–25); SnV spin-photon results (Nature Physics/PRX 2024–26); erbium-in-silicon single-photon emission (Nature 2024–26). Cross-links: `H-silicon`, `H-nv`, `H-photonsource`, `H-transduce`, `H-intercon`, `A-qinternet`, `F-teleport`, `H-detect`.
