# Deterministic single-photon & entangled-pair sources · H-photonsource
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
The emitter counterpart to the SNSPD (`H-detect`): a photonic quantum computer or QKD link is only as good as its supply of *single, identical, on-demand* photons. Two families compete. **Deterministic** sources use a solid-state quantum emitter — an InGaAs/GaAs semiconductor quantum dot in a micropillar or open cavity, Purcell-enhanced so it emits exactly one photon per trigger — approaching "push a button, get one photon." **Probabilistic** sources use nonlinear optics: spontaneous parametric down-conversion (SPDC) or four-wave mixing that occasionally splits a pump photon into a heralded pair; simple and room-temperature, but the emission time is random, so scaling many sources means heavy multiplexing. The three figures of merit are **brightness** (collection efficiency), **single-photon purity** (g²(0)→0), and **indistinguishability** (Hong-Ou-Mandel visibility → 1).

## Key players & state of the art (2025–26)
- **Quandela** (France): the anchor deterministic-source company. InGaAs quantum dots in micropillar cavities grown by molecular-beam epitaxy; current devices hit in-fibre brightness >30%, g²(0) < 0.05, and HOM visibility > 90% from a single dot. Its **Prometheus** is a plug-and-play single-photon-source appliance; Quandela also builds full photonic processors (see `H-photonic`) on this source.
- **2026 milestone**: Quandela + C2N demonstrated 88 ± 1% indistinguishability between photons from *two independent* quantum-dot sources *without spectral filtering* — a prerequisite for scaling beyond one emitter (arXiv 2602-series). Telecom-band (1550 nm) two-photon-resonant Purcell-enhanced dots also reported (arXiv:2602.06140).
- **SPDC/heralded**: the workhorse of QKD and boson-sampling; bulk-crystal and thin-film-lithium-niobate waveguide pair sources are commercial (e.g. from QKD vendors). **Sparrow Quantum** (Denmark) supplies quantum-dot single-photon chips.

## Key graded claims
- [T2] Deterministic QD source: >30% in-fibre brightness, g²(0) < 0.05, HOM > 90% — Quandela device papers (demonstrated)
- [T3] 88% indistinguishability between two independent QD sources, filter-free — Quandela/C2N, arXiv (2026) (demonstrated)
- [T1] SPDC produces heralded single photons but at random times — established nonlinear optics

## Trade-offs
Deterministic dots give high brightness and on-demand timing but need cryogenics (~4 K), suffer chip-to-chip wavelength/efficiency spread (screening and binning, or on-chip tuning, required), and are hard to make *mutually* indistinguishable across many emitters. SPDC is room-temperature and dead-simple but fundamentally probabilistic, forcing multiplexing that reintroduces loss and switching complexity — the very loss budget that gates `H-photonic`.

## Conflicts / open questions
Which source wins for million-photon FTQC: perfected deterministic dots, or heavily multiplexed SPDC? Cross-source indistinguishability at scale (many identical emitters feeding one interferometer) is the specific unsolved requirement, and 2026's filter-free two-source result is the first real signal it might be reachable.

## Sources
quandela.com (Prometheus, single-photon-source technology); arXiv:2602.06140 (telecom QD) + 2026 two-source indistinguishability preprint; Nano Letters 5c01560 (remote QD-cavity indistinguishability); quantumzeitgeist.com single-photon-source coverage.
