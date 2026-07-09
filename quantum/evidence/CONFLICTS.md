# Conflicts — first-class disagreement objects

Per `SCHEMA.md` rule 4: when two credible sources disagree, keep both. This file
is the registry. Cards link here; the manual never silently picks a side.

---

```
id: C-ftqc-timeline
topic: When (if ever) does large-scale fault-tolerant quantum computing arrive
positions:
  - who: IBM (modular roadmap, Jun 2025)  claim: Loon 2025 → Kookaburra 2026 (first FT module) → Cockatoo 2027 → Starling 2028-29 (~200 logical / 100M gates) → Blue Jay 2033 (2000+ logical / 1B gates); qLDPC cuts overhead up to 90%  tier: T4
  - who: Google Quantum AI (roadmap)   claim: useful error-corrected machine ~2029-2030          tier: T4
  - who: Scott Aaronson (Mar 2026)     claim: 2025 met/exceeded hardware expectations (>99.9% 2Q gate fidelity on multiple platforms); takes 2028-29 pronouncements more seriously; declines a firm date  tier: T3 (expert)
  - who: Jensen Huang (Nvidia, Jan 2025) claim: very useful QC is 15-30 years out (~20 central); walked back at GTC Quantum Day  tier: T5
  - who: Gil Kalai                     claim: FTQC impossible in principle (correlated noise defeats threshold theorem); correlations observable in noisy-circuit simulations. Mar-2026 reply (gilkalai.wordpress.com, 10 Mar 2026): concedes he "starts with quantum computation being impossible as [an] axiom" but insists the observed exponential error decay "does not contradict my conjectures regarding correlated errors," which he expects at "hundreds… and thousands of gates"  tier: T3 (contested minority)
  - who: Manifold prediction markets (2026) claim: steady engineering gains, no breakthrough      tier: T5
what_would_resolve_it: IBM Kookaburra (2026) then Starling (2028-29) hitting spec, independently verified — or missing it. Aaronson (2026) notes a dozen experiments now reach the same below-threshold conclusion, calls Kalai's path "narrower and narrower"; Kalai's position dies with any sustained large-scale fault tolerance and strengthens with each correlated-noise surprise at scale. See O-scaling.
```

```
id: C-overhead-ratio
topic: The realistic all-in physical:logical qubit ratio for useful algorithms
positions:
  - who: QuEra / Quantinuum / qLDPC papers  claim: ratios of ~2:1 to ~13:1 demonstrated or roadmapped; qLDPC cuts surface-code overhead 10-20x  tier: T3/T4
  - who: surface-code resource analyses     claim: at target logical error 1e-9..1e-12 with T-factories and routing, all-in cost stays hundreds-to-1000:1  tier: T3
what_would_resolve_it: an end-to-end fault-tolerant algorithm (incl. T-gates) at code distance >=11 with the full published physical budget; sustained <100:1 settles it for qLDPC optimists.
```

```
id: C-tls-scaling
topic: Whether materials defects (TLS) are an engineering nuisance or a scaling wall
positions:
  - who: fabrication groups (arXiv:2602.11469 etc.)  claim: TLS density is controllable — 2/3 reduction via electrode/grain engineering; tuning + ML mitigation handle the rest  tier: T3
  - who: TLS-dropout studies (arXiv:2605.02755) + Kalai  claim: dropouts and correlated noise scale with system size and violate QEC's error assumptions  tier: T3 (Kalai position contested)
what_would_resolve_it: a 10k-qubit chip holding all qubits within QEC spec for weeks, defect statistics published — or persistent out-of-spec fractions that grow with chip size.
```

```
id: C-advantage-survival
topic: Whether any claimed quantum speedup survives classical counterattack
positions:
  - who: Google (Quantum Echoes, Oct 2025)  claim: first verifiable quantum advantage, 13,000x vs best classical OTOC method on 105-qubit Willow  tier: T4→T3 (published, vendor-led, young)
  - who: arXiv:2604.15427 (2026)            claim: belief-propagation tensor networks CANNOT feasibly simulate Quantum Echoes — early sign the claim holds  tier: T3
  - who: D-Wave (Science, Mar 2025)         claim: beyond-classical spin-glass simulation on 5,000+ qubits; classical MPS would need ~1M yrs on Frontier  tier: T2 paper / contested claim
  - who: Flatiron Institute (Tindall et al., Science adx2728, May 2026) + Sels (EPFL)  claim: belief-propagation tensor networks compute the same annealing dynamics classically; some instances on a laptop; baselines were weak  tier: T2/T3
  - who: D-Wave rebuttal (May 2026)         claim: the classical framework fails to scale across the most complex topologies/measurements; specifically Tindall et al. did not attempt the hardest 3D lattice geometry, the largest 3D simulations, the low-precision ensembles where correlations grow fastest, or the full-state/fourth-order observables of the original Science paper; result stands  tier: T4
  - who: third-party adjudication status (mid-2026)  claim: NONE — no neutral body has adjudicated the D-Wave/Flatiron spin-glass dispute; the specific contested benchmark instances remain unmatched classically, so it is contested, not overturned  tier: T3 (absence of adjudication)
  - who: Ewin Tang (dequantization program) claim: quantum recommendation systems + much of QML linear algebra have no exponential advantage  tier: T2
  - who: arXiv:2510.06324                   claim: noisy circuit sampling classically simulable in quasi-polynomial time under approximate Markovianity  tier: T3
what_would_resolve_it: a verifiable advantage claim standing ~3+ years against motivated classical attack. Quantum Echoes is the live test case — if tensor-network attacks keep failing on it through 2027-28 it is the first durable useful-ish advantage. See O-advantage, O-classical-sim.
```

```
id: C-hype-valuation
topic: Whether 2024-26 quantum valuations reflect substance or a bubble
positions:
  - who: vendors + analysts (BCG/McKinsey)  claim: convergent 2029-30 roadmaps + real QEC milestones justify multi-decade value; tens of billions TAM  tier: T4/T5
  - who: Hossenfelder                       claim: hype will crash; real-world logistics/finance value dissolves under practical constraints  tier: T5
  - who: Kalai                              claim: the entire FTQC premise fails, so valuations rest on nothing  tier: T3 (contested minority)
  - who: market analysts (2025-26)          claim: 150x-3,000x sales multiples are unjustifiable pending revenue  tier: T5
what_would_resolve_it: revenue — a paying customer choosing quantum on cost/performance grounds; or a funding winter after missed 2029-30 roadmap dates.
```

```
id: C-photonic-scaling
topic: Whether photonics' room-temperature path actually changes the economics
positions:
  - who: Xanadu (Aurora, Nature 2025)   claim: modular photonic architecture scales in principle to millions of qubits; ~1,000 logical by 2029  tier: T2 demo / T4 extrapolation
  - who: PsiQuantum + GlobalFoundries   claim: million-qubit photonic systems manufacturable in existing fabs, utility-scale sites underway  tier: T4
  - who: photonics skeptics (CACM etc.) claim: SNSPD detectors stay cryogenic, photon loss sits orders of magnitude above fusion thresholds, and 12 qubits→1M is the field's largest extrapolation  tier: T3
what_would_resolve_it: any photonic machine demonstrating error-corrected logical qubits with published end-to-end loss budgets; PsiQuantum's first full-stack public benchmark.
```

```
id: C-killer-app
topic: Whether a near-term application exists that pays for the machine
positions:
  - who: chemistry camp (Aspuru-Guzik line, Quantinuum, pharma partners)  claim: molecular simulation is the killer app, commercial in 5-10 years given hundreds of logical qubits  tier: T2 theory / T4-T5 timeline
  - who: feasibility skeptics (2025-26 studies, New Scientist)            claim: industrially relevant chemistry needs resources that stay daunting; chemistry may miss killer-app status  tier: T3
  - who: optimization skeptics (Hossenfelder; quadratic-speedup analyses) claim: optimization/finance value evaporates under QEC overhead and real-world constraints  tier: T2/T5
  - who: Aaronson                                                          claim: the honest killer app is simulating quantum physics itself; market size unknown  tier: T3
what_would_resolve_it: one audited, repeated commercial workload where quantum beats the best good-faith classical baseline on cost or quality.
```

```
id: C-measurement-problem
topic: Whether the measurement problem is solved, dissolvable, or permanently open
positions:
  - who: Everettians (Deutsch et al.)      claim: unitarity all the way down; scalable QC is evidence for many-worlds     tier: T3 (philosophical)
  - who: objective-collapse camp (GRW/DP)  claim: collapse is physical and testable; parameter space shrinking under experiment  tier: T2 (constraints) / T6 (the models)
  - who: Nature centenary survey (2025)    claim: no consensus — Copenhagen ~36%, QBist/epistemic next, many-worlds after; community split on whether it's even physics  tier: T3 (survey)
  - who: foundations reviews (arXiv:2502.19278) claim: clarified by decoherence, still unsolved                              tier: T3
what_would_resolve_it: detection of collapse-model radiation/heating (ends it for objective collapse); continued unitarity at macro scale squeezes collapse out without adjudicating the no-collapse interpretations.
```

```
id: C-psi-ontology
topic: Whether the quantum state is a real physical property (ψ-ontic) or an observer's information (ψ-epistemic)
positions:
  - who: Pusey, Barrett & Rudolph (Nat. Phys. 8, 475, 2012; arXiv:1111.3328)  claim: under "preparation independence," no ψ-epistemic model reproduces QM — the state is ontic  tier: T2 (theorem, assumption-dependent)
  - who: PBR experimental tests (Ringbauer et al., Nat. Phys. 11, 249, 2015; Nigg et al.)  claim: data rule out broad classes of ψ-epistemic models within stated assumptions  tier: T2
  - who: ψ-epistemic defenders (Leifer review 2014; Spekkens toy model; Harrigan-Spekkens framework)  claim: dropping preparation independence keeps ψ-epistemic models alive; PBR constrains but does not close them  tier: T3 (contested)
  - who: instrumentalists / QBists                          claim: the ontic-vs-epistemic framing itself is optional; the state is a Bayesian credence  tier: T3 (philosophical)
what_would_resolve_it: a theorem removing the preparation-independence assumption (would settle it either way), or an experiment excluding all maximally-ψ-epistemic models without auxiliary assumptions. See F-pbr.
```

```
id: C-discord-resource
topic: Whether quantum discord (correlation beyond entanglement) is an operationally useful resource or a mathematical artifact
positions:
  - who: DQC1 / mixed-state-power camp (Knill-Laflamme; Datta, Shaji, Caves, PRL 100, 050502, 2008)  claim: discord tracks the speedup of the "power-of-one-qubit" model where entanglement vanishes — it is the resource  tier: T2/T3
  - who: discord-consumption protocols (quantum state merging, encoding — Madhok-Datta; Cavalcanti et al.)  claim: discord has an operational interpretation as consumed/generated in named tasks  tier: T3
  - who: skeptics                                        claim: nonzero discord is generic (almost all states have it), it is basis/measurement-dependent, and no clean end-to-end advantage is pinned to it alone  tier: T3 (contested)
what_would_resolve_it: an audited task where discord (with zero entanglement) is provably the sole resource behind a real speedup, reproduced independently. See F-discord.
```

```
id: C-majorana-existence
topic: Whether Microsoft's topological hardware actually hosts Majorana zero modes / a topological qubit
positions:
  - who: Microsoft (Majorana 1, Nature, Feb 2025)  claim: InAs/Al topoconductor 8-qubit-capacity architecture; topological gap protocol supports a path to topological qubits  tier: T4 (Nature editors: "results do not represent evidence for Majorana zero modes")
  - who: Henry Legg critique (formal Nature comment, d41586-026-01788-y, Jun 24 2026)  claim: the presented data (only Z measurements) can be explained by trivial phenomena; identifies flawed tune-up routines, software errors in the analysis code, and omitted transport measurements; "nothing proves the existence of a topological qubit or Majoranas in these devices"  tier: T3
  - who: prior retraction (2021, Delft/Microsoft)   claim: earlier quantized-Majorana-conductance Nature paper retracted after data-analysis scrutiny  tier: T1 (established retraction)
  - who: Microsoft response (formal Nature reply, 2026)  claim: defends the topological gap protocol; Nayak "stands by our results and our roadmap"; Majorana 2 (Jun 2026) claims ~20 s lifetimes / 1,000× stability  tier: T4
  - who: independent reproduction status (mid-2026)  claim: NONE — no lab has independently replicated the topological-qubit claim; a de-facto verification vacuum persists (only a handful of labs can fabricate the InAs/Al, now Pb/Al, devices)  tier: T3 (absence of evidence)
what_would_resolve_it: a demonstrated topological qubit with fusion-rule / braiding measurements (not just Z readout), reproduced independently, showing the predicted non-Abelian statistics. Verified mid-2026: still no independent replication; Legg's Nature critique stands and Microsoft's Nature reply defends the result — the dispute is unresolved and stays contested. See H-topo.
```

```
id: C-crqc-timeline
topic: When a cryptographically-relevant quantum computer (Shor at RSA-2048 scale) arrives
positions:
  - who: Gidney (Google, arXiv:2505.15917, 2025)  claim: RSA-2048 in <1M noisy physical qubits, ~1 week — down ~20x from 20M (2019)  tier: T3 (resource estimate, not a machine)
  - who: Global Risk Institute expert survey       claim: ~22.7% of cryptographers expect RSA-2048 to fall by 2030, ~50% by 2035; point estimates ~2030±3  tier: T5
  - who: NIST (2024 PQC standards)                 claim: threat is near enough to standardize ML-KEM/ML-DSA now and migrate  tier: T2 (standards action)
  - who: hardware skeptics / Kalai                 claim: estimates improve on paper faster than hardware in the lab; largest devices are ~1k-6k physical qubits at insufficient fidelity; Kalai says never  tier: T3
what_would_resolve_it: a Shor factorization of a growing genuine semiprime (RSA-1024 then 2048) with fault tolerance — or, defensively, completion of PQC migration before any CRQC appears (Mosca's inequality). Watch physical-qubit count AT Shor-relevant fidelity. See O-crqc-timeline, A-pqc, S-shor.
```

```
id: C-quantum-utility
topic: Whether "quantum utility" is a meaningful milestone or a rhetorical hedge
positions:
  - who: IBM (Nature 618:500, 2023)               claim: 127-qubit error-mitigated processor produced reliable results beyond brute-force classical simulation — "utility before fault tolerance"  tier: T2 paper / T4 framing
  - who: Tindall et al. (PRX Quantum 5, 010308, 2024) + Sandia/Caltech  claim: the same kicked-Ising problem was classically simulated within days (2D tensor networks, sparse Pauli dynamics) — it was not beyond classical reach  tier: T2
  - who: skeptics (O-hype)                          claim: "utility" became a movable goalpost with no agreed operational definition or independent adjudicator — invites quantum-washing  tier: T3
what_would_resolve_it: a community-adopted taxonomy fixing utility (useful/competitive, may be classically reproducible) vs advantage (beats best classical) vs supremacy (beats all classical), with independent adjudication. Absent that, a result reproduced classically within weeks is a classical-simulation-frontier data point, not an advantage. See O-utility-definition, O-benchmark-standard.
```

```
id: C-energy-advantage
topic: Whether quantum computing delivers a net energy advantage over classical for useful work
positions:
  - who: energetic-advantage theory (arXiv:2601.08068, 2605.19854, 2026)  claim: for boson sampling and cat-qubit computation, quantum wins on energy at a problem size SMALLER than where it wins on runtime  tier: T3
  - who: Google supremacy energy analysis          claim: classical simulation on Summit used ~7 orders of magnitude more energy than the QPU run  tier: T3 (sampling task, no practical use)
  - who: full-system accounting (arXiv:2605.09580, 2026)  claim: fixed cryo (~10 kW/fridge) + control + real-time decoders must be counted; at FT scale (millions of qubits) total draw could dwarf a single fridge  tier: T3
what_would_resolve_it: a full-stack (fridge + control + classical co-processor) joules-per-useful-answer measurement for a USEFUL computation, vs the best classical method's energy for the same answer. Does the energetic-advantage crossover really precede the computational one on a problem someone cares about? See O-energy.
```

```
id: C-benchmark-metrics
topic: Whether quantum computing can standardize honest cross-vendor benchmarks
positions:
  - who: QED-C + standards bodies                  claim: application-oriented open benchmark suite (15+ apps) + Quantum Volume + ISO/IEEE/ETSI working groups are converging on standards  tier: T3/T4
  - who: metrics-are-a-mess camp                    claim: no common yardstick exists; vendor metrics (#AQ, QV, raw counts, "logical qubits") each flatter one architecture; XEB is spoofable; results rarely independently reproduced  tier: T3
what_would_resolve_it: broad adoption of application-oriented, independently-reproduced, spoof-resistant benchmarks reported by a neutral body (a "quantum MLPerf"), reporting LOGICAL performance with a defined universal gate set at stated code distance. See O-benchmark-standard, S-bench.
```
