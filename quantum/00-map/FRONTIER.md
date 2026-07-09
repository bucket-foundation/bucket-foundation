# Frontier — live worklist + random-walk expansion log

The worklist the `/loop` drains. Breadth phase: fill every node. Each node maps to
a card file in its chapter folder. Check off when filled; deepen after 90%.

## Legend
`[ ]` empty · `[~]` stub filled (counts toward capacity) · `[x]` depth-complete

## L0 — Foundations · `01-foundations/`
- [x] F-superpos · F-measure · F-entangle · F-bell · F-decoher · F-qubit
- [x] F-nocloning · F-qinfo · F-uncertainty · F-interp · F-qft · F-qthermo
- [x] F-tunneling · F-contextuality · F-statistics · F-adiabatic · F-teleport · F-berry
- [x] F-povm · F-purification · F-liebrobinson · F-pbr · F-wigner · F-stabilizer · F-discord · F-entropy-ineq  ← NEW (depth-era random walk)

## L1 — Hardware · `02-hardware/`
- [x] H-supercon · H-ion · H-photonic · H-neutral · H-silicon · H-topo · H-bosonic
- [x] H-anneal · H-nv · H-cryo · H-control · H-fab · H-intercon
- [x] H-transduce · H-detect · H-cryocmos · H-lasers
- [x] H-photonsource · H-frequencycomb · H-paramp · H-package · H-iontrap · H-uhv · H-foundry · H-spinsplit  ← cycle-3 depth pass + new nodes
- [x] H-wiring · H-spinphoton  ← polish-pass split nodes (depth-complete)

## L2 — Stack & algorithms · `03-stack-algorithms/`
- [x] S-gates · S-nisq · S-qec · S-logical · S-shor · S-grover · S-variational
- [x] S-hhl · S-qsim · S-qml · S-software · S-bench · S-cloud
- [x] S-qft · S-walk · S-qmc · S-decoders · S-qram · S-certrand
- [x] S-qsvt · S-hamsim · S-tensornet · S-shadows · S-errmit · S-circuitcut · S-optcontrol · S-complexity  ← cycle-3 depth pass + new nodes

## L3 — Adjacent tech · `04-adjacent-tech/`
- [x] A-qkd · A-qinternet · A-satqkd · A-pqc · A-sensing · A-clocks
- [x] A-magneto · A-gravimetry · A-imaging · A-materials · A-qrng
- [x] A-qmemory-hw · A-squeezed · A-timedist · A-nvsensing
- [x] A-pnt · A-rydberg · A-atominterf · A-entclock · A-qblockchain · A-qmri · A-qdisplay  ← cycle-3 depth pass + new nodes

## L4 — Industries · `05-industries/`
- [x] I-finance · I-pharma · I-chem · I-energy · I-logistics · I-auto · I-aerospace
- [x] I-telecom · I-cyber · I-ai · I-climate · I-insurance · I-manufacturing
- [x] I-extractive · I-space
- [x] I-gov · I-agri · I-retail · I-media · I-construction · I-atm
- [x] I-semiconductor · I-weather · I-nuclear · I-healthimaging · I-mining · I-intelligence  ← cycle-3 depth pass + new nodes

## L5 — Ecosystem & geopolitics · `06-ecosystem-geopolitics/`
- [x] E-us · E-china · E-eu · E-uk · E-others · E-vc · E-standards · E-talent
- [x] E-market · E-patents
- [x] E-export · E-supplychain · E-oss · E-defense
- [x] E-china-stack · E-mna · E-pqcmarket · E-insurance · E-sovereign · E-metrology-gov · E-immigration · E-labs  (new, cycle-2 depth random-walk)

## L6 — History · `07-history/`
- [x] T-old · T-formalism · T-foundations · T-birth · T-early · T-race · T-ecera
- [x] T-belltests · T-nisq
- [x] T-solvay · T-epr · T-qinfobirth · T-2ndrev · T-nobel · T-winter  *(cycle-3 depth-era random-walk adds)*

## L7 — Frontier & open · `08-frontier-open/`
- [x] O-scaling · O-overhead · O-materials · O-advantage · O-hype · O-roomtemp
- [x] O-killerapp · O-foundations
- [x] O-decoder · O-interconnect-loss · O-verification · O-talent-attrition
- [x] O-classical-sim · O-benchmark-standard · O-roi-business · O-energy · O-utility-definition · O-crqc-timeline  ← cycle-3 depth pass + new nodes

---

## Random-walk expansion log
Newly discovered nodes get appended to the map AND here. Format:
`YYYY-MM-DD · cycle N · +node-id (why) · source`

- 2026-07-08 · cycle 0 · scaffold seeded with 94 nodes across 8 layers.
- 2026-07-08 · cycle 0 · MOVED the "Quantum Project" (qc-embedding-similarity — swap/Hadamard-test quantum-kernel reference impl) out of biophysics-phd-review into quantum/reference-impl/. Depth anchor for L2. Has its own Claude Science setup.
- 2026-07-08 · cycle 1 · 8 breadth agents filled all 94 original nodes (89 cards + reference-impl). evidence/CONFLICTS.md created with 8 conflict objects.
- 2026-07-08 · cycle 1 · +36 gap nodes from random-walk (see 00-map/EXPANSION-CANDIDATES.md): L0+6 L1+4 L2+6 L3+4 L4+6 L5+4 L6+2 L7+4. Map total 94→130. Breadth 94/130 = 72%. Cycle 2 fills these.
- 2026-07-08 · cycle 3 · DEPTH pass on all 19 L2 stack/algorithm cards → `[x]` depth-complete (~450–600 words each: proven speedup class + complexity, primary papers w/ arXiv/DOI, 2025–26 results, honest caveats — dequantization, FT overhead, oracle/qRAM assumptions). Cross-linked the swap/Hadamard-test reference-impl into S-hhl/S-qml/S-qsim/S-qft/S-bench/S-gates/S-nisq/S-cloud/S-software.
- 2026-07-08 · cycle 3 · +S-qsvt (queued node: quantum singular value transformation as the modern unifying lens — Gilyén et al. STOC 2019, Martyn et al. PRX Quantum 2021; recovers HHL/Grover/Hamiltonian-sim/QPE as special cases) · source arXiv:1806.01838, PRX Quantum 2, 040203.
- 2026-07-08 · cycle 3 · +7 new L2 nodes from random-walk: S-hamsim (Trotter/qDRIFT/LCU/qubitization — the how under S-qsim), S-tensornet (classical counterfactual that adjudicates every advantage claim), S-shadows (classical shadows, size-independent sample complexity), S-errmit (error mitigation as its own discipline w/ exponential ceiling, split from S-nisq), S-circuitcut (circuit knitting/cutting, quasiprobability, exponential cut overhead), S-optcontrol (pulse-level GRAPE/CRAB/Krotov/DRAG), S-complexity (BQP/BPP + oracle/sampling separations — Raz–Tal, Bravyi–Gosset–König, Aaronson–Arkhipov). QPE-variants folded into S-qft (avoided a duplicate node). L2 total 19→27. Map total 130→138.
- 2026-07-08 · cycle 3 (DEPTH) · §07 History: all 9 existing cards deepened to depth-complete [x] (T-old…T-nisq); dates/citations verified via WebSearch. T-ecera extended with verified mid-2026 milestones (QuEra 96-logical [[16,6,4]] Jan 2026; IBM Nighthawk/Loon Nov 2025; Quantinuum Helios Nov 2025 + IPO filing Jan 2026; Duke/IonQ 3-node entanglement Jun 2026; 2025 Nobel Clarke/Devoret/Martinis).
- 2026-07-08 · cycle 3 (DEPTH) · +6 new L6 nodes from depth-era random-walk: T-solvay (1927 Solvay/Bohr-Einstein), T-epr (1935 EPR-Bohr as own milestone), T-qinfobirth (Wiesner→Holevo→no-cloning→BB84, 1970-84), T-2ndrev (Dowling-Milburn 2003 coinage), T-nobel (Nobel spine 1918→2025), T-winter (quantum-winter/AI-winter analogy, graded honestly). Map L6 9→15; map total 130→136. Sources: Bacciagaluppi-Valentini 2009, arXiv:quant-ph/0206091, SIGACT News 15(1) 1983, Holevo 1973, nobelprize.org 2012/2022/2025, postquantum.com/Slate quantum-winter coverage.
- 2026-07-08 · cycle 3 (DEPTH) · L0 deepened all 18 original cards stub→depth-complete (each now ~580-685 words with a `## Core idea / key equation` section, ≥1 new landmark experiment with numbers, expanded cross-links). Sources verified against primary literature.
- 2026-07-08 · cycle 3 (DEPTH) · +8 L0 random-walk nodes (all written depth-complete): F-povm (POVMs/Naimark/weak measurement — the operational measurement model; twin of Stinespring), F-purification (Stinespring dilation, church of the larger Hilbert space; foundation of QEC threshold proofs), F-liebrobinson (emergent light cone; underpins area law & tensor-network limits), F-pbr (ψ-ontology; third no-go pillar with Bell + Kochen-Specker), F-wigner (quasiprobability negativity as computation resource; ties to F-contextuality/S-qec magic), F-stabilizer (Gottesman-Knill; backbone of S-qec surface/color codes), F-discord (correlations beyond entanglement; DQC1 mixed-state advantage candidate), F-entropy-ineq (strong subadditivity/Lieb-Ruskai + CKW monogamy → A-qkd security). Map L0 18→26, total 130→138.
- 2026-07-08 · cycle 3 (DEPTH) · §04 Adjacent tech: all 15 existing L3 cards deepened stub→depth-complete [x] (~450–600 words each; exact 2025–26 numbers — TF-QKD 1,002 km @ 0.0034 bit/s vs 111.74 kbit/s @ 202 km; Jinan-1 1.07 Mbit/pass @ 45× cheaper; NIST Al⁺ clock 8.1×10⁻¹⁹; OPM 7–15 fT/√Hz vs NV 9.4 pT/√Hz; Exail AQG ~1 µGal/1 h; QRNG 18.8 Gbit/s record & ~3 Gbit/s integrated; LIGO ~2–3 dB in-run squeezing — plus a per-card "honest call" commercial-vs-research verdict). Sources verified via WebSearch.
- 2026-07-08 · cycle 3 (DEPTH) · +7 new L3 nodes: A-pnt (queued — assured-PNT/GPS-denied nav as clock+cold-atom-IMU+magnetometer fusion; Q-CTRL Ironstone Opal 111×, AOSense ~5 m/hr, Tiqker on RN XV Excalibur, DARPA RoQS/PINS), A-rydberg (Rydberg RF electrometry / atomic quantum antennas — Rydberg Technologies, Infleqtion spectrum sensing; SI-traceable self-calibrated RF, advantage-vs-classical contested), A-atominterf (atom interferometry as its own platform — under gravimetry/IMU + MAGIS-100/AION physics), A-entclock (entanglement-based clock networks — Kómár 2014 GHZ Heisenberg scaling, 48 km syntonization <12 ps, contested advantage), A-qblockchain (quantum-resistant vs quantum-secured blockchain — Algorand Falcon mainnet Nov 2025, QRL XMSS, signature-bloat + unmovable-coins), A-qmri (quantum-enhanced MRI/NMR — NVision hyperpolarization 10⁴–10⁵×, NV/atomic magnet-free NMR, OPM biomagnetism), A-qdisplay (quantum-dot displays boundary case — PL-QLED is a quantum *material* not quantum tech; real thread = QD single-photon source H-photonsource). Map L3 15→22.
- 2026-07-08 · cycle 2 · DEPTH: all 14 original L5 (§06 ecosystem/geopolitics) cards deepened to depth-complete [x] with exact figures, dates, 2025–26 policy moves (June 2026 Trump quantum + PQC EOs, QC-ADDS, EuroHPC six-site fleet, McKinsey 2026 Monitor, IonQ M&A spree). All funding figures kept T5 with double-counting caveats.
- 2026-07-08 · cycle 2 · +E-china-stack (field-flagged): China's parallel software stack — Origin/QPanda + Origin Pilot (open-sourced Feb 2026), Baidu Paddle Quantum, Huawei HiQ — as a fork/soft-power risk vs Qiskit/Cirq. · postquantum.com, entangledfuture.com
- 2026-07-08 · cycle 2 · +E-mna: 2025–26 consolidation wave (IonQ roll-ups incl. Oxford Ionics $1.08B + SkyWater $1.8B; D-Wave/QCI $550M; Xanadu/IQM/Quantinuum listings; ~$5.7B H1-26 exits) — distinct from primary VC (E-vc). · Crunchbase, McKinsey, entangledfuture
- 2026-07-08 · cycle 2 · +E-pqcmarket: quantum-safe migration as its own HNDL-driven market ($0.5B–$15B depending on definition; ~$4.2B net-new 2025–26 federal spend post-FIPS) — distinct from A-pqc crypto + E-market. · FMI, MarketIntelo, Cloudflare
- 2026-07-08 · cycle 2 · +E-insurance: cyber/D&O underwriting of the quantum threat (Lloyd's; near-term claims judged unlikely; PQC-readiness folded into underwriting) — mirror of I-insurance. · Lloyd's/Finadium, Hogan Lovells, The Insurer
- 2026-07-08 · cycle 2 · +E-sovereign: sovereign compute + national champions (EuroHPC six-site fleet DE/FR/PL/CZ/ES/IT; US $2B Commerce equity stakes). · eurohpc-ju.europa.eu, CNN
- 2026-07-08 · cycle 2 · +E-metrology-gov: BIPM/CIPM/CGPM SI-redefinition governance; second→optical-clock decision heading to CGPM 2026; Kibble balance. · bipm.org, IOP Metrologia
- 2026-07-08 · cycle 2 · +E-immigration: visa/deemed-export/clearance filter on who can fill the talent gap (50% of DIB advanced-STEM foreign-born; June 2026 EO tightens counterintelligence) — distinct from E-talent. · IFP, CSIS, whitehouse.gov
- 2026-07-08 · cycle 2 · +E-labs: academic-lab leaderboard (USTC #1 Nature-Index output; MIT/Harvard/Maryland/Delft/Oxford/UNSW; labs→spinouts map). · Nature Index, EPJ Quantum Technology
- 2026-07-08 · cycle 3 (DEPTH) · §05 Industries: all 21 existing L4 cards deepened stub→depth-complete [x] (~500–600 words each). Each now carries a `## Proven today vs promise vs hype` verdict, sharper T2/T3-vs-T4/T5 tier separation, dated 2024–26 pilots, and dollar figures graded T5 with inflation/double-count caveats. Verified fresh via WebSearch: HSBC/IBM bond-fill 34% (Sept 2025), Q4Bio $2M photodynamic-therapy prize (Apr 2026), Ford Otosan D-Wave production (2024), NIST FIPS 203/204/205 + CNSA 2.0 2027, RSA-2048 estimate <1M qubits (2025–26), McKinsey ~$2.7T-by-2035 / BCG $450–850B-by-2040.
- 2026-07-08 · cycle 3 · +6 new L4 nodes from depth-era random-walk (genuinely non-duplicative): I-semiconductor (quantum-for-EDA/device-materials + the fab base; NVIDIA cuLitho/cuEST classical bar, Q-EDA stack arXiv 2606.17956), I-weather (NWP fluid-dynamics PDEs split from I-climate chemistry; OQI/CERN pilot, arXiv 2502.10488), I-nuclear (fusion plasma QAOA + nuclear-structure VQE, split from I-energy; Frontiers Phys Mar 2025, deuteron sim), I-healthimaging (OPM-MEG wearable brain imaging — Cerca, near-term sensing, split from I-pharma; NIHR IO Jan 2025), I-mining (diamond-magnetometer + gravimeter critical-minerals exploration — SBQuantum QUAMINEX 2024, split from I-extractive), I-intelligence (offensive SIGINT/cryptanalysis + HNDL, split from I-aerospace/I-cyber). Map L4 21→27; retitled I-climate→"Climate & sustainability", I-extractive→"Oil & gas".
- 2026-07-08 · cycle 3 (DEPTH) · §08 Frontier: all 12 existing L7 cards deepened stub→depth-complete [x] (~550-680 words each: sharpened open question, BOTH camps first-class with named people + exact claims + tiers, 2025-26 developments, precise resolution criteria). Key freshes: IBM modular roadmap (Loon→Kookaburra→Cockatoo→Starling→Blue Jay); Aaronson Mar-2026 update ("2025 met/exceeded expectations", Kalai "fighting a losing battle"); QuEra 96-logical Jan-2026; four teams below threshold; Quantum Echoes vs arXiv:2604.15427; Flatiron Science May-2026 vs D-Wave rebuttal; Microsoft Majorana Legg critique Jun-2026; Gidney <1M-qubit RSA-2048.
- 2026-07-08 · cycle 3 (DEPTH) · +6 new L7 nodes from depth-era random-walk: O-classical-sim, O-benchmark-standard, O-roi-business, O-energy, O-utility-definition, O-crqc-timeline. Map L7 12→18. CONFLICTS.md +5 objects: C-majorana-existence, C-crqc-timeline, C-quantum-utility, C-energy-advantage, C-benchmark-metrics (+ enriched C-ftqc-timeline, C-advantage-survival). Sources: arXiv 2505.15917/2604.15427/2601.08068/2605.19854/2605.09580/2506.19337; Science adx2728; Nature 618:500; scottaaronson.blog/?p=9425; QED-C 2026; Global Risk Institute survey.
- 2026-07-08 · cycle 3 (DEPTH) · §02 Hardware: all 17 existing L1 cards deepened stub→depth-complete [x] (~450–600 words each). Added 2025–26 numbers: transmon T1 record 1.68 ms (Princeton, Nature s41586-025-09687-4); Helios 98 qubits @ 99.921% 2Q (arXiv:2511.05465 + Sandia/Nature Jun 2026); QuEra 48-logical + >2 hr continuous 3,000-atom op; Diraq/imec >99% 2Q from 300 mm CMOS; SQC 99.99% donor 2Q + Grover 98.9% (Nature Dec 2025); Alice&Bob Boson 4 >1 hr bit-flip; AWS Ocelot ~1 s (Nature Feb 2025); Majorana 2 contested. IBM Starling/Nighthawk/Loon/Kookaburra roadmap dates verified. Vendor claims graded T4-until-reproduced per SCHEMA.
- 2026-07-08 · cycle 3 · +2 queued L1 nodes filled: H-photonsource (deterministic single-photon/entangled-pair sources — Quandela QD >30% brightness / g²<0.05 / HOM>90%, 88% two-source indistinguishability filter-free 2026, vs SPDC; emitter twin of H-detect), H-frequencycomb (optical combs as shared infra under A-clocks/A-timedist/H-lasers — Vernier microcomb OFD, Nature Photonics 2025). · quandela.com, arXiv:2602.06140, Nature Photonics s41566-025-01617-0
- 2026-07-08 · cycle 3 · +6 new L1 nodes from hardware random-walk: H-paramp (JPA/TWPA + HEMT readout chain; Caves ½-photon SQL, near-quantum-limited multiplexed readout — Science aaa8525), H-package (flip-chip/TSV/interposer 3D integration — MIT-LL arXiv:2107.11140, QuantWare; the post-2D-wiring path), H-iontrap (microfabricated surface/QCCD traps — Sandia HOA/Enchilada 200-ion, Honeywell Helios fab), H-uhv (UHV + cryogenic atom chambers — 3,000 s trap lifetime arXiv:2412.09780; sets atom-loss floor), H-foundry (the 300 mm wafer-scale manufacturing ecosystem as its own node — imec/GlobalFoundries/Intel/SkyWater; distinct from H-fab materials), H-spinsplit (the quantum-dot-vs-donor strategic fork inside H-silicon — SQC donor vs Diraq/imec dots). Map L1 17→25.
- 2026-07-08 · cycle 3b · RENDERING complete: 555 LaTeX/mhchem snippets -> SVG (0 fail), figures via matplotlib+RDKit, manual.html (3.4MB) + manual.pdf (2.1MB, WeasyPrint) built + mirrored to gdrive + artifact republished. 182/182 depth-complete.
- 2026-07-08 · polish · PRIMARY-SOURCE VERIFICATION of contested mid-2026 items: (1) QuEra 96-logical CONFIRMED peer-reviewed Nature s41586-025-09848-5 ([[16,6,4]] high-rate code, 448 atoms, ~4.7:1) → upgraded T3→T2 in S-logical/T-ecera/H-neutral; (2) Duke/IonQ 3-node GHZ primary = Goetting et al., arXiv:2606.17173 (T3 preprint) → H-intercon/T-ecera; (3) Majorana 2 — no independent replication found beyond Legg's Nature critique (d41586-026-01788-y); Microsoft filed formal Nature reply; kept contested; (4) Kalai↔Aaronson Mar-2026 exchange sourced both posts (scottaaronson.blog/?p=9425 + gilkalai.wordpress.com/2026/03/10) → O-hype/O-scaling now carry both sides; (5) Flatiron vs D-Wave — NO third-party adjudication found, stays contested → O-advantage + CONFLICTS. CONFLICTS.md updated: C-majorana-existence, C-advantage-survival, C-ftqc-timeline.
- 2026-07-08 · polish · +H-wiring (passive cryogenic microwave supply chain — coax/attenuators/ferrite isolators; the line-count scaling wall, split from H-cryo/H-fab; Krinner EPJ QT 2019, Delft Circuits Cri/oFlex) and +H-spinphoton (spin-photon interfaces — silicon T-centers/diamond SiV-SnV/erbium bridging matter qubits to photonics; Photonic Inc., Harvard SiV cavity-QED). Map L1 25→27; total 138→140. I-water + I-foodbev SKIPPED: no real dated pilot found (only speculative/anticipatory coverage) — would violate the evidence discipline to add.
