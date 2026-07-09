# The Benchmarking Standardization Crisis · O-benchmark-standard
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
There is no agreed way to say one quantum computer is better than another. Vendors report different, self-favoring metrics — IBM's **Quantum Volume** and CLOPS (speed), IonQ/QED-C's **Algorithmic Qubits (#AQ)**, raw physical-qubit count, gate fidelities, "logical qubits" under vendor-chosen definitions — and each metric can be gamed or is sensitive to different subsystems. Unlike classical computing, which converged on SPEC, LINPACK, and MLPerf, quantum has no common yardstick, which makes cross-vendor comparison, procurement, and even honest progress-tracking hard. The sharp question: can the field standardize application-oriented, spoof-resistant benchmarks before the metric zoo lets marketing outrun physics? This is the measurement layer under O-hype and O-advantage — if you can't benchmark honestly, you can't grade the claims.

## Where the disagreement is
- **Standardization-is-arriving camp.** The **QED-C** (Quantum Economic Development Consortium) ships an open-source **application-oriented benchmark suite** (15+ applications: Grover, Monte Carlo, Shor period-finding, VQE, etc.) using volumetric benchmarks, and runs a Standards & Performance Metrics committee convening vendors and labs; its 2026 plan puts standards work front and center [T3/T4]. Quantum Volume is a genuine full-system metric sensitive to qubit number, fidelity, and connectivity together. New suites (QuSquare, QPack, the QuantumBenchmarkZoo aggregation) push toward quality-oriented, reproducible measurement. ISO/IEC JTC1, IEEE, and ETSI have quantum working groups building toward formal standards.
- **Metrics-are-a-mess camp.** "There is not yet a common understanding of standardized metrics in quantum computing" [T3, direct]. Vendor metrics are chosen to flatter the vendor's architecture — #AQ favors high-fidelity low-qubit ion machines, raw counts favor superconducting, "logical qubits" often means memory not a full gate set. Cross-entropy benchmarking, used for supremacy claims, is not a proof and has been spoofed classically (O-advantage, O-verification). Application benchmarks depend heavily on compilation and error-mitigation choices, so the same hardware scores differently under different software, and results are rarely independently reproduced. Quantum Volume saturates and stops discriminating at the top of the field. The absence of a neutral, funded, adversarial benchmarking body (a "quantum NIST-benchmark") is a structural gap.

## What would resolve it
Broad adoption of a small set of **application-oriented, independently reproduced, spoof-resistant** benchmarks — reported by an independent body, not the vendor — that procurement and peer review actually use, the way MLPerf disciplined ML hardware claims. Concretely: a standard that reports *logical* performance with a defined universal gate set at stated code distance, plus an end-to-end application score run by a third party. Until then, the manual treats every single-metric vendor headline as T4 and asks which subsystem the number really measures.

## Sources
- QED-C, Standards & Performance Metrics committee + application-oriented benchmark suite — quantumconsortium.org/tac/standards [T3/T4]
- SRI/QED-C, QC-App-Oriented-Benchmarks (open source, 15+ applications) [T3]
- IBM Quantum Volume / CLOPS; IonQ + QED-C Algorithmic Qubits (#AQ) [T4, vendor metrics]
- arXiv:2512.19665 — "QuSquare: Scalable Quality-Oriented Benchmark Suite" (2025) [T3]
- QuantumBenchmarkZoo benchmarking-initiatives aggregation [T3]
