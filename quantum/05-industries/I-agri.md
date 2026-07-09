# Quantum in Agriculture & Food Science · I-agri
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Split out of `I-climate`, this node covers two threads. (1) **Food/fertilizer chemistry** — the \ce{FeMoco}/nitrogenase and Haber-Bosch-replacement story that is really quantum chemistry (`I-chem`, `S-qsim`), plus catalyst and soil-chemistry modeling. (2) **Precision-agriculture optimization** — variational/QUBO methods for crop-yield prediction, irrigation and fertilizer scheduling, plus **quantum sensing** (`A-sensing`) for soil and canopy measurement, which is a nearer-term, more credible thread than compute. (Food & beverage *manufacturing/supply chain* rides `I-manufacturing`/`I-logistics`.)

## Real activity (named, dated)
- **Alice & Bob** (Oct 2025) — \ce{FeMoco} resource estimate showing ~99,000 physical cat qubits (27x cut vs 2021 Google), explicitly framed for fertilizer/agriculture. An estimate, not a run. (Shared with `I-climate`/`I-chem`.)
- **qHPC-GREEN** (CASUS, Dr. Werner Dobrautz, launched Jan 2025 → 2029) — quantum-HPC hybrid research into energy-efficient nitrogen-fixation simulation. Funded research program, not a deployed tool.
- **Precision-ag method papers** — VQC crop-yield/resource algorithms claiming ~30% better yield prediction and ~25% less water/fertilizer, incl. a "5-hectare wheat" pilot writeup (EPJ Web of Conferences 2025). Small academic trials; treat the percentages skeptically.
- **Quantum-sensing review** — *Potential applications of quantum sensors in agriculture* (Computers and Electronics in Agriculture, 2025) surveys magnetometry/gravimetry/NV soil-and-nutrient sensing as the credible near-term hook.

## Key graded claims
- T3 \ce{FeMoco} needs ~99k physical qubits with cat qubits — Alice & Bob (demonstrated *estimate*, not execution)
- T3 VQC crop-yield/resource algorithms show ~30%/25% gains on small trials — EPJ 2025 (contested; toy-scale, headline numbers unverified, classical ML matches)
- T5/T6 Quantum precision agriculture at farm scale — analyst/vendor scenarios (speculative)

## Proven today vs promise vs hype
- **Proven:** quantum sensors for soil/nutrient/water measurement are real lab-grade instruments (need no fault-tolerant computer).
- **Promise:** nitrogen-fixation chemistry (\ce{N2 + 3H2 -> 2NH3}) — the textbook killer app, ~99k physical qubits away.
- **Hype:** "quantum boosts crop yields 30%," farm-scale quantum precision agriculture.

## Honest assessment
The fertilizer-chemistry payoff is real as a target and distant as a deliverable — the same ~99k-qubit / 2030s+ verdict as `I-climate`, gated entirely on fault tolerance. The precision-ag optimization papers are the hype-heavy corner: small, lightly-refereed trials with headline percentages that classical ML matches. The one thread with a plausible short horizon is quantum sensing for soil/nutrient/water measurement. Present-day deployed agricultural value from quantum computing is zero.

## Sources
- https://alice-bob.com/newsroom/alice-bob-quantum-computing-applications-health-agriculture/
- https://www.hpcwire.com/off-the-wire/quantum-hpc-hybrid-research-targets-energy-efficient-fertilizer-production/ (qHPC-GREEN)
- https://www.epj-conferences.org/articles/epjconf/abs/2025/10/epjconf_iemphys2025_01004/epjconf_iemphys2025_01004.html (VQC precision-ag)
- https://dl.acm.org/doi/10.1016/j.compag.2025.110420 (quantum sensors in agriculture review)
