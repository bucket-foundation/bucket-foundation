# S4 — arXiv sweep: papers that upgrade a manual T4 claim

**Window:** submissions 2026-04-10 → 2026-07-09 (last ~90 days). **Categories:** quant-ph + cond-mat.mes-hall. **Method:** 25 claim-keyed arXiv queries → 413 unique papers in window → per-paper LLM assessment against `evidence/CONFLICTS.md` → strict filter to empirical / resource-estimate / classical-sim results that materially move a registered claim (61 papers).

**Tier discipline (per `evidence/SCHEMA.md`):** an arXiv posting is **T3 (preprint)** until refereed. Every row below upgrades a manual claim from **T4 (vendor announcement)** to at least **T3 (independent preprint)** — a real tier gain, since an independent preprint outranks a vendor blog post. Rows marked **T2** carry a verified `journal_ref` (published, refereed). No row was promoted to T2 on abstract wording alone.

> Caveat: tiers reflect *publication status verified from arXiv metadata*, not independent reproduction. A T3 preprint that agrees with a vendor claim corroborates it; it does not by itself retire the conflict. Replication status is unchanged for every `what_would_resolve_it` line in CONFLICTS.md.


**Totals:** 61 claim-moving papers | C-ftqc-timeline=23, C-overhead-ratio=15, C-majorana-existence=7, C-tls-scaling=7, C-photonic-scaling=3, C-advantage-survival=2, C-energy-advantage=2, C-quantum-utility=2


---


## C-majorana-existence — Microsoft topological-qubit / Majorana claim (T4, no independent replication)

| Node ID(s) | Paper | arXiv | Date | Tier | What it changes |
|---|---|---|---|---|---|
| H-topo | Josephson spectroscopy study of kagome superconductors toward the deep point-contact regime | 2605.06150v1 | 2026-05-07 | T2 (Phys. Rev. B 113, 174502 (2026)) | Demonstrates zero-bias conductance saturation in point-contact regime mimics Majorana signatures; cautions against misinterpretation in topological-qubit searches. |
| H-topo | Superconducting PdTe Thin Film Via Topotactic Transformation, Toward Topological Superconductors | 2605.20437v1 | 2026-05-19 | T2 (ACS Appl. Nano Mater. 2026, 9, 10684) | Demonstrates high-quality superconducting PdTe thin films via MBE; enables experimental platforms for Majorana detection but does not yet evidence MZMs. |
| H-topo | Exposing impostor Majorana zero modes through atomic-scale shot-noise | 2604.26002v1 | 2026-04-28 | T3 | Demonstrates shot-noise method to distinguish trivial zero-bias peaks from true Majorana modes; directly addresses impostor problem in Fe(Se,Te). |
| H-topo | Experimental Evidence of Fractional Entropy in Critical Kondo Systems | 2605.00669v1 | 2026-05-01 | T3 | Independent thermodynamic evidence of non-Abelian anyons (Majorana, Fibonacci) via fractional entropy in Kondo systems. |
| H-topo | Probing PbTe-Pb nanowire devices with radio-frequency reflectometry | 2606.04544v2 | 2026-06-03 | T3 | Demonstrates rf reflectometry compatibility with PbTe-Pb nanowires under magnetic fields; advances measurement capability for topological-qubit platforms. |
| H-topo | Fabry-Perot Interference, g-factor Anisotropy, and Gate-Tunable Quantum dot in Chiral Tellurium Nanowires | 2606.10001v1 | 2026-06-08 | T3 | Demonstrates Majorana-platform prerequisites (spin-orbit gap, g-factor anisotropy, quantum coherence) in elemental tellurium; not Majorana detection but materials foundation. |
| H-topo | Distinguishing Majorana zero modes from trivial defect states on the surface of the iron-based superconductor Fe(Te,Se) | 2606.17499v1 | 2026-06-16 | T3 | Independent experimental replication showing Fe(Te,Se) zero modes are trivial Yu-Shiba-Rusinov states, not Majoranas—directly challenges topological-superconductor claim. |


## C-advantage-survival — Does any quantum speedup survive classical counterattack (Google Quantum Echoes, D-Wave spin-glass)

| Node ID(s) | Paper | arXiv | Date | Tier | What it changes |
|---|---|---|---|---|---|
| O-advantage;S-bench | Tensor network surrogate models for variational quantum computation | 2604.20180v1 | 2026-04-22 | T3 | Tensor-network classical simulation successfully benchmarks QAOA on spin-glass; demonstrates parameter-transfer limits and feasibility scaling. |
| O-advantage;S-bench | Truncated Wigner dynamics of biclique quantum spin glasses | 2606.20187v1 | 2026-06-18 | T3 | TWA classical method reproduces quantum spin-glass dynamics and critical exponents; scales to tens of thousands of qubits. |


## C-quantum-utility — IBM 'utility before fault tolerance' vs classical reproduction

| Node ID(s) | Paper | arXiv | Date | Tier | What it changes |
|---|---|---|---|---|---|
| O-utility-definition;S-bench | Ground-state energies of Ising models calculated using the samples from a quantum computer that simulates short-time evolution | 2604.25715v1 | 2026-04-28 | T3 | Demonstrates Ising ground-state calculation at 63 qubits on real hardware; quantifies error scaling and utility boundary. |
| O-utility-definition;S-bench | Utility-scale quantum experiments using dynamic circuits to address collective dissipation in interacting qubits | 2605.25830v1 | 2026-05-25 | T3 | Demonstrates utility-scale dissipative-dynamics simulation on 86 qubits with validated classical comparison; addresses classical reproducibility dispute. |


## C-ftqc-timeline — IBM/Google FTQC roadmaps (T4): below-threshold QEC & logical-qubit demos

| Node ID(s) | Paper | arXiv | Date | Tier | What it changes |
|---|---|---|---|---|---|
| S-qec;S-logical | Fast and accurate AI-based pre-decoders for surface codes | 2604.12841v1 | 2026-04-14 | T3 | Demonstrates scalable real-time surface-code decoding at O(1 μs) with LER improvements over standard decoders. |
| S-qec;S-logical | Fault-Tolerant Error Detection Above Break-Even for Multi-Qubit Gates | 2604.13219v2 | 2026-04-14 | T3 | Demonstrates fault-tolerant error detection above break-even on trapped-ion hardware; advances real-device QEC validation. |
| S-qec;S-logical;H-ion | Fault-Tolerant Quantum Computing with Trapped Ions: The Walking Cat Architecture | 2604.19481v1 | 2026-04-21 | T3 | LDPC-based trapped-ion FT architecture with 110 logical qubits, 2,514 physicals, Hamiltonian-sim utility in ~1 month. |
| S-qec;S-logical | High-performance cellular automaton decoders for quantum repetition and toric code | 2604.21866v1 | 2026-04-23 | T3 | Demonstrates scalable real-time QEC decoder with threshold ~7.5% and subthreshold scaling; advances practical error-correction architecture feasibility. |
| H-neutral;S-qec;S-logical | High-fidelity entangling gates and nonlocal circuits with neutral atoms | 2604.25987v1 | 2026-04-28 | T3 | 99.85% two-qubit gate fidelity on neutral atoms advances hardware baseline for below-threshold QEC demonstrations. |
| S-qec;S-logical | MCMit: Mid-Circuit Measurement Error Mitigation | 2604.25863v2 | 2026-04-28 | T3 | Demonstrates measured QEC logical error reduction (1.2–9.4×) via mid-circuit measurement error mitigation on hardware. |
| S-qec;S-logical | Real-time Surface-Code Error Correction Using an FPGA-based Neural-Network Decoder | 2605.04892v1 | 2026-05-06 | T3 | Demonstrates real-time surface-code QEC (distance-3) with closed-loop feedback on superconducting hardware; validates hardware-integrated decoder architecture for scalable fault tolerance. |
| S-qec;S-logical;H-silicon | Surface-Code Thresholds and Qubit Footprints in Shuttling-Based Spin-Qubit Railways | 2605.05881v1 | 2026-05-07 | T3 | Demonstrates surface-code threshold and footprint scaling on silicon spin qubits with circuit-level noise; achieves Megaquop distance-7 code at p=10^−3 error rate. |
| S-qec;H-ion | Error Correction of Beamsplitter-Generated Entangled GKP States | 2605.08009v1 | 2026-05-08 | T3 | First experimental demonstration of entangled GKP qubits with QEC extension; advances trapped-ion bosonic code roadmap. |
| H-ion;S-qec | Demonstration of a Multiplexing Trapped Ion Quantum Processing Unit | 2605.16010v1 | 2026-05-15 | T3 | Demonstrates multiplexing scalability for trapped-ion QPUs; addresses wiring bottleneck to fault-tolerant scale. |
| S-qec;S-logical | Benchmarking a machine-learning differential equations solver on a neutral-atom logical processor | 2605.21276v1 | 2026-05-20 | T3 | Demonstrates logical-qubit advantage in end-to-end ML application; validates fault-tolerant overhead trade-offs experimentally. |
| S-qec;S-logical | Real-Time Quantum Error Correction System Stack: Architecture, Algorithms, and Engineering Practice | 2605.30765v1 | 2026-05-29 | T3 | Quantifies real-time QEC engineering gaps; benchmarks decoders for surface/qLDPC; identifies system-level bottlenecks beyond algorithm speed. |
| S-qec;S-logical;H-neutral | Quantum error correction with the toric code | 2606.04079v1 | 2026-06-02 | T3 | First scalable toric-code logical-qubit demo on neutral atoms with 90 syndrome cycles, distance-dependent error suppression. |
| S-qec;S-logical | A superconducting surface-code processor with lattice-surgery logical operations | 2606.06598v1 | 2026-06-04 | T3 | First experimental demonstration of below-threshold surface-code logical operations with multi-cycle error suppression on real hardware. |
| H-supercon;S-qec | Ultra-high Q-factor superconducting tantalum resonators on 300 mm Si wafers | 2606.10719v1 | 2026-06-09 | T3 | Demonstrates industrial-scale ultra-high-Q superconducting resonators (>40M median, >60M peak) on 300mm wafers, enabling hardware-efficient bosonic error correction and scaling. |
| S-qec;S-logical | Efficient Magic State Factory Via Transversal Non-Clifford Gate | 2606.16199v1 | 2026-06-15 | T3 | End-to-end magic-state factory simulations at distance d=5 with code switching; resource comparison against cultivation methods. |
| S-qec;S-logical | Cultivating logical catalysts for fault-tolerant dyadic phase rotations | 2606.27358v1 | 2026-06-25 | T3 | Demonstrates fault-tolerant logical-qubit phase gates with error-corrected scaling; advances offline magic-state cultivation toward FTQC resource efficiency. |
| H-silicon;S-qec | High-Fidelity Hole Spin Qubits Reveal Quadrupolar Nuclear-Bath Dynamics in Isotopically Purified Planar Germanium | 2606.28695v1 | 2026-06-27 | T3 | Demonstrates 99.9% single-qubit Ge-hole fidelity via isotopic purification, advancing hardware records for spin-qubit platform. |
| H-supercon;S-qec | High-Precision Calibration Workflow Achieves Above $99.9\%$ CZ Gate Fidelity on a Scalable Superconducting Processor | 2607.01422v1 | 2026-07-01 | T3 | Demonstrates 99.9% CZ fidelity on 84-qubit processor; advances two-qubit gate benchmark supporting FTQC feasibility. |
| H-neutral;S-qec;S-logical | Fault-tolerant quantum computation with static atomic buses | 2607.02804v1 | 2026-07-02 | T3 | Demonstrates logical-qubit error correction and gate operations on neutral-atom hardware with simulated >10× improvement over prior architectures. |
| S-qec;S-logical | LUCI on IBM Hardware: Error Suppression with Almost Half Syndrome Density | 2607.01887v1 | 2026-07-02 | T3 | Demonstrates logical-qubit error suppression on real hardware with reduced syndrome overhead; validates dynamic-code QEC beyond theory. |
| S-qec;S-logical | Genuine Multipartite Entanglement between Logical Qubits via Cross-Code Lattice Surgery | 2607.04227v1 | 2026-07-05 | T3 | First experimental demonstration of logical-qubit universal gates via lattice surgery on real hardware; advances fault-tolerant QEC building blocks. |
| S-qec;S-logical;H-supercon | Quantum error correction of a grid-state qubit with state preparation and measurement errors below $10^{-3}$ | 2607.06718v1 | 2026-07-07 | T3 | Demonstrates below-threshold QEC performance in grid-state qubits; SPAM errors reduced 100× to sub-10⁻³, enabling practical logical-qubit operation. |


## C-overhead-ratio — physical:logical ratio; qLDPC '10–20× overhead cut' (T3/T4)

| Node ID(s) | Paper | arXiv | Date | Tier | What it changes |
|---|---|---|---|---|---|
| H-neutral;S-qec;O-overhead | Towards Ultra-High-Rate Quantum Error Correction with Reconfigurable Atom Arrays | 2604.16209v2 | 2026-04-17 | T3 | Demonstrates ultra-high-rate qLDPC codes (>1/2 encoding) with sub-threshold logical error rates on neutral atoms, directly addressing overhead reduction. |
| O-overhead;S-qec | Networked Realization of Quantum LDPC Codes | 2604.25026v1 | 2026-04-27 | T3 | First circuit-level noise study of networked bivariate bicycle qLDPC codes; quantifies overhead under practical constraints. |
| O-overhead;S-qec;H-silicon | CAbLECAR: efficiently scheduling QLDPC codes on a tileable spin qubit chip with shuttling | 2604.24739v2 | 2026-04-27 | T3 | Circuit-level QLDPC scheduling on silicon spin qubits; identifies codes reducing logical error rates vs surface codes; quantifies overhead via shuttling range extension. |
| S-qec;O-overhead | A Scalable FPGA Architecture for Real-Time Decoding of Quantum LDPC Codes Using GARI | 2605.01035v1 | 2026-05-01 | T3 | First multi-core FPGA decoder for qLDPC under correlated errors; 6× resource reduction advances practical overhead benchmarking. |
| O-overhead;S-qec | Mitigating Classical Resource Costs in Quantum Error Correction via Generalized qLDPC Predecoding | 2605.03180v1 | 2026-05-04 | T3 | Demonstrates practical predecoding + hardware design reducing qLDPC decoder utilization 3,963x; scales to 36k–360k logical qubits on cryogenic ASIC. |
| O-overhead;S-qec | Space-Time Tradeoffs of Pauli-Based Computation in Distributed qLDPC Architectures | 2605.03854v1 | 2026-05-05 | T3 | Quantifies qLDPC execution-time overhead vs surface code in distributed architecture; demonstrates order-of-magnitude speedup with large blocks. |
| O-overhead;S-qec;H-ion;H-neutral | Distributed Quantum Error Correction with Bivariate Bicycle Codes in a Modular Architecture | 2605.04663v1 | 2026-05-06 | T3 | Demonstrates distributed BB code logical error rates and pseudo-threshold on modular hardware; measures practical qLDPC overhead scaling. |
| S-qec;O-overhead | A Resource Comparison of Logical T-State Preparation | 2605.26522v1 | 2026-05-26 | T3 | Systematizes T-state preparation costs across distillation/cultivation/code-switching; clarifies overhead trade-offs under standardized comparison. |
| H-silicon;O-overhead;S-qec | Hardware-Tailored Resource Estimation for Magic-State Distillation on Silicon Spin Qubits | 2605.28936v1 | 2026-05-27 | T3 | Quantifies magic-state distillation overhead on silicon; biased codes achieve 3× footprint reduction vs surface code. |
| O-overhead;S-qec | Evolutionary Discovery of Bivariate Bicycle Codes with LLM-Guided Search | 2606.02418v1 | 2026-06-01 | T3 | Discovers new high-performing qLDPC codes; indecomposable [[288,16,12]] and codes with k=50, d=8 improve finite-length overhead data. |
| O-overhead;S-qec | Full Extractors for Logical Processing in Hypergraph Product Codes | 2606.03507v1 | 2026-06-02 | T3 | Demonstrates full logical processing on HGP qLDPC codes with 50–80% size vs. base code; achieves 10⁻⁶ logical error at distance 10. |
| O-overhead;S-qec | Breakeven demonstration of quantum low-density parity-check codes | 2606.06455v1 | 2026-06-04 | T3 | First experimental breakeven qLDPC code; 9× logical error-rate improvement over prior solid-state implementation. |
| O-overhead;S-qec | Large-Language-Model Discovery of Quantum LDPC Codes through Structured Concept Evolution | 2606.24808v1 | 2026-06-23 | T3 | Demonstrates new qLDPC code families with measured overhead via BP+OSD decoding under realistic noise. |
| O-overhead;S-qec;H-neutral | Fast and Parallel High-Rate STAR Architecture for Megaquop Quantum Simulation | 2606.25011v1 | 2026-06-23 | T3 | High-rate QEC code integration achieves ~5.5× space reduction vs surface code; demonstrates co-designed algorithm-code-hardware overhead optimization. |
| O-overhead;S-qec | Strictly Local Tile-Code Architectures on Two-Dimensional Planar Lattices | 2607.05897v1 | 2026-07-07 | T3 | Demonstrates routed tile-code overhead <surface-code at p<0.08%; validates qLDPC scaling under realistic connectivity constraints. |


## C-tls-scaling — Are TLS/material defects an engineering nuisance or a scaling wall

| Node ID(s) | Paper | arXiv | Date | Tier | What it changes |
|---|---|---|---|---|---|
| H-supercon;H-fab | Tantalum-Encapsulated Niobium Superconducting Resonators: High Internal Quality Factor and Improved Temporal Stability via Surface Passivation | 2604.09050v1 | 2026-04-10 | T3 | Demonstrates fab control of TLS density via Ta encapsulation; shows scaling path and temporal stability data. |
| H-supercon | Operating a bistable qubit | 2605.03187v1 | 2026-05-04 | T3 | Demonstrates adaptive mitigation of TLS-induced dephasing in superconducting qubits with 77% error reduction; addresses whether TLS defects are a fundamental scaling wall. |
| H-supercon;H-fab | Readout failures in superconducting qubits due to TLS-defects in tunnel junctions | 2605.02755v1 | 2026-05-04 | T3 | Demonstrates TLS-readout resonator coupling as a scaling mechanism limiting qubit fidelity; supports TLS as a fundamental scaling wall. |
| H-supercon;H-fab | Interface Piezoelectric Loss in Superconducting Qubits | 2605.15554v1 | 2026-05-15 | T3 | Identifies interface piezoelectricity as distinct loss channel competing with/exceeding TLS at high frequencies; experimental evidence for new scaling constraint. |
| H-silicon;S-qec | Multi-Qubit Entanglement of Unit Cell Pairs in SiMOS | 2605.20781v1 | 2026-05-20 | T3 | SiMOS 4-qubit multi-unit-cell coupling with 99%+ fidelities and preserved entanglement lifetime advances silicon scalability beyond isolated DQD units. |
| H-supercon;S-qec | Non-Local and Non-Markovian Effects of a Microscopic Two-Level Defect in Superconducting Quantum Circuits | 2605.23385v2 | 2026-05-22 | T3 | Demonstrates tunable TLS coupling in scalable architecture; non-Markovian dynamics complicate error-correction models. |
| H-supercon;H-fab | Surface Platinum Alloying for Passivation of Oxide Interfaces on Superconducting Niobium Films | 2607.00429v1 | 2026-07-01 | T3 | Demonstrates fab-level control of TLS density via Pt alloying; directly addresses surface-oxide scaling wall. |


## C-photonic-scaling — Xanadu/PsiQuantum million-qubit photonic roadmaps (T4)

| Node ID(s) | Paper | arXiv | Date | Tier | What it changes |
|---|---|---|---|---|---|
| H-photonic;S-qec | Picosecond Schrödinger cat states for ultrafast optical quantum processing | 2606.24002v1 | 2026-06-22 | T3 | Demonstrates high-rate non-Gaussian state generation at picosecond timescales, addressing temporal-mode bottleneck for fault-tolerant photonic QC. |
| H-photonic | Industry-ready spin-photon interfaces for hybrid photonic quantum computing | 2606.27787v1 | 2026-06-26 | T3 | Demonstrates production-line QD devices with near-unity photon purity, multi-photon entanglement, and path toward fault-tolerance loss thresholds. |
| H-photonic;S-qec | Integrated Photon-Memory Entanglement Generation using Dual Photonic Resonators | 2607.01324v1 | 2026-07-01 | T3 | First integrated photon-memory entanglement on chip; demonstrates scalable quantum-repeater building block with published loss budgets and multimode storage capacity. |


## C-energy-advantage — Net energy advantage over classical for useful work

| Node ID(s) | Paper | arXiv | Date | Tier | What it changes |
|---|---|---|---|---|---|
| O-energy | Estimating The Energy Consumption of Quantum Computing from A Full System Aspect | 2605.09580v2 | 2026-05-10 | T3 | First full-stack joules-per-answer model for NISQ and FTQC; quantifies energy breakdown by regime. |
| H-supercon;O-energy | Unveiling Energetic Advantage in Superconducting Cat-Qubits Quantum Computation | 2605.19854v1 | 2026-05-19 | T3 | Provides full-stack energy consumption model and scaling analysis for superconducting cat-qubit systems with error correction; estimates quantum energetic advantage threshold at >26 qubits. |


---

## Screened and excluded (not claim-movers)

- **QKD / quantum-networking cluster (~30 papers):** active field (telecom quantum memories, satellite QKD, repeater protocols) but the manual registers **no T4 vendor conflict** for QKD/repeaters, so none upgrades a graded claim. Node activity for `A-qkd`/`A-qinternet`/`H-transduce`, not a tier change.
- **Majorana *detection-method theory* (~5 papers):** new signatures/diagnostics for distinguishing true from trivial zero modes. `C-majorana-existence` needs an *independent experimental* braiding/fusion replication; proposals don't move it.
- **Incremental algorithm/theory & reviews:** flagged as topically relevant but not providing a new experimental result, resource estimate, or classical-simulation attack/defense on a registered claim.

## Reproduce
```
# 25 claim-keyed queries over the 90-day window, then assess vs evidence/CONFLICTS.md
python3 arxiv_sweep_S4.py   # (query set embedded; regenerates arxiv_sweep_S4.csv)
```
Raw per-paper assessments: `arxiv_assess.json` (413 papers). Curated table: `arxiv_sweep_S4.csv`.
