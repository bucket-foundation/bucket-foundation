# Quantum in Pharma & Healthcare · I-pharma
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Drug discovery is chemistry, and chemistry is quantum — simulating molecular ground/excited states, protein folding, and binding affinities is the canonical Feynman-era pitch (see `S-qsim`). Quantum promises to model molecules classical methods approximate poorly, shrinking discovery cycles. Pharma is a top-three enterprise adopter. This node covers **drug discovery / molecular simulation**; healthcare *imaging and diagnostics* (a nearer-term quantum-sensing story) is split into `I-healthimaging`.

## Real activity (named, dated)
- **Cleveland Clinic + IBM** — "Discovery Accelerator," first on-site private-sector quantum computer (IBM System One at Lerner Research Institute, live 2023). 50+ joint projects; Heron chip upgrade + HPC coupling Dec 2025. **Algorithmiq + Cleveland Clinic + IBM won the $2M Wellcome Leap Q4Bio prize** (~April 2026) for simulating photodynamic-therapy processes on up to 100 qubits — the most concrete pharma-quantum result to date.
- **IBM "quantum-centric supramolecular interactions"** (arXiv 2410.09209, Oct 2024) — accurate simulation of supramolecular systems on Heron; a refereeable capability demo, still small-molecule scale.
- **Boehringer Ingelheim** — formal quantum program since 2021, partnered **Google Quantum AI** for molecular-dynamics work.
- **AstraZeneca + IonQ** (via AWS/NVIDIA, published 2025) — reported **~20x speedup** on a drug-discovery workflow subroutine; vendor-framed.
- **Qubit Pharmaceuticals + Pasqal** — drug-discovery tasks on neutral-atom hardware. **Menten AI + D-Wave** — peptide design via hybrid annealing. **Roche pRED + QC Ware**; **Moderna + IBM** (mRNA structure).
- **Quantinuum Helios** (48 logical qubits, late 2025) — approaching the scale where quantum chemistry begins to *challenge* classical on specific systems (~20 active orbitals), per 2026 pharma reviews.

## Key graded claims
- T2/T3 Photodynamic-therapy ground/excited-state simulation on up to 100 qubits (Q4Bio) — Algorithmiq/Cleveland Clinic/IBM (competitively judged; demonstrates a *path*, not advantage over DFT/coupled-cluster)
- T3 Quantum-centric supramolecular simulation — IBM, arXiv 2410.09209 (preprint capability demo)
- T4 AstraZeneca/IonQ 20x workflow speedup — vendor+pharma announcement (narrow subroutine)
- T4 Boehringer/Google, Qubit/Pasqal, Menten/D-Wave pilots — partnership PRs (exploratory)

## Proven today vs promise vs hype
- **Proven:** quantum hardware can now simulate ~20-orbital molecules accurately — matching what classical methods already do well.
- **Promise:** photodynamic-therapy chemistry, peptide design, binding affinity — real refereeable demos at 100-qubit scale, still short of design-grade accuracy on hard targets (\ce{FeMoco}, cytochrome P450).
- **Hype:** "quantum discovered a drug," end-to-end "20x faster pipelines," near-term clinical impact.

## Honest assessment
No approved drug has been discovered by a quantum computer as of mid-2026, and none is close — a fact 2026 pharma reviews state plainly (no quantum computer yet simulates a drug-relevant molecule better than classical chemistry on the same system). The Q4Bio work is the strongest signal: real chemistry circuits at 100-qubit scale, competitively judged. The "20x" claims are narrow subroutines. Pharmaceutically useful accuracy on hard active sites needs fault tolerance (millions of gates). Realistic operational impact: **late 2020s into the 2030s**. Pharma keeps investing because the eventual payoff is enormous.

## Sources
- IBM Quantum healthcare: https://newsroom.ibm.com/2026-04-16-how-ibm-quantum-is-enabling-healthcare-and-biology-research
- Supramolecular interactions: https://arxiv.org/pdf/2410.09209
- Quantum-machine-assisted drug discovery, npj Drug Discovery: https://www.nature.com/articles/s44386-025-00033-2
- Quantum Computing Watch List for Pharma R&D Leaders 2026 (Sakara Digital)
- Cleveland Clinic Discovery Accelerator: https://my.clevelandclinic.org/research/computational-life-sciences/discovery-accelerator
