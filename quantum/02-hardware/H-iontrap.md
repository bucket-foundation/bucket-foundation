# Ion-trap chip fabrication (surface traps) · H-iontrap
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
The trapped-ion modality (`H-ion`) has quietly migrated from macroscopic four-rod blade traps to **microfabricated surface-electrode traps**: a planar silicon or glass chip patterned with dozens to hundreds of gold or aluminum electrodes whose shaped RF and DC fields levitate a chain of ions ~50–100 µm above the surface, in ultra-high vacuum (`H-uhv`). The chip *is* the processor. Modern designs carve the surface into functional **zones** — storage (long chains wait), gate (2–4 ions isolated for entangling operations), junctions (X/Y intersections to shuttle ions between zones), and readout (fluorescence collection) — the QCCD architecture that lets ion machines grow past a single chain. Integrating optics (waveguides, grating couplers, on-chip photodetectors) and control electronics into the trap chip is the current fabrication frontier.

## Key players & state of the art (2025–26)
- **Sandia National Laboratories**: the reference research foundry. Its **High Optical Access (HOA)** platform (Phoenix, Peregrine traps) gives good laser access skimming the surface; the "Enchilada" trap stores up to ~200 ions across a branched layout — among the most complex surface traps ever fabricated. Sandia supplies traps to much of the US government-funded ion community.
- **Honeywell / Quantinuum**: the Helios QCCD trap chip (Nov 2025, 98 qubits at 99.921% 2Q — see `H-ion`) was fabricated in Honeywell's MEMS/microfabrication facility, a rare vertically integrated trap-fab-to-computer pipeline.
- **Infineon** (with academic partners) fabricates ion-trap chips at scale; **Oxford Ionics** (now IonQ) builds electronic (integrated-electrode) traps for laser-free gates. Sandia's TICTOC program integrates photonics onto trap chips for compact ion clocks.

## Key graded claims
- T2 Microfabricated surface-electrode traps run multi-zone QCCD processors at record fidelity — Helios/Honeywell + Sandia literature (demonstrated)
- T2 Branched surface traps store ~200 ions with multiple junctions — Sandia Enchilada (demonstrated)
- T3 On-chip integrated photonics for laser delivery/readout in trap chips — Sandia TICTOC + academic demos (early)

## Trade-offs
Surface traps trade the deep, symmetric confinement of blade traps for lithographic scalability, multi-zone layouts, and integrable optics/electronics. The cost: ions sit close to a surface, so **anomalous heating** from surface electric-field noise is worse (it scales steeply with ion-electrode distance), degrading gate fidelity unless the surface is cryogenically cooled or carefully treated. Junction shuttling adds motional heating and time overhead. Fabrication uniformity and dielectric charging are yield issues.

## Conflicts / open questions
Can integrated photonics and control deliver every laser tone and readout on-chip fast enough to remove the external optics table (`H-lasers`) that otherwise bounds scaling? Does anomalous surface heating cap how small and dense trap electrodes can go? Whether commercial trap fabrication moves to a merchant-foundry model (like CMOS) or stays captive to Sandia/Honeywell/Infineon.

## Sources
Sandia HOA / Enchilada trap literature; arXiv:2009.02398 (Phoenix/Peregrine); Quantinuum Helios (Honeywell fab); postquantum.com trapped-ion ecosystem; Sandia TICTOC project page; arXiv:1008.0990 (surface-trap demonstration).
