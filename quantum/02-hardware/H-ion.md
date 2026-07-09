# Trapped-ion qubits · H-ion
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Individual atomic ions (Yb⁺, Ba⁺, Ca⁺) held in electromagnetic (Paul) traps in ultra-high vacuum; qubits live in hyperfine or optical levels of identical atoms, so every qubit is perfect by construction and needs no fabrication tuning. Gates are driven with lasers (or on-chip microwaves/electronics) through shared motional modes of the ion chain, giving effectively all-to-all connectivity within a chain. Modern systems use microfabricated **surface traps** (see `H-iontrap`) rather than bulk blade traps; Quantinuum's QCCD (quantum charge-coupled device) architecture physically shuttles ions between dedicated storage, gate, and readout zones to sidestep the single-chain length limit.

## Key players & state of the art (2025–26)
- **Quantinuum**: Helios launched Nov 2025 — 98 physical ¹³⁷Ba⁺ qubits at 99.921% 2Q / 99.9975% 1Q fidelity, coherence in the seconds-to-minutes range, on a Honeywell-fabricated QCCD trap; results characterized in an arXiv preprint (2511.05465) and independently validated by Sandia in Nature (June 2026). Roadmap: Sol (2027), **Apollo** fault-tolerant system ~2029. Helios already runs dozens of logical qubits with real-time QEC.
- **IonQ**: closed its $1.075B acquisition of **Oxford Ionics** (Sep 2025); claims a 99.99% 2Q fidelity record (2025); Forte Enterprise and Tempo (~100 algorithmic qubits) systems shipping, Tempo contracted to KISTI (South Korea) and to AFRL. Combined roadmap: 256 physical qubits at 99.99% (2026), ~10,000 (2027), 2M by 2030 — aggressive relative to any demonstrated trap-scaling result.
- **Oxford Ionics** (now IonQ): electronic (laser-free) gate control delivered on chip traps; supplied the QUARTET system to the UK NQCC. **Alpine Quantum Technologies** (Innsbruck): Ca⁺, rack systems. **eleQtron** (Germany): MAGIC microwave-driven gates.

## Key graded claims
- [T2] Helios: 98 qubits, 99.921% 2Q fidelity, seconds-to-minutes coherence — arXiv:2511.05465 + Sandia/Nature validation Jun 2026 (demonstrated)
- [T4] IonQ 99.99% 2Q gate record — company claim 2025 (claimed)
- [T4] IonQ 2M physical qubits by 2030 — post-acquisition roadmap (roadmap)
- [T1] Ion qubits are intrinsically identical (no fab variability) — atomic physics (established)

## Trade-offs (vs other modalities)
The best gate fidelities and by far the longest coherence (seconds to minutes) of any modality, all-to-all connectivity, and no dilution fridge (UHV chamber, room-temperature-adjacent — see `H-uhv`). Against that: gates are slow (µs–ms, ~1000× slower than transmons), a single trap chain saturates around ~50–100 ions before motional-mode crowding degrades gates, and scaling then demands ion shuttling (heating, speed cost), multi-zone chips, or photonic interconnects (`H-intercon`). The whole machine is a precision laser instrument (`H-lasers`), so uptime tracks laser-lock stability.

## Conflicts / open questions
Whether QCCD shuttling or photonic networking wins the scaling race — Quantinuum bets on the former, IonQ (post-Oxford-Ionics) increasingly on the latter. Whether the µs–ms gate-speed penalty erases the fidelity advantage once algorithms reach millions of gates. IonQ's 2030 count is a roadmap number, not a demonstrated one.

## Conflicts logged
See `C-ion-scaling` (shuttling vs photonic networking as the trapped-ion scaling path).

## Sources
Quantinuum Helios release + arXiv:2511.05465; HPCwire Sandia/Helios validation (Jun 2026); IonQ/Oxford Ionics acquisition filings; DCD KISTI Tempo coverage; postquantum.com trapped-ion ecosystem + Helios analyses.
