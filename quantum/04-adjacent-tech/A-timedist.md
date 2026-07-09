# Quantum/optical time-transfer networks · A-timedist
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Distinct from the clocks themselves (`A-clocks`): this node is the **network problem** of comparing and distributing ultra-stable time and frequency between distant clocks without degrading their accuracy. Optical clocks are now so good (~19 decimal places) that ordinary GPS/satellite time links are the limiting error, not the clocks. So a parallel infrastructure is being built — stabilized optical fiber links, free-space laser links, and frequency-comb transfer — that carries an optical clock's stability across cities and countries. This is the plumbing without which the **redefinition of the SI second** cannot happen: BIPM's roadmap requires multiple optical standards in different countries to agree, which means comparing them, which means time transfer.

## Maturity & real deployments (2025–26)
- **International optical-clock comparison across six countries** reported June 2025 — a coordinated cross-border measurement, the largest step yet toward a global optical timescale.
- **Deployed multicore-fiber transfer**: ultrastable optical signals sent through installed multicore fiber alongside live telecom traffic, reaching fractional instability ~3×10⁻¹⁹ over nearly 3 hours (Optica, 2025) — showing time transfer can share commercial fiber.
- **QTF-Backbone** (Germany): proposal for a nationwide optical-fiber backbone for both quantum tech and time/frequency metrology (arXiv 2506.03998).
- **BIPM/CCTF** updated the second-redefinition roadmap in early 2025: optical standards must beat cesium by 100×, ≥5 independent systems running continuously, >1 year of traceable data — every threshold implies robust time-transfer.
- Underpins GPS-independent PNT, financial-transaction timestamping, telecom sync, and VLBI/geodesy.

## Key graded claims
- [T2] Optical-frequency transfer over deployed multicore fiber at ~3×10⁻¹⁹ instability alongside telecom traffic — Optica, 2025 (demonstrated)
- [T2] Six-country optical-clock comparison completed — Optica newsroom, June 2025 (demonstrated)
- [T4] SI-second redefinition on track for late-2020s/~2030 — BIPM/CCTF roadmap (roadmap)

## Conflicts / open questions
Most record-setting transfer uses purpose-run fiber; scaling to a routine, always-on continental network sharing commercial infrastructure is unproven. **The naming trap**: "quantum" time transfer (entanglement-based clock synchronization — see the entanglement-based clock-network node `A-entclock`) is proposed and theoretically elegant, but a 2026 critical assessment (arXiv 2604.10243) questions whether it beats classical optical/comb-stabilized methods in practice, since the record-holding links are all classically stabilized. So the near-term network is optical/frequency-comb-stabilized, not entanglement-based — the word "quantum" here mostly refers to the *clocks*, not the *transfer*.

## The honest call
**Real, demonstrated metrology infrastructure — and mostly classical despite the "quantum" framing.** Six-country optical-clock comparison and ~3×10⁻¹⁹ transfer over shared commercial multicore fiber are done and published; this plumbing is a hard requirement for the SI-second redefinition, so it will get built regardless of market pull. What is *not* established is that entanglement adds anything over comb-stabilized optical links — so treat the transfer layer as advanced classical photonics serving quantum clocks.

## Sources
optica.org newsroom 2025 (six-country clock network; multicore-fiber transfer); arXiv:2506.03998 (QTF-Backbone); arXiv:2503.13278 (SI-second from multiple optical transitions); arXiv:2604.10243 (quantum time-sync assessment); bipm.org/faq-redefinition-second.
