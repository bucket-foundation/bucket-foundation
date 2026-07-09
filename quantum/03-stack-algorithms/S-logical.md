# Logical qubits & fault tolerance · S-logical
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
A logical qubit is an error-corrected qubit (`S-qec`) — the unit that algorithms in `S-shor`/`S-qsim` actually consume. Fault tolerance means every operation (gates, measurement, and the correction step itself) is performed so that a single physical fault cannot cascade into a logical error. This node marks the line between demos and utility. Useful chemistry or cryptanalysis needs **hundreds to thousands of logical qubits** at logical error rates of $10^{-9}$ or better, executing **millions to billions** of logical gates — an entirely different regime from the shallow error-detected circuits shown so far. The key subtleties that make bare counts meaningless: code distance $d$, measured logical error rate per cycle, whether a *universal* (non-Clifford, `S-gates`) gate set was actually exercised, and whether the device did true correction or only post-selected error *detection*.

## Where it stands (2025–26)
The logical-qubit count became the field's headline metric, which invites cherry-picking. Milestones: Harvard/QuEra ran circuits on **48 logical qubits** of neutral atoms (Bluvstein et al., Nature 2024 — error-detected, shallow). Microsoft+Quantinuum demonstrated **12 logical qubits** with 22× error suppression (2024). **Quantinuum Helios** (Nov 2025) produced **48 error-corrected logical qubits at a 2:1 physical:logical ratio** — thought impossible a few years ago — plus a **94-logical-qubit GHZ state**, both with better-than-break-even fidelity (the logical qubits outperform physical qubits running the same task). QuEra demonstrated **96 logical from 448 physical** (a high-rate $[[16,6,4]]$ code, ~4.7:1 encoding) with below-threshold error suppression across all 96 logical qubits — peer-reviewed in Nature (Jan 2026), which makes it the strongest-graded logical-qubit record to date. Caution: a distance-2 detection-only "logical qubit" and Willow's distance-7 corrected memory are different animals, and none of these systems yet runs deep universal computation across many logical qubits simultaneously.

## Key graded claims
- T2 48-logical-qubit circuits on neutral atoms — Bluvstein et al., Nature 626, 58 (2024) (demonstrated; error-detected, shallow)
- T2 12 logical qubits, 22× error suppression — Microsoft/Quantinuum, arXiv:2404.02280 (demonstrated)
- T3/T4 Helios: 48 error-corrected logical at 2:1 encoding + 94-qubit GHZ, break-even fidelity — Quantinuum (Nov 2025) + Iceberg-code paper (claimed; partially peer-reviewed)
- T2 96 logical qubits via a high-rate $[[16,6,4]]$ code on 448 neutral atoms (~4.7:1), below-threshold across all logical qubits — QuEra, Nature s41586-025-09848-5 (doi:10.1038/s41586-025-09848-5, Jan 2026) (demonstrated, peer-reviewed)
- T4 IBM Starling: 200 logical qubits / 100M gates by 2029 — IBM roadmap (roadmap)

## Speedup / caveat
Logical-qubit counts are **incomparable** across vendors without stating code distance, logical error rate, and gate-set completeness. Treat any bare "N logical qubits" headline as marketing until those three numbers appear (`S-bench`). Break-even (logical beats physical) is the meaningful 2025 threshold; deep universal computation on many logical qubits is the next.

## Conflicts / open questions
"FTQC by 2029" (IBM roadmap, Google-adjacent optimism) versus "not before the mid-2030s" (much of academia) is the field's central unresolved timeline conflict (`C-ftqc-timeline`). Whether the physical:logical ratio keeps falling — Helios's 2:1 is architecture-specific and does not include the deep-circuit distillation overhead.

## Sources
Nature 626, 58 (2024); arXiv:2404.02280; Quantinuum Helios (2025); QuEra 96-logical — Nature s41586-025-09848-5 (2026); ibm.com/quantum/blog. Cross-links: `S-qec`, `S-decoders`, `S-gates`, `S-bench`, `O-scaling`, `O-overhead`.
