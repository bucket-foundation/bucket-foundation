# Quantum annealing · H-anneal
**Layer:** L1 Hardware · **Chapter:** §02 · **Status:** depth

## What it is
A special-purpose analog approach that rests directly on the adiabatic theorem (`F-adiabatic`): encode an optimization problem in the couplings of a network of superconducting flux qubits, initialize in the ground state of a simple transverse-field Hamiltonian, then slowly interpolate to the problem Hamiltonian so the system stays near its instantaneous ground state and settles into a (near-)minimum-energy configuration. There are no gates and no universal computation — the machine natively solves Ising/QUBO problems and samples from hard distributions. It is not a gate-model computer wearing a costume; it is a distinct model of computation, and one company defines the commercial category.

## Key players & state of the art (2025–26)
- **D-Wave**: Advantage2 reached general availability May 2025 — 4,400+ qubits on the Zephyr topology (20-way qubit connectivity), with higher per-qubit coherence and a larger energy scale than Advantage1 (5,000+ qubits, Pegasus, 15-way). Delivered via the Leap cloud; hybrid solvers push problems up to millions of variables by splitting work between the QPU and classical heuristics. Gate-model annealing-adjacent research (coherent annealing) is also on D-Wave's roadmap.
- **Advantage claim**: D-Wave's March 2025 Science paper reported quantum-annealer simulation of quantum magnetic phase-transition dynamics (spin glasses) it argued was beyond reach of classical supercomputers. Within days, groups in Switzerland (EPFL) and the US posted arXiv counter-papers reproducing key results with tensor-network / belief-propagation methods on classical hardware; D-Wave rebutted that the classical methods only cover part of the parameter regime and time scales. Per the schema's default, the advantage stays **contested**.

## Key graded claims
- T4 Advantage2 GA: 4,400+ qubits, Zephyr, higher coherence — D-Wave release + whitepaper (claimed)
- [T2/contested] Quantum advantage in spin-glass dynamics simulation — Science (Mar 2025); classical tensor-network counterattacks on arXiv (contested)
- T5 Commercial utility of annealing for production optimization — vendor case studies (claimed; few third-party-audited head-to-head wins)

## Trade-offs (vs other modalities)
Thousands of qubits available today and real paying deployments years ahead of any gate-model rival — the modality shipped a usable product first. Against that: it is restricted to optimization/sampling problem classes, has no error correction and no threshold theorem, shows no proven scaling of *solution quality* with qubit count, and every headline speedup so far has been at least partially matched by tuned classical heuristics (simulated/parallel tempering, tensor networks).

## Conflicts / open questions
**C-anneal-advantage** (also **C-dwave-advantage**): does any annealing workload hold a durable quantum advantage once classical heuristics are tuned against it? Resolution would be a widely reproduced benchmark where the annealer wins on time-to-solution at fixed solution quality against best-known classical methods, audited by third parties — which has not yet happened.

## Sources
dwavequantum.com GA release + 4,400-qubit whitepaper; Science (Mar 2025); EPFL/US arXiv counter-papers; Physics World + Scientific American + HPCwire contest coverage.
