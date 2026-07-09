# Fabrication & supply chain · H-fab
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
The materials science and manufacturing base under every qubit: Josephson-junction deposition (shadow-evaporated Al/AlOx, or foundry-compatible variants), substrate choice (sapphire vs high-resistivity silicon), superconducting films (Nb, Al, Ta, TiN), 300 mm foundry processes, and the specialty supply chain (coax, attenuators, isolators/circulators, ³He, isotopically enriched ²⁸Si, single-photon detectors). The central villain is the **two-level system (TLS)** — atomic-scale defects in amorphous oxides and at interfaces that resonantly absorb qubit energy and drift over hours, capping and destabilizing coherence. Getting T1 up (see the 1.68 ms transmon in `H-supercon`) is mostly a war against TLS.

## Key players & state of the art (2025–26)
- **TLS science**: 2025 mapping experiments (arXiv:2511.05365) localized most detectable surface TLS to the Josephson-junction leads, clustered where surface roughness and amorphous SiO₂ sit — actionable fab guidance rather than folklore. High-throughput junction studies (arXiv:2602.11469) tie TLS density to structural control; site-specific TLS frequency tuning has been demonstrated (arXiv:2503.04702). Titanium sacrificial layers cut TLS loss in tantalum CPW resonators (arXiv:2601.16369).
- **Materials**: tantalum films (Princeton/Houck lineage) cut microwave loss vs niobium and pushed transmon T1 past 0.3–0.5 ms; replacing sapphire with high-resistivity silicon then cut bulk-substrate loss further, yielding time-averaged Q ≈ 9.7×10⁶ across 45 qubits and the 1.68 ms record.
- **Foundries**: imec's 300 mm superconducting-qubit CMOS flow (Nature npj 2024); Diraq/imec spin qubits >99% from a standard 300 mm line (2025); SQC's 250k-register patterning (2025); GlobalFoundries manufacturing PsiQuantum's Omega photonic chipset; SkyWater, Intel's 300 mm line, and national fabs (SQMS at Fermilab) round out capacity. Related nodes: `H-package` (3D/TSV integration), `H-iontrap` (surface-trap fab), `H-foundry` (the 300 mm ecosystem).

## Key graded claims
- [T3] Surface TLS concentrate on junction leads / rough, SiO₂-rich regions — arXiv:2511.05365 (demonstrated, awaiting reproduction)
- [T2] 300 mm CMOS flows yield error-correction-grade spin qubits and high-coherence transmons — Nature/npj papers (demonstrated)
- [T6] TLS problem "engineerable away" by process control alone — no field consensus (speculative)

## Trade-offs
Foundry processes buy uniformity and volume but restrict the exotic materials and geometries that still hold coherence records in the lab (shadow-evaporated Al junctions). The specialty supply chain — ³He, dilution fridges (Finnish/UK duopoly, `H-cryo`), SNSPDs (`H-detect`), isolators, ²⁸Si — concentrates in few hands and is a geopolitical single point of failure (see `E-supplychain`).

## Conflicts / open questions
Junction-parameter spread (~1–2% today) vs the <0.1% wanted for fixed-frequency architectures; whether TLS density can be driven down ~10× by process control, or whether architectures must simply tolerate a fixed TLS bath. Yield at wafer scale, not single-device records, is the number that gates manufacturability.

## Sources
arXiv:2511.05365, 2602.11469, 2503.04702, 2601.16369; PMC11446867 (imec 300 mm); Princeton Nature s41586-025-09687-4; Science Advances ado6240 (phonon engineering); quantumzeitgeist TLS coverage.
