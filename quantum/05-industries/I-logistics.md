# Quantum in Logistics & Supply Chain · I-logistics
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Routing, scheduling, bin-packing, and supply-chain optimization are combinatorial (often NP-hard), and vendors pitch QAOA/annealing for vehicle routing, traffic flow, cargo loading, and network design. This is the most "demo-friendly" industry because small optimization instances run on today's hardware and produce photogenic results. It is also where the **quantum-inspired vs quantum-hardware** conflation is most misleading in the press.

## Real activity (named, dated)
- **Volkswagen** — early real-world **traffic-routing pilot in Lisbon** (2019 WebSummit), near-real-time bus routes via a quantum hybrid solver over live traffic/passenger data. A landmark demo, small fleet.
- **Airbus + IonQ** — cargo/aircraft loading via the **MAL-VQA** algorithm on trapped-ion hardware (arXiv 2504.01567, 2025). Airbus + BMW ran a **2024 Quantum Computing Challenge** including a sustainable-manufacturing logistics task.
- **Deutsche Bahn (Netz AG) + Cambridge Quantum** — **train rescheduling** with the F-VQE algorithm on realistic delayed timetables (part of Digitale Schiene Deutschland). DLR also pursuing quantum rail scheduling.
- **DHL** — quantum-inspired route-optimization work; IBM collaboration factoring customs, weather, fuel.
- **IonQ freight/logistics pilots** (2024–25) — container/freight optimization; IonQ has leaned into logistics as a commercial narrative.

## Key graded claims
- [T3] Aircraft cargo loading via MAL-VQA on IonQ hardware — arXiv 2504.01567 (demonstrated at small scale)
- [T3] Train rescheduling via F-VQE — Cambridge Quantum/DB Netz (demonstrated, realistic-instance study)
- [T4] VW Lisbon traffic routing — press pilot (hybrid solver, small fleet)
- [T5] Multi-billion logistics-optimization TAM projections — analyst forecasts (speculative; classical solvers already dominate)

## Proven today vs promise vs hype
- **Proven:** the workflow *runs* on today's hardware for small instances — a feasibility fact, not an advantage claim.
- **Promise:** vehicle routing, rail rescheduling, cargo loading at production scale — awaits fault tolerance and better encodings.
- **Hype:** "quantum optimizes global supply chains today" — most near-term wins are quantum-*inspired* (classical) methods relabeled.

## Honest assessment
Logistics produces the most demos and the least proven advantage. Every result is a small instance where classical solvers (Gurobi, CPLEX, OR-Tools) and quantum-*inspired* methods still win at production scale. The value shown is that the workflow runs, and the genuine near-term wins come from quantum-inspired algorithms that borrow quantum structure while running on classical hardware — honest progress that is not a quantum computer. Genuine routing advantage awaits fault tolerance; realistic: **end of decade**.

## Sources
- Q-CTRL Airbus/BMW logistics: https://q-ctrl.com/blog/exploring-the-future-of-quantum-powered-logistics-with-airbus-and-bmw-group
- Cambridge Quantum/DB train scheduling: https://www.hpcwire.com/off-the-wire/cambridge-quantum-and-deutsche-bahn-netz-ag-leverage-latest-quantum-algorithms/
- Aircraft loading: https://arxiv.org/html/2504.01567v1
- DHL "The quantum leap in logistics"; IonQ cargo optimization
