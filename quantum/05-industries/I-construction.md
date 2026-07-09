# Quantum in Construction & Built Environment · I-construction
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Construction/built-environment cuts across three quantum threads: (1) **structural materials simulation** — quantum chemistry (`I-chem`, `S-qsim`) for greener cement/concrete and durable materials; (2) **project scheduling and supply-chain optimization** — QUBO/QAOA for construction schedules, resource conflicts, and prefab supply chains, sharing the `I-logistics` template; (3) **urban microclimate and energy modeling** — CFD-style built-environment and HVAC/EV-charging optimization for greener cities.

## Real activity (named, dated)
- **Concordia / UCF / Syracuse / Tongji** — Liangzhu Leon Wang et al., *"Take a BITE for Built Environment and Urban Microclimate Research"* (arXiv 2604.18407) maps quantum methods onto urban microclimate and building-energy problems. Academic survey/framing.
- **Civil-engineering reviews** — *Quantum and quantum-inspired computing in civil engineering* (ScienceDirect 2025) and *Quantum computing in civil engineering: Potentials and Limitations* (arXiv 2402.14556) document QUBO scheduling and structural-analysis demos on small instances.
- **Prefab supply chain** — *Unlocking the potential of quantum computing in prefabricated construction supply chains* (ScienceDirect 2025) — trends/challenges review, not deployment.
- **The honest datapoint** from these reviews: ~42% of "quantum in construction" research is actually **quantum materials** (`A-materials`), and compute/QML applications are "predominantly theoretical and confined to small-scale simulations."

## Key graded claims
- [T3] QUBO project scheduling finds near-optimal construction schedules faster than classical on small cases — civil-eng reviews (demonstrated on toy instances; no advantage at scale)
- [T3] Quantum methods framed for urban microclimate / building energy — Wang et al. arXiv 2604.18407 (framing/survey)
- [T5/T6] Quantum-designed sustainable construction materials — review scenarios (speculative, FTQC-gated)

## Proven today vs promise vs hype
- **Proven:** small QUBO scheduling and structural demos exist in the literature — classical MILP still beats them.
- **Promise:** greener cement/concrete via quantum materials chemistry — inherits `I-chem`'s fault-tolerance wall.
- **Hype:** "quantum optimizes construction projects" as a near-term product — no industrial pilot runs quantum hardware in the loop.

## Honest assessment
Construction is an early, academic node with no named industrial pilot running quantum hardware in the loop. Its own literature admits most activity is either materials science (belongs in `A-materials`) or small-scale QUBO demos that classical MILP still beats. The materials-simulation payoff is real and inherits the fault-tolerance timeline of `I-chem`. Scheduling and microclimate are optimization pitches without demonstrated advantage. Present-day value is zero; realistic horizon is 2030s and gated on FTQC.

## Sources
- https://arxiv.org/abs/2604.18407 (BITE — built environment & urban microclimate)
- https://www.sciencedirect.com/science/article/pii/S1474034625008535 (quantum in civil engineering)
- https://arxiv.org/html/2402.14556v2 (civil engineering potentials & limitations)
- https://www.sciencedirect.com/science/article/abs/pii/S1566253525001162 (prefab supply chains)
