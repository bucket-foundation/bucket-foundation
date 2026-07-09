# Quantum-limited amplifiers (JPA / TWPA / HEMT) · H-paramp
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Reading out a superconducting qubit means measuring a microwave signal carrying, on average, a fraction of a photon — buried in thermal and amplifier noise. A **quantum-limited parametric amplifier** at the mixing-chamber stage (~10 mK) boosts that signal while adding the minimum noise quantum mechanics allows (half a photon for phase-insensitive gain), *before* the signal reaches the noisier high-electron-mobility-transistor (**HEMT**) amplifier at the 4 K stage and the room-temperature electronics (`H-control`). Without this first amplifier, single-shot dispersive readout — telling |0⟩ from |1⟩ in one measurement, fast enough for real-time QEC — is impossible. Two architectures dominate: the resonator-based **Josephson parametric amplifier (JPA)** (high gain, narrow band) and the **Josephson traveling-wave parametric amplifier (TWPA/JTWPA)** (near-quantum-limited over a wide band, enabling frequency-multiplexed readout of many qubits on one line).

## Key players & state of the art (2025–26)
- The canonical readout chain: a near-quantum-limited JPA or TWPA at 10 mK → a HEMT (~2–4 K, adding a few photons) → room-temperature amplifiers. TWPAs deliver high gain over GHz bandwidths at ~1 added photon, letting a single line read out many frequency-multiplexed qubits — the reason they matter for scaling.
- 2025 advances: low-intrinsic-loss coplanar lumped-element JTWPAs (arXiv:2503.07559); inverse-Kerr phase-matching for flatter gain (arXiv:2507.17039); in-operando S-parameter-calibrated characterization (APL 2024); two-mode-squeezing schemes that push readout fidelity past the standard quantum limit (arXiv:2603.15804).
- Suppliers/developers: academic groups (Berkeley/Siddiqi lineage, Chalmers, NIST), plus vendors bundling TWPAs into readout stacks (Silent Waves' "Argo" TWPA, Raytheon/Lincoln Lab, and control-vendor integrations). HEMTs come chiefly from **Low Noise Factory** (Sweden).

## Key graded claims
- T1 A phase-insensitive linear amplifier must add ≥ ½ photon of noise (standard quantum limit) — Caves theorem, established
- T2 JTWPAs provide near-quantum-limited gain over GHz bandwidth, enabling multiplexed single-shot readout — Science aaa8525 + follow-ons (demonstrated)
- T3 Two-mode-squeezed readout beats the SQL for qubit measurement — arXiv:2603.15804 (demonstrated, lab-scale)

## Trade-offs
JPAs give the cleanest noise but narrow bandwidth and low saturation power (few qubits per amp); TWPAs trade a little noise for wide bandwidth and higher saturation power (many qubits per line) at the cost of a long, fabrication-sensitive Josephson transmission line. The HEMT is unavoidable but sits at 4 K and its power dissipation and noise both scale with channel count — another line-count pressure feeding the `H-cryocmos` and `H-cryo` bottlenecks.

## Conflicts / open questions
Can TWPA fabrication yield and uniformity reach the level needed to read out thousands of qubits without per-device tuning? Do parametric amplifiers get absorbed into cryo-CMOS readout, or stay a distinct superconducting-component layer? Photon-number-resolving and directional (nonreciprocal) amplifiers that drop the bulky isolators are a live front.

## Sources
Science aaa8525 (near-quantum-limited JTWPA); arXiv:2503.07559, 2507.17039, 2603.15804; AIP APL 125/104001 (in-operando calibration); Low Noise Factory HEMT datasheets.
