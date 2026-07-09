# Squeezed light as a cross-cutting resource · A-squeezed
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Squeezed light is a quantum state of an optical field where the uncertainty in one quadrature is pushed below the vacuum (shot-noise) limit, at the cost of more uncertainty in the conjugate one — Heisenberg's bound rearranged, not beaten (see `F-uncertainty`). It is a genuine cross-cutting quantum resource: it sharpens metrology below the standard quantum limit, and it is the *substrate* for continuous-variable photonic quantum computing. Squeezing strength is quoted in decibels below shot noise; more dB means a better resource, bounded in practice by optical loss.

## Maturity & real deployments (2025–26)
- **LIGO / Virgo — the flagship production use.** Squeezed vacuum is injected into the interferometer dark port to cut quantum shot noise every observing run. In O3, Hanford measured ~2.0 dB and Livingston ~2.7 dB of shot-noise reduction, raising the detection rate ~40–50%. O4 uses **frequency-dependent squeezing** (a filter cavity) to squeeze the right quadrature across the band — the first at-scale deployment of a technique that reduces both shot noise and radiation-pressure noise. This is the clearest case of a quantum resource doing paid work daily.
- **Xanadu — squeezing as compute.** Its photonic machines encode GKP bosonic qubits in squeezed states via optical parametric oscillators; the Aurora system (2025) networks 35 photonic chips over 13 km of fiber, and Xanadu demonstrated on-chip GKP-state generation on 300 mm silicon-nitride wafers (June 2025).
- **Integrated squeezing** is advancing fast: 18 dB squeezing / 20 dB anti-squeezing at 1570 nm demonstrated in a thin-film lithium-niobate waveguide — the highest for any integrated photonic platform.

## Key graded claims
- T2 LIGO uses squeezed light in production to boost sensitivity ~40–50% via shot-noise reduction — Phys. Rev. X 13, 041021 (established/demonstrated)
- T3 18 dB on-chip squeezing in TFLN waveguide — arXiv 2025 (demonstrated)
- T3 On-chip GKP states from squeezed light on 300 mm wafers — Xanadu, June 2025 (demonstrated)

## Conflicts / open questions
Squeezing is loss-limited: every lost photon degrades it toward vacuum, so end-to-end optical efficiency caps usable dB — the same wall that gates continuous-variable photonic QC. The gap between the ~18–20 dB generated on-chip and the ~2–3 dB LIGO actually uses in production is *all loss* (mirrors, mode-matching, the km-scale interferometer). Whether squeezing-based (CV/GKP) architectures reach fault tolerance before discrete-photon ones is open (`H-photonic`, `O-roomtemp`).

## The honest call
**The clearest case in the whole manual of a quantum resource doing paid work every day** — LIGO/Virgo inject squeezed vacuum on every observing run and it demonstrably raises the detection rate ~40–50%, which is why more gravitational-wave events get caught. That is established, deployed, and reproduced. The compute use (CV/GKP photonic QC, Xanadu) is real hardware progress but still research: on-chip GKP generation and a 35-chip networked machine are demonstrations, not fault tolerance. So: sensing use = production; compute use = frontier.

## Sources
Phys. Rev. X 13, 041021 (frequency-dependent squeezing at LIGO); arXiv:2202.00847 (Advanced LIGO O4 review); arXiv:2603.02744 (12–18 dB waveguide squeezing); thequantuminsider.com 2025/06/05 (Xanadu Aurora / on-chip GKP).
