# Quantum-dot displays (boundary case) · A-qdisplay
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3, new node — boundary case)

## What it is
A deliberately-included **boundary case**, here to police the word "quantum" in the largest-revenue product that carries it. A **quantum dot** is a semiconductor nanocrystal (~2–10 nm) whose emission wavelength is set by quantum confinement — make the dot smaller and the bandgap widens, so size *tunes color* with near-perfect purity. This is real quantum mechanics (particle-in-a-box confinement). But whether a QD *display* belongs in a quantum-technology atlas depends entirely on which of three things you mean:
1. **Photoluminescent QLED (today's "QLED" TVs)** — QDs sit in a film and simply down-convert blue LED backlight into pure red/green. Confinement sets the color, but the device is an ordinary LCD. **Quantum physics, not quantum *technology*** in the manual's sense — no superposition, entanglement, or single-quantum control is exploited.
2. **Electroluminescent QD (EL-QD / "NanoLED" / true QLED)** — QDs that conduct electricity and emit their own light, no backlight, no OLED. A real display breakthrough, still QD-as-a-material.
3. **QD single-photon / entangled-photon sources** — the one that *is* quantum technology: individual dots emit one photon at a time on demand (Quandela, `H-photonsource`), a building block for photonic QC and QKD. That belongs to the hardware chapter, cross-linked here.

## Maturity & real deployments (2025–26)
- **Photoluminescent QLED / QD-OLED**: fully commercial, mass-market — Samsung, TCL, Sony ship tens of millions of QD TVs; **Nanosys** (acquired by Shoei Chemical) is the dominant QD-material supplier. This is a multi-billion-dollar consumer market and the reason "quantum" is a household display word.
- **Electroluminescent NanoLED / EL-QD**: prototype stage. Samsung Display showed brighter EL-QD prototypes (2025–26); Nanosys/Shoei repeatedly pushed the "ready ~2025–26" target — and, as of 2026, slipped it to **~2029**. Not yet a product.
- **QD single-photon sources**: research/early-commercial for quantum-photonics labs (Quandela's Prometheus), covered under `H-photonsource`.

## Key graded claims
- [T1] Quantum confinement sets QD emission color (size-tunable bandgap) — established solid-state physics (established)
- [T2] Photoluminescent QD displays are a mass-market commercial product — Samsung/TCL/Nanosys shipments (established, commercial)
- [T4/T6] Electroluminescent EL-QD ("true QLED") displays for consumers ~2029 — Samsung/Nanosys roadmap, repeatedly slipped (roadmap)
- [T2] On-demand single-photon emission from individual quantum dots — established QD-photonics literature (established; see `H-photonsource`)

## Conflicts / open questions
- **The definitional one, which is the point of this card**: is a QLED TV "quantum technology"? By the manual's standard (exploiting a controlled quantum state — superposition/entanglement/single-quantum readout), **no** for photoluminescent QLED — it uses a quantum *material* the way a laser or an LED does, not a quantum *information* resource. **Yes** for QD single-photon sources.
- EL-QD's engineering blockers (blue-dot lifetime/efficiency, cadmium-free formulations, electrical stability) keep slipping the timeline.

## The honest call
**Mostly not a quantum technology in this atlas's sense — included to say so out loud.** Today's QD displays are a huge, real consumer market built on a quantum *material*, and calling them "quantum tech" alongside qubits and QKD is a category error the marketing invites. The genuinely quantum-technology thread is the QD *single-photon source* (`H-photonsource`), not the TV. Grade the TV as commercial-but-boundary; grade the photon source in hardware.

## Sources
- https://www.nanosys.com/blog-newsroom/nanosys-quantum-dot-technology-at-display-week-2025
- https://www.flatpanelshd.com/news.php?subaction=showfull&id=1777964273 (Samsung EL-QD/NanoLED prototypes)
- https://en.wikipedia.org/wiki/Quantum_dot_display (PL vs EL QLED distinction)
- Cross-link: `H-photonsource` (QD single-photon sources — the actual quantum-tech thread)
