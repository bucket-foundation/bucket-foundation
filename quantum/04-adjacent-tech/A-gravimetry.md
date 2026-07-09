# Gravimetry & Inertial Navigation · A-gravimetry
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Cold-atom interferometry: drop or launch a cloud of laser-cooled atoms, split each atom's wavefunction with a sequence of light pulses (a π/2–π–π/2 Mach–Zehnder), and read gravity (or acceleration/rotation) from the accumulated interference phase. Because the atom is the test mass and the laser wavelength is the ruler, the measurement is **absolute and drift-free** — classical spring gravimeters and mechanical/FOG inertial units drift and need recalibration against a reference. Applications: subsurface surveying (voids, tunnels, aquifers, ore, volcano/CO₂-storage monitoring), and drift-free inertial navigation for the GPS-denied problem (`A-pnt`).

## Maturity & real deployments (2025–26)
Early commercial for gravimetry; pre-deployment for navigation.
- **Absolute gravimeters**: **Exail** (ex-Muquans) has sold its **AQG** (Absolute Quantum Gravimeter) for years — including continuous monitoring on Mt Etna. Independent evaluation (Journal of Geodesy 2025) of the AQG-A02/B10 against a reference measured **~500 nm·s⁻²/√Hz sensitivity**, reaching **~10 nm·s⁻² (≈1 µGal) after 1 h integration** with drift-free sub-µGal long-term stability — and notably **no active vibration isolation** (it measures microseismic noise with an accelerometer and compensates on the laser phase).
- **Gradiometry**: the University of Birmingham's cold-atom gravity **gradiometer detected a buried structure in an open field** (Stray et al., Nature 602, 2022) — the landmark proof that differential (gradiometer) measurement cancels vibration noise outdoors, where a single gravimeter is swamped.
- **Navigation**: the hot line. **Q-CTRL's Ironstone Opal** fuses quantum magnetometry/gravimetry with map-matching; airborne trials claim up to **111× better GPS-denied accuracy** than the best conventional alternative and **~4 m over 700 km flights**; a maritime trial logged **144+ hours** unattended at sea (2025–26). **AOSense** cold-atom IMUs target **~5 m/hour** navigation drift without external signals (DARPA PINS lineage). DARPA's **RoQS** funds ruggedization ($24.4M to Q-CTRL); **Lockheed Martin + Q-CTRL** won a March 2025 DoD prototype quantum-INS contract. France (Exail/ONERA) and the UK (Infleqtion, ship/aircraft trials) run parallel programs.

## Key graded claims
- [T2] Exail AQG: ~500 nm·s⁻²/√Hz, ~1 µGal after 1 h, drift-free — independent eval, J. Geodesy 99 (2025); Ménoret et al., Sci. Rep. 2018 (demonstrated)
- [T2] Cold-atom gradiometer located a buried structure in open-field conditions — Stray et al., Nature 602 (2022) (demonstrated)
- [T3] Cold-atom IMU ~5 m/hour navigation drift, unaided — AOSense / DARPA PINS (demonstrated, program-level)
- [T4] Ironstone Opal: GPS-denied navigation up to 111× better than conventional, ~4 m over 700 km — Q-CTRL, 2025 (claimed, vendor field trials)

## Conflicts / open questions
- **No independent benchmark for the nav claims**: quantum-INS vendor numbers are self-reported field trials; there is no peer-reviewed head-to-head against classified military-grade ring-laser-gyro/FOG INS.
- **SWaP and dynamics** are the wall between trials and fleet use: size/weight/power, and robustness to vibration and hard maneuvers (a launched atom cloud dislikes a jinking aircraft). Gravimeters mostly measure stationary or slow platforms; strapdown atom-interferometer accelerometers/gyros for full 6-DoF navigation on a moving platform are the harder, less-mature problem.

## The honest call
**Gravimetry is a real, shipping instrument** (Exail sells them; independent labs verify the µGal numbers). **Quantum inertial navigation is not yet fielded** — it is in well-funded DoD prototyping with impressive but unverified trial claims, gated by SWaP and dynamic robustness. Split the two: survey gravimeters = commercial; GPS-denied quantum nav = advanced R&D nearing deployment (see `A-pnt`).

## Sources
- https://link.springer.com/article/10.1007/s00190-025-01995-x (independent Exail AQG evaluation, 2025)
- https://q-ctrl.com/blog/q-ctrls-new-maritime-quantum-navigation-solution-successfully-undergoes-first-defense-trials-at-sea
- Stray et al., "Quantum sensing for gravity cartography," Nature 602 (2022)
- https://aosense.com/ (cold-atom IMU / gradiometer)
