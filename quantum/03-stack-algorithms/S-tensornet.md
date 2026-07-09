# Tensor-network classical simulation — the counterfactual · S-tensornet
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
The classical method that decides most quantum-advantage arguments (`S-bench`, `O-advantage`). A tensor network represents an n-qubit state or a whole circuit as a graph of small tensors; contracting the graph computes amplitudes or expectation values. The key resource is **entanglement**: a 1D state with bounded entanglement is captured exactly by a **matrix product state (MPS)** of small bond dimension $\chi$, and cost grows only polynomially in $n$ and $\chi$. States with more entanglement need 2D networks (PEPS) or full amplitude-tensor contraction, whose cost is set by the network's treewidth. The upshot is a sharp dividing line: circuits that stay **low-entanglement** — shallow, geometrically local, noisy, or short-time — are classically simulable, sometimes on a laptop; circuits that generate volume-law entanglement across a hard-to-contract geometry are where a quantum device might win. This is the honest counterfactual the atlas holds every advantage claim against.

## Where it stands (2025–26)
Tensor networks have repeatedly erased "beyond-classical" claims. **Sycamore 2019** RCS was cut from "10,000 years" to hours-then-minutes by hyper-optimized contraction on GPU clusters (Pan–Chen–Zhang; and 2024 work ran 1,432 GPUs ~7× faster than Sycamore). **IBM's 2023 kicked-Ising "utility"** experiment (`S-nisq`) was matched within weeks by an MPS/belief-propagation tensor-network simulation on a laptop (Tindall–Fishman–Stoudenmire–Sels 2024) — the cleanest recent example, because the circuit's limited entanglement made it easy. Gaussian and lossy boson sampling fell to MPS methods too. The 2025 Nature Reviews Physics survey frames this as a productive arms race: each advantage claim forces better contraction heuristics, and each classical advance raises the bar for what counts as advantage. Google's Dec 2024 Willow RCS and Oct 2025 "quantum echoes" (`S-qsim`) are the current standing claims that tensor networks have **not** yet matched — the live test.

## Key graded claims
- T2 Sycamore RCS classically matched via tensor contraction — Pan–Zhang, PRL 129, 090502 (2022); "Leapfrogging Sycamore" arXiv:2406.18889 (2024) (established)
- T2 IBM kicked-Ising utility reproduced by laptop MPS — Tindall et al., PRX Quantum 5, 010308 (2024) (established)
- T2 MPS captures bounded-entanglement states in $\text{poly}(n,\chi)$; DMRG foundation — Vidal, PRL 91, 147902 (2003); White DMRG (1992) (established)
- T2 Tensor networks as verification + counterattack tool for advantage — Nature Reviews Physics (2025), arXiv:2503.08626 (established survey)

## Speedup / caveat
This is the classical baseline, so its "caveat" runs the other way: tensor networks are efficient **only** for low-entanglement or low-treewidth instances, and cost blows up exponentially with entanglement across the contraction cut. A quantum advantage survives precisely where no efficient contraction exists — which is why long-time, high-entanglement dynamics (`S-hamsim`) is the most defensible advantage target, and shallow/noisy circuits are the most vulnerable.

## Conflicts / open questions
Whether Willow-class RCS and the OTOC "quantum echoes" experiment stay uncontracted, or fall like their predecessors (`C-advantage`). How far belief-propagation-augmented tensor networks push the simulable frontier for structured circuits.

## Sources
PRL 129, 090502 (2022); PRX Quantum 5, 010308 (2024); PRL 91, 147902 (2003); Nature Rev. Phys. (2025), arXiv:2503.08626; arXiv:2406.18889. Cross-links: `S-bench`, `S-nisq`, `S-qsim`, `S-hamsim`, `O-advantage`, `O-verification`.
