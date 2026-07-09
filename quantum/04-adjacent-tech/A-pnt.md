# Assured PNT / GPS-denied navigation · A-pnt
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3, new node)

## What it is
**Assured Positioning, Navigation, and Timing** is the *system-level* problem of knowing where and when you are without GPS/GNSS — because GNSS is jammable, spoofable, and unavailable underwater, underground, indoors, and in contested airspace. This node exists because the quantum answer to that problem is not one sensor but a **fusion**: a drift-free timing source (optical/atomic clock, `A-clocks`), a drift-free inertial reference (cold-atom accelerometers/gyros, `A-gravimetry`), and a map-matching field reference (quantum magnetometry, `A-magneto`; NV vector magnetometry, `A-nvsensing`). Previously this was smeared across the gravimetry, magnetometry, and clock cards; A-pnt is the integration layer where they combine into a navigation solution. The core physics payoff: a quantum clock plus a quantum IMU lets you *dead-reckon* accurately for hours, and a magnetic/gravity map lets you *fix* your absolute position against Earth's own signatures — neither of which an adversary can jam.

## Maturity & real deployments (2025–26)
**Advanced R&D nearing deployment — well-funded, defense-led, not yet fielded at fleet scale.**
- **Fusion navigators**: **Q-CTRL's Ironstone Opal** is the most public — magnetic + gravity map-matching with ML, claiming up to **111× better GPS-denied accuracy** than the best conventional alternative, **~4 m over 700 km** airborne, and **144+ hours** unattended at sea (2025–26); TIME Best Inventions 2025. **SandboxAQ's AQNav** does AI + magnetic-anomaly navigation and has flown on multiple aircraft types.
- **Quantum IMUs**: **AOSense** cold-atom inertial units target **~5 m/hour** drift unaided (the DARPA PINS lineage) — vs a conventional tactical IMU that can drift kilometers in the same time.
- **Timing anchor**: **Infleqtion's Tiqker** optical clock deployed on the **Royal Navy XV Excalibur** uncrewed submarine (Oct 2025) — a holdover timing source for a platform that cannot surface for GPS.
- **Programs**: DARPA **Robust Quantum Sensors (RoQS)** (ruggedization; $24.4M to Q-CTRL), DARPA **PINS** (precision inertial nav), the DIU, and a March 2025 **Lockheed Martin + Q-CTRL** prototype quantum-INS contract. A 2036 PNT-stack forecast keeps clocks dominant (~76%) with quantum IMUs reaching ~18% as they progress to platform integration (helicopter, maritime, space).

## Key graded claims
- T4 Ironstone Opal: up to 111× better GPS-denied accuracy, ~4 m over 700 km, 144+ h at sea — Q-CTRL field trials, 2025 (claimed)
- T3 Cold-atom IMU ~5 m/hour unaided navigation drift — AOSense / DARPA PINS (demonstrated, program-level)
- T3 Optical clock (Tiqker) deployed as holdover timing on an uncrewed submarine — Infleqtion / Royal Navy, Oct 2025 (demonstrated)
- T5 Quantum PNT market shifts toward clocks-dominant + ~18% quantum-IMU stack by 2036 — analyst forecast (forecast)

## Conflicts / open questions
- **No independent benchmark against black-program INS.** Every headline number is a vendor field trial against a specified (often unnamed) baseline; classified military ring-laser/FOG INS performance is the real comparator and it is not public.
- **Fusion is the hard part**: individual quantum sensors work, but robustly combining a jittery atom-interferometer IMU, a map-matching magnetometer (which needs a good, current, classified magnetic map), and a clock into one resilient solution on a maneuvering platform is a systems problem, not a physics one.
- **SWaP + dynamics**: launched atom clouds dislike vibration and hard turns; shrinking the whole stack to fit a drone or missile, not just a ship, is unsolved.

## The honest call
**The most strategically important integration story in quantum sensing, and the reason the defense money is flowing — but it is prototyping, not deployment.** The pieces (clock, IMU, magnetometer) are individually real; the fused, ruggedized, independently-benchmarked GPS-denied navigator on a fleet of moving platforms does not yet exist in the open literature. Grade A-pnt as "advanced R&D nearing first operational deployments," with the flashiest accuracy multipliers unverified.

## Sources
- https://spaceinsider.tech/2026/04/10/quantum-sensing-for-pnt-nears-deployment/ (Tiqker on XV Excalibur; market split)
- https://q-ctrl.com/blog/2025-year-in-review-realizing-true-commercial-quantum-advantage-in-the-international-year-of-quantum (Ironstone Opal)
- https://www.darpa.mil/news/features/quantum-sensing-computing (RoQS / PINS)
- https://link.springer.com/article/10.1007/s10291-026-02030-y (quantum sensors for PNT, review)
