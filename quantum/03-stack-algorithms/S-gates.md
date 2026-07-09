# Gates, circuits & universal sets · S-gates
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Quantum computation is expressed as circuits: sequences of unitary gates on qubits, followed by measurement. A finite gate set is **universal** if it approximates any unitary to arbitrary precision; the canonical example is Clifford (H, S, CNOT) plus the T gate. The Solovay–Kitaev theorem guarantees efficient synthesis — approximating any single-qubit unitary to precision $\varepsilon$ costs $O(\log^c(1/\varepsilon))$ gates ($c\approx 2$–$4$ depending on the variant), i.e. polylogarithmic overhead. The Gottesman–Knill theorem draws the dividing line: **Clifford-only** circuits are classically simulable in polynomial time, so the T gate is the source of quantum hardness and the currency of fault-tolerant cost. Every hardware platform exposes a small **native** set — CZ or iSWAP-family on superconducting chips, Mølmer–Sørensen on trapped ions, Rydberg-blockade CZ on neutral atoms — into which the compiler (`S-software`) rewrites everything. The Hadamard gate that powers the interference in the manual's swap/Hadamard-test reference implementation (`reference-impl/MATH.md` §1) is the simplest such primitive.

## Where it stands (2025–26)
Two-qubit gate fidelity is the binding constraint on everything upstream (`S-qec` thresholds, `S-logical` counts). Best reported: **Quantinuum Helios** at 99.921% two-qubit / 99.9975% single-qubit across all qubit pairs (Nov 2025, trapped ions, all-to-all connectivity); superconducting devices sit around 99.5–99.9%; neutral atoms are climbing past 99.5%. Connectivity matters as much as raw fidelity: heavy-hex lattices (IBM) and 2D grids (Google) pay SWAP-routing overhead to move qubits together, while trapped ions and reconfigurable atom arrays offer all-to-all connectivity that removes routing entirely. Dynamic circuits — mid-circuit measurement plus classical feed-forward — became standard on major platforms in 2024–25 and are prerequisite for real-time QEC (`S-decoders`).

## Key graded claims
- [T1] Clifford+T is universal; Solovay–Kitaev gives polylog-overhead synthesis — Nielsen & Chuang; Dawson–Nielsen, quant-ph/0505030 (established)
- [T1] Clifford-only circuits classically simulable in poly time — Gottesman–Knill, quant-ph/9807006 (established)
- [T2] Helios 99.921% two-qubit fidelity, all-to-all, 98 qubits — Quantinuum (Nov 2025); postquantum.com analysis (demonstrated; vendor-built device, third-party analyzed)
- [T4] Vendor "gate count" roadmaps (IBM Nighthawk 5,000→15,000 two-qubit gates by 2028) — IBM Quantum blog (roadmap)

## Speedup / caveat
Universality is a **compilation** statement, not a speed statement — it says any unitary is reachable, not that it is cheap. T gates dominate fault-tolerant cost (each needs a distilled or cultivated magic state, `S-qec`), so **T-count** and **T-depth** are the real currency of algorithm resource estimates (`S-shor`, `S-qsim`). A circuit that looks short in physical gates can be enormous in T-count.

## Conflicts / open questions
Cross-platform fidelity numbers are measured with different protocols — randomized benchmarking (RB), cross-entropy benchmarking (XEB), component/cycle benchmarking — and are only loosely comparable (`S-bench`). A single "99.9%" can mean different things on two vendors' datasheets.

## Sources
Nielsen & Chuang (2000); quant-ph/0505030; quant-ph/9807006; Quantinuum Helios (2025); ibm.com/quantum/blog. Cross-links: `S-qec`, `S-software`, `S-bench`, `S-shor`, `reference-impl/`.
