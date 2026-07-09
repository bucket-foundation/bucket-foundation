# Cryogenics & dilution refrigerators · H-cryo
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
Superconducting, silicon-spin, and bosonic qubits live at 10–20 millikelvin — colder than deep space — reached by dilution refrigerators that exploit the finite solubility of ³He in ⁴He: pumping ³He across the phase boundary in the mixing chamber absorbs heat continuously. Modern "dry" (cryogen-free) fridges reach the 4 K stage with pulse-tube coolers instead of a liquid-helium bath, which is what made mK an engineering commodity rather than a specialist art. The fridge sets three hard limits on qubit count: **cooling power** at the mixing-chamber stage (a few hundred µW to ~1 mW at 20 mK), **internal volume** for the sample and wiring, and the **number of coax lines** that can be routed from 300 K to the mixing chamber without dumping heat — the passive-wiring bottleneck (coax, attenuators, isolators — see `H-wiring`) that cryo-CMOS (`H-cryocmos`) exists to break.

## Key players & state of the art (2025–26)
- **Bluefors** (Finland): the market anchor; with Oxford Instruments it holds >70% of the dilution-refrigerator market (ICV 2025). The **KIDE** platform is purpose-built for large-scale QC — 1,000+ qubit support, hexagonal side-loading, and multi-unit clustering; IBM Quantum System Two runs on it. Ultra-Compact LD launched Feb 2025 for space-constrained labs.
- **Oxford Instruments NanoScience** (UK): ProteoxMX/LX line, the other half of the duopoly. **Maybell Quantum** (US): the "Icebox" packing dense wiring (thousands of lines) into one fridge. **Leiden Cryogenics**, **Zero-Point Cryogenics** (Canada), and Chinese entrants (e.g. domestic supply for USTC programs) round out the field.
- **Market**: laboratory dilution-fridge market ~$320M (2025), projected ~$520M by 2034 — quantum programs are the main growth driver.

## Key graded claims
- T5 Bluefors + Oxford Instruments >70% market share — ICV Global Dilution Refrigerator Report 2025 (claimed)
- T4 KIDE supports 1,000+ qubit systems — Bluefors (claimed; IBM deployment corroborates at current scales)
- T5 Market ~$320M (2025) → ~$520M (2034) — analyst forecasts (forecast)
- T1 Dilution refrigeration reaches ~10 mK continuously via ³He/⁴He mixing — established cryogenics

## Trade-offs (vs other modalities/components)
Dry fridges made mK routine, but each ~1 mW of cooling power at 20 mK costs on the order of ~25 kW at the wall — the thermodynamic tax on superconducting QC. Wiring heat-load per qubit forces cryo-CMOS control, photonic I/O, or aggressive multiplexing before a fridge can hold thousands of qubits. Ion, neutral-atom, photonic, and NV modalities skip dilution fridges entirely (photon detectors still want a 2–4 K stage — see `H-detect`).

## Conflicts / open questions
Can a single fridge + its wiring scale to million-qubit superconducting machines, or does the endgame require chip-to-chip links across *many* fridges (`H-intercon`), which in turn needs microwave-optical transduction (`H-transduce`) that does not yet exist? **³He supply** — a byproduct of tritium decay in nuclear-weapons stockpiles — is a strategic chokepoint rarely priced into roadmaps (see `E-supplychain`).

## Sources
bluefors.com (KIDE, Ultra-Compact LD); The Quantum Insider (Feb 2025); ICV Global Dilution Refrigerator Report 2025; Maybell Icebox coverage; intelmarketresearch/valuates market reports.
