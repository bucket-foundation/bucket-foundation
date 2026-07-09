# Quantum Sensing & Metrology · A-sensing
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Using quantum systems — atomic transitions, spin states, entanglement, squeezing — as measurement instruments. The same fragility that plagues qubits (`F-decoher`) becomes the product: a state that decoheres at the slightest field perturbation is an exquisite detector of that field. This card is the **overview node** for the sensing cluster: clocks (`A-clocks`), magnetometry (`A-magneto`), gravimetry/inertial (`A-gravimetry`), imaging (`A-imaging`), NV-diamond (`A-nvsensing`), Rydberg RF (`A-rydberg`), and the assured-PNT integration (`A-pnt`). The unifying physics: interferometric phase readout at or below the standard quantum limit, where signal scales with coherence time and entanglement can push sensitivity toward the Heisenberg limit (∝1/N rather than 1/√N).

## Maturity & real deployments (2025–26)
**The nearest-term commercial quantum technology — revenue exists today, unlike compute.** Chip-scale atomic clocks have shipped for over a decade; LIGO has run squeezed light in production since 2019 (`A-squeezed`); OPM magnetometers sell into neuroimaging (`A-magneto`). The 2024–26 wave is **quantum navigation** for the GPS-denied problem:
- **Q-CTRL's Ironstone Opal** (magnetic/gravity map-matching + AI) ran air, land, and maritime defense trials, claiming up to **~100–111× better GPS-denied accuracy** than the best conventional INS and **~4 m positioning over 700 km flights**; a maritime trial logged **144+ hours** unattended at sea (2025–26). It made TIME's Best Inventions 2025.
- **SandboxAQ's AQNav** does AI + magnetic-anomaly navigation; both companies hold US DoD contracts (DARPA RoQS — $24.4M to Q-CTRL; Lockheed Martin/Q-CTRL prototype quantum-INS award, March 2025).
- **Medical**: OPM-MEG helmets in clinical trials, SandboxAQ/Mayo CardiAQ cardiac sensing (`A-magneto`).

**Market**: analysts put quantum sensors at roughly **$0.4–0.9B in 2025** growing **~15–23% CAGR** to ~$1.5B by the mid-2030s (Fortune Business Insights and peers). Small but real and mostly defense-led — a 2036 forecast has clocks still dominant (~76% of the PNT-sensing stack) with quantum IMUs reaching ~18%.

## Key graded claims
- T1 Quantum-limited metrology (squeezing, entanglement-enhanced sensitivity) beats classical shot-noise limits — LIGO squeezed-light operation, PRL 2019+ (established)
- T4 Ironstone Opal delivers ~4 m accuracy over 700 km flights, up to 111× better than best conventional alternative — Q-CTRL announcements 2025 (claimed, awaiting independent verification)
- T5 Quantum sensors market ~$435M (2025) → ~$1.5B (2034), ~15% CAGR — Fortune Business Insights (forecast)

## Conflicts / open questions
- **Vendor navigation numbers are self-reported field trials.** No peer-reviewed head-to-head against classified military-grade ring-laser/fiber-optic INS is public — the "111×" is against a specified baseline, not the state of the art in a black program.
- **The label problem**: where is the line between "quantum sensor" and mature atomic physics (MRI, cesium clocks, SQUIDs all predate the "quantum tech" branding)? Marketing stretches "quantum" to anything using atoms — grade accordingly, and see the per-modality cards for the honest split.

## The honest call
**The revenue-bearing corner of quantum technology, and the one most likely to matter this decade** — but the fielded wins are concentrated in defense PNT and neuroimaging, and the flashiest navigation claims still lack independent benchmarks. Treat sensing as "real and shipping in niches," with the per-modality cards carrying the exact numbers and the honest maturity call.

## Sources
- https://q-ctrl.com/blog/2025-year-in-review-realizing-true-commercial-quantum-advantage-in-the-international-year-of-quantum
- https://spaceinsider.tech/2026/04/10/quantum-sensing-for-pnt-nears-deployment/
- https://thequantuminsider.com/2026/04/10/overview-15-plus-key-quantum-companies-2026/
- https://www.fortunebusinessinsights.com/quantum-sensors-market-110331
