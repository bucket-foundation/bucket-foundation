# The Full Map — Atlas of Quantum

The entire territory on one page — from the postulate that a system can be in two
states at once, up through the machines that exploit it, and out into every
industry that will be rebuilt on top of them.

It's a map, not a front-to-back read. Two things travel with every node: which
chapter covers it (`§`), and how strong the evidence behind it is (graded per
`evidence/SCHEMA.md`). A press release and a peer-reviewed threshold demo do not
weigh the same, and the manual always says which is which.

Every node below is a coverage unit. `NETWORK-CAPACITY.md` counts how many are
filled; `FRONTIER.md` is the live worklist. Node IDs are stable citation anchors.

---

## Layer 0 — Foundations (the physics that makes any of this possible) · §01

| Node | What | ID |
|---|---|---|
| Superposition & the state vector | A system holds a weighted combination of basis states until measured | `F-superpos` |
| Measurement & the Born rule | Probabilities as squared amplitudes; collapse / update | `F-measure` |
| Entanglement & nonlocality | Correlations with no classical explanation | `F-entangle` |
| Bell inequalities & their experimental violation | The test that ruled out local hidden variables (Aspect → 2022 Nobel) | `F-bell` |
| Decoherence & open quantum systems | Why the quantum world looks classical; the enemy of every qubit | `F-decoher` |
| The qubit & Bloch sphere | The unit of quantum information | `F-qubit` |
| No-cloning theorem | You cannot copy an unknown quantum state — the root of quantum crypto | `F-nocloning` |
| Quantum information theory | Von Neumann entropy, channels, fidelity, quantum capacity | `F-qinfo` |
| Uncertainty & complementarity | Conjugate observables; the Heisenberg bound | `F-uncertainty` |
| Interpretations | Copenhagen, many-worlds, Bohmian, QBism, relational, objective-collapse | `F-interp` |
| QFT / second-quantization bridge | Where quantum mechanics meets fields and particles | `F-qft` |
| Quantum thermodynamics | Work, heat, and information at the quantum scale | `F-qthermo` |
| Quantum tunneling | The physics inside every Josephson junction, flux qubit, STM | `F-tunneling` |
| Contextuality (Kochen-Specker) | The resource behind magic-state computation; bridges to QEC | `F-contextuality` |
| Identical particles & spin-statistics | Exchange symmetry — underlies quantum chemistry, fermionic sim, anyons | `F-statistics` |
| Adiabatic theorem | The foundation quantum annealing rests on | `F-adiabatic` |
| Teleportation & entanglement swapping | Foundational protocols under the quantum internet & modular QC | `F-teleport` |
| Geometric / Berry phase | Geometric gates, topological band theory, links to quantum materials | `F-berry` |
| Generalized measurement (POVMs) | Positive-operator measurements, Naimark dilation, weak measurement & instruments — the real measurement model | `F-povm` |
| Purification & Stinespring dilation | Every mixed state is a pure state, every channel a unitary, on a larger space — the church of the larger Hilbert space | `F-purification` |
| Lieb-Robinson bounds | An emergent finite speed limit / effective light cone in non-relativistic quantum systems | `F-liebrobinson` |
| PBR theorem | Pusey-Barrett-Rudolph: the reality status of the quantum state (ψ-ontic vs ψ-epistemic) | `F-pbr` |
| Wigner functions & quasiprobability | Phase-space QM; negativity as a nonclassicality / computation resource | `F-wigner` |
| Stabilizer formalism & Gottesman-Knill | Why a large class of quantum circuits is classically simulable; the backbone of QEC | `F-stabilizer` |
| Quantum discord | Quantum correlations that survive beyond entanglement | `F-discord` |
| Quantum entropy inequalities | Strong subadditivity, monogamy, data-processing — the bookkeeping laws of quantum information | `F-entropy-ineq` |

## Layer 1 — Hardware: the qubit modalities & the machines · §02

| Node | What / who | ID |
|---|---|---|
| Superconducting (transmon) | IBM, Google, Rigetti, IQM, OQC, SEEQC | `H-supercon` |
| Trapped ions | IonQ, Quantinuum, Oxford Ionics, Alpine, eleQtron | `H-ion` |
| Photonic | PsiQuantum, Xanadu, QuiX, ORCA, TundraSystems | `H-photonic` |
| Neutral atoms | QuEra, Pasqal, Atom Computing, Infleqtion, planqc | `H-neutral` |
| Spin qubits in silicon | Intel, Diraq, Quantum Motion, SQC, Equal1 | `H-silicon` |
| Topological / Majorana | Microsoft (Majorana 1), Nokia Bell | `H-topo` |
| Bosonic / cat qubits | Alice & Bob, AWS, Nord Quantique | `H-bosonic` |
| Quantum annealing | D-Wave | `H-anneal` |
| NV centers / diamond | Sensing + compute; Quantum Brilliance | `H-nv` |
| Cryogenics & dilution refrigerators | Bluefors, Oxford Instruments, Maybell | `H-cryo` |
| Control electronics & I/O | Qblox, Quantum Machines, Zurich Instruments, Keysight | `H-control` |
| Fabrication & supply chain | Foundries, wafers, cabling, rare materials, TLS defects | `H-fab` |
| Interconnects & modular QC | Chip-to-chip, photonic links, networked processors | `H-intercon` |
| Microwave↔optical transduction | Bridging mK microwave qubits to optical fiber; gates fridge-to-fridge modularity | `H-transduce` |
| Single-photon detectors / SNSPDs | Photon counting for photonic QC & QKD; Single Quantum, ID Quantique, Photon Spot | `H-detect` |
| Cryogenic control ASICs | Cryo-CMOS control/readout in the fridge; Intel Horse Ridge, SemiQon, Equal1 | `H-cryocmos` |
| Laser & photonics subsystems | Stabilized lasers/PICs for ion/atom/NV machines; TOPTICA, M Squared, Vescent | `H-lasers` |
| Deterministic photon sources | Single-photon / entangled-pair emitters; Quandela quantum dots, SPDC, Sparrow | `H-photonsource` |
| Optical frequency combs | Shared ruler-for-light under clocks/timing/atomic-machine lasers; microcombs, NIST | `H-frequencycomb` |
| Quantum-limited amplifiers | JPA/TWPA at mK + HEMT at 4 K for single-shot readout; Silent Waves, Low Noise Factory | `H-paramp` |
| Packaging & 3D integration | Flip-chip, TSVs, interposers, chiplets; MIT-LL, IBM, Google, QuantWare | `H-package` |
| Ion-trap chip fabrication | Microfabricated surface/QCCD traps; Sandia HOA/Enchilada, Honeywell, Infineon | `H-iontrap` |
| UHV & atomic-source systems | Ultra-high-vacuum + cryogenic chambers for ion/atom machines; sets atom-loss floor | `H-uhv` |
| 300 mm foundry ecosystem | Who manufactures qubits at wafer scale; imec, GlobalFoundries, Intel, SkyWater | `H-foundry` |
| Quantum-dot vs donor spin fork | The silicon-spin strategic split; SQC (donor) vs Diraq/imec/Intel (dots) | `H-spinsplit` |
| Cryogenic microwave wiring | Passive coax / attenuators / ferrite isolators from 300 K to mK; the line-count scaling wall (split from H-cryo/H-fab) | `H-wiring` |
| Spin-photon interfaces | Emitters entangling a matter spin with a flying photon; silicon T-centers, diamond SiV/SnV, erbium — the matter-qubit networking node | `H-spinphoton` |

## Layer 2 — The stack: from a noisy qubit to a useful answer · §03

| Node | What | ID |
|---|---|---|
| Gates & circuits | Universal gate sets, native gates, connectivity | `S-gates` |
| Noise, NISQ & error mitigation | Where the field is today; ZNE, PEC | `S-nisq` |
| Quantum error correction | Surface code, qLDPC, magic-state distillation, threshold theorem | `S-qec` |
| Logical qubits & fault tolerance | The line between demos and utility | `S-logical` |
| Algorithms — Shor | Factoring; the reason cryptography must migrate | `S-shor` |
| Algorithms — Grover | Unstructured search, quadratic speedup | `S-grover` |
| Algorithms — VQE / QAOA | Near-term variational chemistry & optimization | `S-variational` |
| Algorithms — HHL & quantum linear algebra | Speedups (and the fine print) | `S-hhl` |
| Quantum simulation | Simulating quantum systems — Feynman's original pitch | `S-qsim` |
| Quantum machine learning | QML, kernels, hybrid; the hype-heavy corner | `S-qml` |
| Compilers, transpilers, middleware | Qiskit, Cirq, PennyLane, tket, Braket SDK | `S-software` |
| Benchmarks & "advantage" claims | Quantum volume, CLOPS, algorithmic qubits, supremacy/advantage history | `S-bench` |
| Cloud QPU access | IBM Quantum, AWS Braket, Azure Quantum, Google | `S-cloud` |
| QFT & phase estimation | The primitive under Shor/HHL/simulation; QPE depth is a FT problem | `S-qft` |
| Quantum walks & element distinctness | O(N^{2/3}) distinctness, BQP-universal walks, algorithmic framework | `S-walk` |
| Quantum Monte Carlo / amplitude estimation | Quadratic speedup for expectation values; feeds finance | `S-qmc` |
| Real-time QEC decoding | Decoder as its own discipline — Riverlane, ASIC/FPGA, the throughput wall | `S-decoders` |
| Quantum RAM (qRAM) | The load-bearing, largely-unproven data-loading assumption under HHL/QML | `S-qram` |
| Certified randomness | First delivered advantage application — JPMorgan/Quantinuum, Nature 2025 | `S-certrand` |
| QSVT — quantum singular value transformation | The modern unifying lens: HHL/Grover/Hamiltonian-sim as one framework (Gilyén et al. 2019) | `S-qsvt` |
| Hamiltonian simulation methods | Trotter / qDRIFT / LCU / qubitization — the how behind digital quantum simulation | `S-hamsim` |
| Tensor-network classical simulation | The classical counterfactual that decides every advantage claim (MPS, contraction) | `S-tensornet` |
| Classical shadows | Predict many properties from few measurements; size-independent sample complexity | `S-shadows` |
| Error mitigation as a discipline | ZNE/PEC/symmetry/virtual-distillation taxonomy; exponential sampling ceiling | `S-errmit` |
| Circuit knitting & cutting | Run big circuits on small QPUs via quasiprobability; exponential cut overhead | `S-circuitcut` |
| Pulse-level & optimal control | GRAPE/CRAB/Krotov/DRAG — where a gate becomes an analog waveform | `S-optcontrol` |
| Quantum advantage complexity theory | BQP/BPP, oracle & sampling separations — what "advantage" formally means | `S-complexity` |

## Layer 3 — Adjacent quantum technologies (not compute) · §04

| Node | What | ID |
|---|---|---|
| Quantum key distribution (QKD) | Provably secure key exchange; BB84, E91 | `A-qkd` |
| Quantum internet & repeaters | Entanglement distribution, memories, the future network | `A-qinternet` |
| Satellite QKD | Micius, space-based entanglement | `A-satqkd` |
| Post-quantum cryptography (PQC) | NIST standards (Kyber/ML-KEM, Dilithium), migration, HNDL threat | `A-pqc` |
| Quantum sensing & metrology | The nearest-term commercial quantum tech | `A-sensing` |
| Atomic clocks & timing | Optical clocks, PNT, GPS-free timing | `A-clocks` |
| Magnetometry | SQUID, OPM, brain imaging (MEG), mineral exploration | `A-magneto` |
| Gravimetry & inertial nav | Cold-atom gravimeters, GPS-free navigation | `A-gravimetry` |
| Quantum imaging & radar | Ghost imaging, quantum illumination, LiDAR | `A-imaging` |
| Quantum materials | Topological insulators, high-Tc superconductors, 2D materials | `A-materials` |
| Quantum RNG | Certified randomness from quantum sources | `A-qrng` |
| Quantum memories (component industry) | Rack-mounted/room-temp memories for repeaters; Qunnect, Aliro | `A-qmemory-hw` |
| Squeezed light (cross-cutting resource) | Sub-shot-noise light; LIGO production use, Xanadu CV/GKP compute | `A-squeezed` |
| Quantum/optical time-transfer networks | Comparing distant clocks over fiber/free-space; supports SI-second redefinition | `A-timedist` |
| NV-diamond sensing | Room-temp atom-scale sensing; Element Six/Bosch, SBQuantum, QDTI | `A-nvsensing` |
| Assured PNT / GPS-denied navigation | System-level fusion of clock + cold-atom IMU + magnetometry; Q-CTRL, SandboxAQ, DARPA RoQS/PINS | `A-pnt` |
| Rydberg RF electrometry / quantum antennas | Atom-based, self-calibrated RF receivers; Rydberg Technologies, Infleqtion | `A-rydberg` |
| Atom interferometry (platform) | Matter-wave interferometry under gravimetry/IMU + fundamental physics; MAGIS-100, AION | `A-atominterf` |
| Entanglement-based clock networks | GHZ-entangled clocks toward Heisenberg-limited timekeeping (contested advantage) | `A-entclock` |
| Quantum-secured / -resistant blockchain | PQC signatures on-chain (Algorand Falcon, QRL) + QKD-secured ledgers (niche) | `A-qblockchain` |
| Quantum-enhanced MRI/NMR & biomagnetism | Hyperpolarization (NVision) + NV/atomic magnet-free NMR + OPM MEG/MCG | `A-qmri` |
| Quantum-dot displays (boundary case) | QLED as quantum *material* not quantum tech; the QD single-photon source is the real thread | `A-qdisplay` |

## Layer 4 — Industries: where quantum actually lands · §05

| Industry | Use cases · anchor players | ID |
|---|---|---|
| Finance | Portfolio optimization, Monte Carlo pricing, risk, fraud — JPMorgan, Goldman, HSBC, Wells Fargo | `I-finance` |
| Pharma & healthcare | Drug discovery, protein folding, molecular sim — Boehringer, Roche, Cleveland Clinic, Moderna | `I-pharma` |
| Chemicals & materials | Catalysts, batteries, nitrogen fixation, carbon capture — BASF, Dow, Mitsubishi Chemical | `I-chem` |
| Energy & utilities | Grid optimization, battery chemistry, fusion, oil & gas — ExxonMobil, E.ON, EDF | `I-energy` |
| Logistics & supply chain | Routing, scheduling, traffic — DHL, Volkswagen, Airbus, DB | `I-logistics` |
| Automotive | Materials, batteries, aerodynamics, autonomous — BMW, Mercedes, Ford, Hyundai | `I-auto` |
| Aerospace & defense | Sensing, nav, sim, codebreaking — Airbus, Boeing, Lockheed, DARPA, DoD | `I-aerospace` |
| Telecom & networking | Quantum-secure networks, optimization — BT, Verizon, SK Telecom, NTT | `I-telecom` |
| Cybersecurity | PQC migration, "harvest now decrypt later," QKD networks | `I-cyber` |
| AI & machine learning | Quantum ML, hybrid pipelines, sampling | `I-ai` |
| Climate & sustainability | Carbon capture, fertilizer (Haber-Bosch) chemistry, emissions optimization | `I-climate` |
| Insurance & risk | Catastrophe modeling, actuarial optimization | `I-insurance` |
| Manufacturing & industrials | Process optimization, digital twins, quality | `I-manufacturing` |
| Oil & gas | Seismic inversion, reservoir sim, LNG logistics, materials | `I-extractive` |
| Space & Earth observation | Orbit optimization, quantum sensors on satellites | `I-space` |
| Government services | Tax/fraud detection, customs, census, public-sector optimization (distinct from defense) | `I-gov` |
| Agriculture & food science | Precision ag, fertilizer/nitrogen-fixation chemistry, agri sensing | `I-agri` |
| Retail | Demand forecasting, pricing, assortment/shelf optimization, recommendation | `I-retail` |
| Media & entertainment | Procedural generation, rendering, QRNG content, ad/recommendation optimization | `I-media` |
| Construction & built environment | Structural materials sim, project scheduling, urban microclimate | `I-construction` |
| Air-traffic management | Traffic-flow optimization, trajectory deconfliction, gate scheduling | `I-atm` |
| Semiconductors & EDA | Device-materials sim, computational lithography, quantum-chip EDA; the fab base | `I-semiconductor` |
| Weather & climate modeling | NWP / fluid-dynamics PDEs, quantum linear-solvers, QML nowcasting (distinct from `I-climate` chemistry) | `I-weather` |
| Nuclear & fusion | Plasma dynamics + stability (QAOA), nuclear-structure sim, reactor/fuel optimization | `I-nuclear` |
| Healthcare imaging & diagnostics | OPM-MEG brain imaging, NV/hyperpolarized MRI contrast, quantum-enhanced imaging (sensing, near-term) | `I-healthimaging` |
| Mining & mineral exploration | Diamond-magnetometer + cold-atom gravimeter critical-minerals exploration; mine-plan optimization | `I-mining` |
| Intelligence & cryptanalysis | Offensive SIGINT: Shor-driven decryption, harvest-now-decrypt-later, intercept analytics | `I-intelligence` |

## Layer 5 — Ecosystem, money & geopolitics · §06

| Node | What | ID |
|---|---|---|
| National programs — US | National Quantum Initiative, NQI reauthorization, DOE, NSF, NIST | `E-us` |
| National programs — China | Reported ~$15B+ commitment, USTC, Micius, Jiuzhang | `E-china` |
| National programs — EU | Quantum Flagship (€1B+), EuroQCI, per-member strategies | `E-eu` |
| National programs — UK | National Quantum Strategy (£2.5B), NQCC | `E-uk` |
| National programs — others | India, Japan, Australia, Canada, Israel, South Korea, Germany | `E-others` |
| Private investment & VC | Funding rounds, SPACs, market size, the 2024–26 capital cycle | `E-vc` |
| Standards bodies | NIST, ISO/IEC JTC1, ETSI, IEEE, ITU | `E-standards` |
| Talent & workforce | The skills gap, university programs, quantum education | `E-talent` |
| Market forecasts | BCG, McKinsey, IDC, Gartner hype cycle — with skepticism | `E-market` |
| Patents & IP landscape | Who owns what; national patent races | `E-patents` |
| Export controls | US 2024 quantum export rule + allied plurilateral coordination (NL, JP, UK, FR) | `E-export` |
| Supply-chain chokepoints | Dilution fridges/He-3, quantum-grade lasers, specialty fab (geopolitics vs H-fab technical) | `E-supplychain` |
| Open-source ecosystem | Qiskit/Cirq/PennyLane governance as soft power / lock-in; OpenQASM/QIR portability | `E-oss` |
| Defense funding channel | DARPA QBI (quantum benchmarking) + defense procurement, distinct from civilian NQI | `E-defense` |
| China's parallel software stack | Origin/QPanda, Baidu Paddle Quantum, Huawei HiQ as a fork / soft-power risk vs Qiskit/Cirq | `E-china-stack` |
| Consolidation wave (M&A / IPO) | IonQ roll-ups, D-Wave/Xanadu/IQM/Quantinuum exits 2025–26; distinct from primary VC | `E-mna` |
| Quantum-safe migration market | PQC migration as its own economic market (HNDL-driven), distinct from A-pqc crypto + E-market | `E-pqcmarket` |
| Insurance & liability for quantum risk | Cyber/D&O underwriting of the quantum threat; mirror of I-insurance | `E-insurance` |
| Sovereign compute & national champions | Gov-hosted machines (EuroHPC six-site fleet) + equity stakes; on-prem sovereignty | `E-sovereign` |
| Metrology & SI-redefinition governance | BIPM/CIPM/CGPM, second-redefinition to optical clocks (CGPM 2026), Kibble balance | `E-metrology-gov` |
| Workforce immigration & clearance | Visa/deemed-export/clearance filter on who can fill the talent gap; distinct from E-talent | `E-immigration` |
| Academic-lab leaderboard | USTC/MIT/Harvard/Delft/Oxford research base; the industry map one generation early | `E-labs` |

## Layer 6 — History: the full timeline · §07

| Era | Milestones | ID |
|---|---|---|
| Old quantum theory (1900–1925) | Planck, Einstein photoelectric, Bohr atom, de Broglie | `T-old` |
| The formalism (1925–1935) | Heisenberg matrix mechanics, Schrödinger, Dirac, EPR paradox | `T-formalism` |
| Foundations era (1935–1980) | Bell's theorem (1964), Bell tests, Aspect experiments | `T-foundations` |
| Birth of quantum computing (1980–1994) | Manin, Feynman (1981), Deutsch, Shor's algorithm (1994) | `T-birth` |
| Early experiments (1995–2010) | Cirac-Zoller, first gates, NMR Shor demo, DiVincenzo criteria | `T-early` |
| The engineering race (2011–2019) | D-Wave, IBM/Google scale-up, Google "supremacy" (2019) | `T-race` |
| The error-correction era (2020–now) | Logical qubits, QuEra 48-logical, Google Willow, utility-scale claims | `T-ecera` |
| Loophole-free Bell tests (2015) | Delft/NIST/Vienna close detection + locality together — the foundations capstone | `T-belltests` |
| The NISQ era (2018) | Preskill's coinage — the vocabulary of the noisy near-term machine | `T-nisq` |
| 1927 Solvay Conference & Bohr–Einstein debates | The interpretation argument goes public; entanglement's opening act | `T-solvay` |
| EPR paradox & Bohr's reply (1935) | The field's most fertile question — locality vs. completeness — as its own milestone | `T-epr` |
| Birth of quantum information theory (1970–84) | Wiesner conjugate coding → Holevo bound → no-cloning → BB84 | `T-qinfobirth` |
| "Second quantum revolution" framing (2003) | Dowling–Milburn coinage — passive understanding → active single-system engineering | `T-2ndrev` |
| Nobel Prizes as the quantum spine (1918→2025) | The establishment's ratification timeline; Planck to Clarke/Devoret/Martinis | `T-nobel` |
| The "quantum winter" question | AI-winter analogy — the funding-downturn / unmet-promise risk, graded honestly | `T-winter` |

## Layer 7 — The honest frontier & open problems · §08

| Node | What's unsettled | ID |
|---|---|---|
| Fault-tolerant scaling | Millions of physical qubits per useful computation — how far off, really | `O-scaling` |
| Error-correction overhead | The brutal physical:logical ratio | `O-overhead` |
| Decoherence & materials defects | Two-level systems, the materials science bottleneck | `O-materials` |
| Quantum advantage in practice | Which claimed speedups survive classical counterattack | `O-advantage` |
| Hype vs reality | Vendor timelines, "quantum-washing," the valuation question | `O-hype` |
| Room-temperature & photonic scaling | The paths that would change the economics | `O-roomtemp` |
| The killer app question | Is there a near-term application that pays for itself | `O-killerapp` |
| Interpretational & foundational openness | Measurement problem still unsolved | `O-foundations` |
| Real-time QEC decoding throughput | The classical co-processor bottleneck (~1 MHz/logical qubit); Riverlane | `O-decoder` |
| Chip-to-chip entanglement fidelity | Whether modular interconnects stay below threshold across module boundaries | `O-interconnect-loss` |
| Verifying a too-large computation | Certifying a result no classical machine can re-check (Mahadev) | `O-verification` |
| Funding-winter & talent attrition | Whether a capital downturn drains the field before roadmaps mature | `O-talent-attrition` |
| The classical-simulation frontier | Where the quantum-classical boundary actually sits vs the best classical method (tensor nets, belief propagation) | `O-classical-sim` |
| Benchmarking standardization crisis | No agreed cross-vendor yardstick; QV vs #AQ vs "logical qubits"; spoofable metrics | `O-benchmark-standard` |
| Business-model & ROI question | Who pays, at what margin — unit economics distinct from technical feasibility | `O-roi-business` |
| Energy consumption vs classical | Fixed cryo/control overhead vs joules-per-useful-answer; energetic advantage before computational | `O-energy` |
| The "quantum utility" definitional debate | Whether "utility" is a real milestone or a rhetorical hedge (IBM 2023 → classically simulated) | `O-utility-definition` |
| Cryptographically-relevant QC timeline | When Shor breaks RSA-2048; HNDL threat; Mosca's inequality (distinct from general FTQC) | `O-crqc-timeline` |

---

## The honest edge of the map
Named out loud so nothing hides: (1) vendor roadmaps are marketing until a peer
reviews them — every timeline node carries that caveat; (2) "quantum advantage"
is a moving target as classical algorithms improve; (3) QML is the most
hype-inflated corner and gets graded hardest; (4) national-program dollar figures
are frequently inflated or double-counted; (5) quantum biology (`F`-adjacent,
covered in the biophysics canon) is contested and lives in that branch, cross-linked
here rather than duplicated.
