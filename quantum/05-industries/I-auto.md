# Quantum in Automotive · I-auto
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Automotive spans several quantum threads: battery/electrolyte and fuel-cell-catalyst simulation (materials), aerodynamics and crash/metal-forming simulation, production-line scheduling and paint-shop optimization, and autonomous-driving ML. German OEMs are the most active enterprise cohort outside finance and pharma, and automotive holds one of the field's most defensible "quantum in production" claims.

## Real activity (named, dated)
- **Ford Otosan + D-Wave** (2024) — **deployed a hybrid-quantum app in production** on the Ford Transit line, cutting vehicle sequencing/scheduling time ~50% (roughly 30 min → under 5 min per ~1,000-vehicle run). One of the few real production deployments in any industry (annealing-based).
- **BMW** — quantum-enhanced solvers for sheet-metal forming and crash-safety (2024); co-ran the 2024 Airbus/BMW Quantum Challenge; earlier fuel-cell catalyst work.
- **BMW + Airbus + Quantinuum** (2023) — hybrid quantum-classical **fuel-cell catalyst** simulation (oxygen reduction on platinum).
- **Hyundai + IonQ** — battery chemistry (electrolytes, cathode catalysts) for next-gen batteries.
- **Ford + Quantinuum** — lithium-ion battery reaction modeling. **Volkswagen + IQM** — hybrid battery-simulation study (2024–25).
- **Mercedes-Benz + PsiQuantum / IBM** — battery-materials feasibility work.
- **Volkswagen + D-Wave** (earlier program) — paint-shop color-switching optimization, a QUBO scheduling problem framed to cut solvent/flush waste; the archetypal automotive annealing demo classical solvers also handle.
- **Toyota / Toyota Tsusho** — participation in Japanese quantum consortia (Q-STAR) on materials and mobility optimization; exploratory.

## Key graded claims
- T3/T4 Ford Otosan production sequencing, ~50% scheduling-time cut — D-Wave/Ford Otosan, 2024 (demonstrated, in production; annealing not gate-model)
- T4 Fuel-cell catalyst simulation — BMW/Airbus/Quantinuum (exploratory)
- T4 Battery-chemistry pilots — Hyundai/IonQ, Ford/Quantinuum, VW/IQM (claimed)
- T5 Automotive slice of quantum economic-value forecasts — analyst; grade hard

## Proven today vs promise vs hype
- **Proven:** Ford Otosan runs an annealing-based scheduling app in a live plant — a legitimate deployed workflow.
- **Promise:** battery/electrolyte and fuel-cell catalyst design — small-molecule exploratory studies short of design-grade accuracy.
- **Hype:** "quantum computer beats classical on scheduling" (contested), quantum-accelerated autonomous driving.

## Honest assessment
The Ford Otosan case is one of the most defensible "quantum in production" claims anywhere, and it is *quantum annealing* solving a scheduling problem where D-Wave competes head-to-head with classical solvers (advantage contested — see `H-anneal`/`O-advantage`). Battery and catalyst simulations are small-molecule exploratory studies far from design-grade accuracy. Autonomous-driving "quantum ML" is mostly aspirational. Honest read: optimization/scheduling has real *today* value via annealing and quantum-inspired methods (advantage debated); materials simulation is a **2030s** bet.

## Sources
- D-Wave/Ford Otosan production: https://www.dwavequantum.com/company/newsroom/press-release/d-wave-highlights-quantum-optimization-customer-growth-and-introduces-expanded-offering-to-accelerate-adoption-and-deployment/
- entangledfuture.com automotive sector; fuld.com "Quantum Computing Is Entering the Automotive Workshop"
- postquantum.com aerospace & automotive use cases
