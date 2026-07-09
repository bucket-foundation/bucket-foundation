# Decoherence & Materials Defects — The TLS Bottleneck · O-materials
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
The dominant coherence killer in superconducting qubits is a materials problem: **two-level systems (TLS)** — microscopic defects in amorphous oxides, interfaces, and Josephson-junction tunnel barriers — that couple to qubits, drift in frequency, and cause both decoherence and readout failures. Coherence times have climbed from nanoseconds (1999) to the millisecond range, yet TLS make individual qubits *unpredictable*: a qubit fine today can be lossy tomorrow as a defect diffuses onto resonance. The sharp question is whether materials science suppresses TLS density fast enough for million-qubit processors, or whether the defect burden scales with the system so that some fraction of a large chip is always out of spec. This is where the threshold theorem's iid-noise assumption meets a physical process that may not obey it.

## Where the disagreement is
- **Suppressible-engineering camp.** Fabrication research is finding handles. 2026 high-throughput junction studies correlate TLS density with Al electrode thickness and grain size, demonstrating a **two-thirds reduction in TLS density** through fabrication changes alone [T3, arXiv:2602.11469]. Site-specific TLS frequency tuning in qubit arrays lets operators steer defects off resonance [T3, arXiv:2503.04702], and ML-accelerated TLS characterization speeds the search [T2/T3, Adv. Quantum Technol. 2026]. The camp's analogy: semiconductor yield problems looked fatal in the 1960s and became a controlled engineering discipline. Tantalum and titanium-nitride films, improved surface treatments, and encapsulation have each bought coherence-time gains.
- **Scaling-wall camp.** TLS-induced dropouts **scale with system size** — on a 1,000+ qubit chip some fraction of qubits is always out of spec, and QEC decoders assume error rates that TLS spectral diffusion silently violates during a run [T3, arXiv:2605.02755]. Correlated error *bursts* — quasiparticle poisoning and cosmic-ray/ionizing-radiation impacts that knock out many qubits at once — add a second materials-linked failure mode that surface codes handle badly [T2]. Gil Kalai's deeper claim generalizes this: noise in engineered many-body systems is inherently correlated, so the iid assumption underlying the threshold theorem never holds at scale [T3/contested]. Even friendly reviews call TLS "a critical bottleneck for scalable quantum processors" [T3, arXiv:2602.04831].

## What would resolve it
A junction process with TLS density low enough — and stable enough — that a 10,000-qubit chip holds every qubit within QEC spec across weeks of continuous operation, with published defect statistics showing the out-of-spec fraction does *not* grow with chip area. Alternatively, a demonstration that decoders plus real-time TLS-tuning absorb realistic defect drift and cosmic-ray bursts at scale (leakage-aware decoding, gap engineering against quasiparticles). Either result converts the materials bottleneck from open problem to engineering roadmap. The negative signal: persistent out-of-spec fractions that scale with system size, exactly Kalai's predicted regime.

## Sources
- arXiv:2602.11469 — structural control of TLS density in Josephson junctions (2/3 reduction) [T3]
- arXiv:2605.02755 — readout failures from junction TLS defects, dropouts scaling with size [T3]
- arXiv:2503.04702 — scalable site-specific TLS frequency tuning [T3]
- arXiv:2602.04831 — review of superconducting qubit large-scale integration [T3]
- Science Advances abc5055 — TLS from trapped quasiparticles; cosmic-ray correlated-error literature [T2]
