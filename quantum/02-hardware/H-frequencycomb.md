# Optical frequency combs · H-frequencycomb
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
An optical frequency comb is a laser whose spectrum is a set of perfectly evenly spaced sharp lines — a ruler for light. It coherently links optical frequencies (~hundreds of THz) to microwave frequencies (GHz) that electronics can count, which is what lets an optical atomic clock (`A-clocks`) actually output a usable signal, and what lets many stabilized laser tones in an atomic quantum computer share one absolute reference. The 2005 Nobel-winning technology (Hänsch/Hall) is shared infrastructure that sits under three otherwise separate nodes: **clocks** (`A-clocks`), **time/frequency transfer** (`A-timedist`), and **laser subsystems** for ion/atom machines (`H-lasers`). The frontier is shrinking a lab-bench mode-locked comb onto a chip.

## Key players & state of the art (2025–26)
- **Chip-scale microcombs (Kerr combs)**: Kerr-nonlinear microresonators (silicon nitride, on-chip) generate soliton combs at CMOS-compatible scale, replacing rack-sized mode-locked-laser combs. A Feb 2025 Nature Photonics result used a **Vernier dual-microcomb** scheme to divide a stabilized ~871 nm clock laser down to a countable ~235 MHz output — the key step toward a fully integrated optical clock.
- **NIST** and academic groups (Caltech, EPFL, Purdue, Chalmers) drive the physics; **Vescent**, **Menlo Systems**, **TOPTICA**, and **IMRA** supply commercial combs. NIST has demonstrated chip-scale atomic clocks and chip-scale optical frequency synthesizers at ~10⁻¹⁶ relative uncertainty.
- **Direction**: integrate the dual comb, pump laser, on-chip heaters/tuning, and spectral filters onto a single die — the enabling piece for μPNT (micro positioning/navigation/timing) and portable optical clocks (`A-pnt`).

## Key graded claims
- T2 Vernier dual-microcomb optical frequency division of a stabilized clock laser — Nature Photonics s41566-025-01617-0 (2025) (demonstrated)
- T2 Chip-scale optical frequency synthesizer at 2.7×10⁻¹⁶ relative uncertainty — Science Advances (established/demonstrated)
- T1 Frequency combs coherently link optical and microwave frequencies — established (2005 Nobel)

## Trade-offs
Bench mode-locked-laser combs are mature, low-noise, and turnkey but rack-sized and power-hungry. Microcombs promise mass-manufacturable, low-SWaP combs on a chip but currently struggle with octave-spanning bandwidth (needed for self-referencing), spectral flatness, and turnkey soliton initiation. Which you pick trades performance against integration — the same tension running through `H-lasers`.

## Trade-offs / why it's its own node
Because a comb is shared plumbing under clocks, timing networks, and atomic-computer lasers, keeping it as a separate node avoids duplicating the same hardware story three times across `A-clocks`, `A-timedist`, and `H-lasers`. Improvements here propagate to all of them at once.

## Sources
Nature Photonics s41566-025-01617-0 (Vernier microcombs, 2025); Science Advances (chip-scale synthesizer); NIST optical-frequency-combs program page; Laser Focus World (microcomb clocks, 2025); arXiv:2602.05151, 2512.05005.
