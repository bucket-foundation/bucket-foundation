# Conflicts — first-class disagreement objects

Per `SCHEMA.md` rule 4: when two credible sources disagree, keep both. This file
is the registry. Cards link here; the manual never silently picks a side.

---


### C-ftqc-timeline — When (if ever) does large-scale fault-tolerant quantum computing arrive

| Who | Position | Tier |
|---|---|---|
| IBM (modular roadmap, Jun 2025) | Loon 2025 → Kookaburra 2026 (first FT module) → Cockatoo 2027 → Starling 2028-29 (~200 logical / 100M gates) → Blue Jay 2033 (2000+ logical / 1B gates); qLDPC cuts overhead up to 90% | T4 |
| Google Quantum AI (roadmap) | useful error-corrected machine ~2029-2030 | T4 |
| Scott Aaronson (Mar 2026) | 2025 met/exceeded hardware expectations (>99.9% 2Q gate fidelity on multiple platforms); takes 2028-29 pronouncements more seriously; declines a firm date | T3 (expert) |
| Jensen Huang (Nvidia, Jan 2025) | very useful QC is 15-30 years out (~20 central); walked back at GTC Quantum Day | T5 |
| Gil Kalai | FTQC impossible in principle (correlated noise defeats threshold theorem); correlations observable in noisy-circuit simulations. Mar-2026 reply (gilkalai.wordpress.com, 10 Mar 2026): concedes he "starts with quantum computation being impossible as [an] axiom" but insists the observed exponential error decay "does not contradict my conjectures regarding correlated errors," which he expects at "hundreds… and thousands of gates" | T3 (contested minority) |
| Manifold prediction markets (2026) | steady engineering gains, no breakthrough | T5 |

**Resolves when:** IBM Kookaburra (2026) then Starling (2028-29) hitting spec, independently verified — or missing it. Aaronson (2026) notes a dozen experiments now reach the same below-threshold conclusion, calls Kalai's path "narrower and narrower"; Kalai's position dies with any sustained large-scale fault tolerance and strengthens with each correlated-noise surprise at scale. See O-scaling.

### C-overhead-ratio — The realistic all-in physical:logical qubit ratio for useful algorithms

| Who | Position | Tier |
|---|---|---|
| QuEra / Quantinuum / qLDPC papers | ratios of ~2:1 to ~13:1 demonstrated or roadmapped; qLDPC cuts surface-code overhead 10-20x | T3/T4 |
| surface-code resource analyses | at target logical error 1e-9..1e-12 with T-factories and routing, all-in cost stays hundreds-to-1000:1 | T3 |

**Resolves when:** an end-to-end fault-tolerant algorithm (incl. T-gates) at code distance >=11 with the full published physical budget; sustained <100:1 settles it for qLDPC optimists.

### C-tls-scaling — Whether materials defects (TLS) are an engineering nuisance or a scaling wall

| Who | Position | Tier |
|---|---|---|
| fabrication groups (arXiv:2602.11469 etc.) | TLS density is controllable — 2/3 reduction via electrode/grain engineering; tuning + ML mitigation handle the rest | T3 |
| TLS-dropout studies (arXiv:2605.02755) + Kalai | dropouts and correlated noise scale with system size and violate QEC's error assumptions | T3 (Kalai position contested) |

**Resolves when:** a 10k-qubit chip holding all qubits within QEC spec for weeks, defect statistics published — or persistent out-of-spec fractions that grow with chip size.

### C-advantage-survival — Whether any claimed quantum speedup survives classical counterattack

| Who | Position | Tier |
|---|---|---|
| Google (Quantum Echoes, Oct 2025) | first verifiable quantum advantage, 13,000x vs best classical OTOC method on 105-qubit Willow | T4→T3 (published, vendor-led, young) |
| arXiv:2604.15427 (2026) | belief-propagation tensor networks CANNOT feasibly simulate Quantum Echoes — early sign the claim holds | T3 |
| D-Wave (Science, Mar 2025) | beyond-classical spin-glass simulation on 5,000+ qubits; classical MPS would need ~1M yrs on Frontier | T2 paper / contested claim |
| Flatiron Institute (Tindall et al., Science adx2728, May 2026) + Sels (EPFL) | belief-propagation tensor networks compute the same annealing dynamics classically; some instances on a laptop; baselines were weak | T2/T3 |
| D-Wave rebuttal (May 2026) | the classical framework fails to scale across the most complex topologies/measurements; specifically Tindall et al. did not attempt the hardest 3D lattice geometry, the largest 3D simulations, the low-precision ensembles where correlations grow fastest, or the full-state/fourth-order observables of the original Science paper; result stands | T4 |
| third-party adjudication status (mid-2026) | NONE — no neutral body has adjudicated the D-Wave/Flatiron spin-glass dispute; the specific contested benchmark instances remain unmatched classically, so it is contested, not overturned | T3 (absence of adjudication) |
| Ewin Tang (dequantization program) | quantum recommendation systems + much of QML linear algebra have no exponential advantage | T2 |
| arXiv:2510.06324 | noisy circuit sampling classically simulable in quasi-polynomial time under approximate Markovianity | T3 |

**Resolves when:** a verifiable advantage claim standing ~3+ years against motivated classical attack. Quantum Echoes is the live test case — if tensor-network attacks keep failing on it through 2027-28 it is the first durable useful-ish advantage. See O-advantage, O-classical-sim.

### C-hype-valuation — Whether 2024-26 quantum valuations reflect substance or a bubble

| Who | Position | Tier |
|---|---|---|
| vendors + analysts (BCG/McKinsey) | convergent 2029-30 roadmaps + real QEC milestones justify multi-decade value; tens of billions TAM | T4/T5 |
| Hossenfelder | hype will crash; real-world logistics/finance value dissolves under practical constraints | T5 |
| Kalai | the entire FTQC premise fails, so valuations rest on nothing | T3 (contested minority) |
| market analysts (2025-26) | 150x-3,000x sales multiples are unjustifiable pending revenue | T5 |

**Resolves when:** revenue — a paying customer choosing quantum on cost/performance grounds; or a funding winter after missed 2029-30 roadmap dates.

### C-photonic-scaling — Whether photonics' room-temperature path actually changes the economics

| Who | Position | Tier |
|---|---|---|
| Xanadu (Aurora, Nature 2025) | modular photonic architecture scales in principle to millions of qubits; ~1,000 logical by 2029 | T2 demo / T4 extrapolation |
| PsiQuantum + GlobalFoundries | million-qubit photonic systems manufacturable in existing fabs, utility-scale sites underway | T4 |
| photonics skeptics (CACM etc.) | SNSPD detectors stay cryogenic, photon loss sits orders of magnitude above fusion thresholds, and 12 qubits→1M is the field's largest extrapolation | T3 |

**Resolves when:** any photonic machine demonstrating error-corrected logical qubits with published end-to-end loss budgets; PsiQuantum's first full-stack public benchmark.

### C-killer-app — Whether a near-term application exists that pays for the machine

| Who | Position | Tier |
|---|---|---|
| chemistry camp (Aspuru-Guzik line, Quantinuum, pharma partners) | molecular simulation is the killer app, commercial in 5-10 years given hundreds of logical qubits | T2 theory / T4-T5 timeline |
| feasibility skeptics (2025-26 studies, New Scientist) | industrially relevant chemistry needs resources that stay daunting; chemistry may miss killer-app status | T3 |
| optimization skeptics (Hossenfelder; quadratic-speedup analyses) | optimization/finance value evaporates under QEC overhead and real-world constraints | T2/T5 |
| Aaronson | the honest killer app is simulating quantum physics itself; market size unknown | T3 |

**Resolves when:** one audited, repeated commercial workload where quantum beats the best good-faith classical baseline on cost or quality.

### C-measurement-problem — Whether the measurement problem is solved, dissolvable, or permanently open

| Who | Position | Tier |
|---|---|---|
| Everettians (Deutsch et al.) | unitarity all the way down; scalable QC is evidence for many-worlds | T3 (philosophical) |
| objective-collapse camp (GRW/DP) | collapse is physical and testable; parameter space shrinking under experiment | T2 (constraints) / T6 (the models) |
| Nature centenary survey (2025) | no consensus — Copenhagen ~36%, QBist/epistemic next, many-worlds after; community split on whether it's even physics | T3 (survey) |
| foundations reviews (arXiv:2502.19278) | clarified by decoherence, still unsolved | T3 |

**Resolves when:** detection of collapse-model radiation/heating (ends it for objective collapse); continued unitarity at macro scale squeezes collapse out without adjudicating the no-collapse interpretations.

### C-psi-ontology — Whether the quantum state is a real physical property (ψ-ontic) or an observer's information (ψ-epistemic)

| Who | Position | Tier |
|---|---|---|
| Pusey, Barrett & Rudolph (Nat. Phys. 8, 475, 2012; arXiv:1111.3328) | under "preparation independence," no ψ-epistemic model reproduces QM — the state is ontic | T2 (theorem, assumption-dependent) |
| PBR experimental tests (Ringbauer et al., Nat. Phys. 11, 249, 2015; Nigg et al.) | data rule out broad classes of ψ-epistemic models within stated assumptions | T2 |
| ψ-epistemic defenders (Leifer review 2014; Spekkens toy model; Harrigan-Spekkens framework) | dropping preparation independence keeps ψ-epistemic models alive; PBR constrains but does not close them | T3 (contested) |
| instrumentalists / QBists | the ontic-vs-epistemic framing itself is optional; the state is a Bayesian credence | T3 (philosophical) |

**Resolves when:** a theorem removing the preparation-independence assumption (would settle it either way), or an experiment excluding all maximally-ψ-epistemic models without auxiliary assumptions. See F-pbr.

### C-discord-resource — Whether quantum discord (correlation beyond entanglement) is an operationally useful resource or a mathematical artifact

| Who | Position | Tier |
|---|---|---|
| DQC1 / mixed-state-power camp (Knill-Laflamme; Datta, Shaji, Caves, PRL 100, 050502, 2008) | discord tracks the speedup of the "power-of-one-qubit" model where entanglement vanishes — it is the resource | T2/T3 |
| discord-consumption protocols (quantum state merging, encoding — Madhok-Datta; Cavalcanti et al.) | discord has an operational interpretation as consumed/generated in named tasks | T3 |
| skeptics | nonzero discord is generic (almost all states have it), it is basis/measurement-dependent, and no clean end-to-end advantage is pinned to it alone | T3 (contested) |

**Resolves when:** an audited task where discord (with zero entanglement) is provably the sole resource behind a real speedup, reproduced independently. See F-discord.

### C-majorana-existence — Whether Microsoft's topological hardware actually hosts Majorana zero modes / a topological qubit

| Who | Position | Tier |
|---|---|---|
| Microsoft (Majorana 1, Nature, Feb 2025) | InAs/Al topoconductor 8-qubit-capacity architecture; topological gap protocol supports a path to topological qubits | T4 (Nature editors: "results do not represent evidence for Majorana zero modes") |
| Henry Legg critique (formal Nature comment, d41586-026-01788-y, Jun 24 2026) | the presented data (only Z measurements) can be explained by trivial phenomena; identifies flawed tune-up routines, software errors in the analysis code, and omitted transport measurements; "nothing proves the existence of a topological qubit or Majoranas in these devices" | T3 |
| prior retraction (2021, Delft/Microsoft) | earlier quantized-Majorana-conductance Nature paper retracted after data-analysis scrutiny | T1 (established retraction) |
| Microsoft response (formal Nature reply, 2026) | defends the topological gap protocol; Nayak "stands by our results and our roadmap"; Majorana 2 (Jun 2026) claims ~20 s lifetimes / 1,000× stability | T4 |
| independent reproduction status (mid-2026) | NONE — no lab has independently replicated the topological-qubit claim; a de-facto verification vacuum persists (only a handful of labs can fabricate the InAs/Al, now Pb/Al, devices) | T3 (absence of evidence) |

**Resolves when:** a demonstrated topological qubit with fusion-rule / braiding measurements (not just Z readout), reproduced independently, showing the predicted non-Abelian statistics. Verified mid-2026: still no independent replication; Legg's Nature critique stands and Microsoft's Nature reply defends the result — the dispute is unresolved and stays contested. See H-topo.

### C-crqc-timeline — When a cryptographically-relevant quantum computer (Shor at RSA-2048 scale) arrives

| Who | Position | Tier |
|---|---|---|
| Gidney (Google, arXiv:2505.15917, 2025) | RSA-2048 in <1M noisy physical qubits, ~1 week — down ~20x from 20M (2019) | T3 (resource estimate, not a machine) |
| Global Risk Institute expert survey | ~22.7% of cryptographers expect RSA-2048 to fall by 2030, ~50% by 2035; point estimates ~2030±3 | T5 |
| NIST (2024 PQC standards) | threat is near enough to standardize ML-KEM/ML-DSA now and migrate | T2 (standards action) |
| hardware skeptics / Kalai | estimates improve on paper faster than hardware in the lab; largest devices are ~1k-6k physical qubits at insufficient fidelity; Kalai says never | T3 |

**Resolves when:** a Shor factorization of a growing genuine semiprime (RSA-1024 then 2048) with fault tolerance — or, defensively, completion of PQC migration before any CRQC appears (Mosca's inequality). Watch physical-qubit count AT Shor-relevant fidelity. See O-crqc-timeline, A-pqc, S-shor.

### C-quantum-utility — Whether "quantum utility" is a meaningful milestone or a rhetorical hedge

| Who | Position | Tier |
|---|---|---|
| IBM (Nature 618:500, 2023) | 127-qubit error-mitigated processor produced reliable results beyond brute-force classical simulation — "utility before fault tolerance" | T2 paper / T4 framing |
| Tindall et al. (PRX Quantum 5, 010308, 2024) + Sandia/Caltech | the same kicked-Ising problem was classically simulated within days (2D tensor networks, sparse Pauli dynamics) — it was not beyond classical reach | T2 |
| skeptics (O-hype) | "utility" became a movable goalpost with no agreed operational definition or independent adjudicator — invites quantum-washing | T3 |

**Resolves when:** a community-adopted taxonomy fixing utility (useful/competitive, may be classically reproducible) vs advantage (beats best classical) vs supremacy (beats all classical), with independent adjudication. Absent that, a result reproduced classically within weeks is a classical-simulation-frontier data point, not an advantage. See O-utility-definition, O-benchmark-standard.

### C-energy-advantage — Whether quantum computing delivers a net energy advantage over classical for useful work

| Who | Position | Tier |
|---|---|---|
| energetic-advantage theory (arXiv:2601.08068, 2605.19854, 2026) | for boson sampling and cat-qubit computation, quantum wins on energy at a problem size SMALLER than where it wins on runtime | T3 |
| Google supremacy energy analysis | classical simulation on Summit used ~7 orders of magnitude more energy than the QPU run | T3 (sampling task, no practical use) |
| full-system accounting (arXiv:2605.09580, 2026) | fixed cryo (~10 kW/fridge) + control + real-time decoders must be counted; at FT scale (millions of qubits) total draw could dwarf a single fridge | T3 |

**Resolves when:** a full-stack (fridge + control + classical co-processor) joules-per-useful-answer measurement for a USEFUL computation, vs the best classical method's energy for the same answer. Does the energetic-advantage crossover really precede the computational one on a problem someone cares about? See O-energy.

### C-benchmark-metrics — Whether quantum computing can standardize honest cross-vendor benchmarks

| Who | Position | Tier |
|---|---|---|
| QED-C + standards bodies | application-oriented open benchmark suite (15+ apps) + Quantum Volume + ISO/IEEE/ETSI working groups are converging on standards | T3/T4 |
| metrics-are-a-mess camp | no common yardstick exists; vendor metrics (#AQ, QV, raw counts, "logical qubits") each flatter one architecture; XEB is spoofable; results rarely independently reproduced | T3 |

**Resolves when:** broad adoption of application-oriented, independently-reproduced, spoof-resistant benchmarks reported by a neutral body (a "quantum MLPerf"), reporting LOGICAL performance with a defined universal gate set at stated code distance. See O-benchmark-standard, S-bench.
