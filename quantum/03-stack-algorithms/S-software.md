# Compilers, transpilers & middleware · S-software
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
The software layer between an abstract circuit and pulses on hardware: SDKs for authoring circuits, **transpilers** that rewrite them into native gates (`S-gates`) while routing around limited connectivity (inserting SWAPs), optimizers that cut depth and two-qubit count, and runtime/middleware for hybrid execution. Compilation quality changes what a chip can do — a 2× depth reduction is worth roughly a hardware generation, because circuit fidelity decays exponentially in two-qubit-gate count. The problems it solves are hard in their own right: qubit routing on a fixed coupling graph is NP-hard, so transpilers use heuristics (SABRE-style routing, template matching, ZX-calculus rewrites) with no guarantee of optimality.

## Where it stands (2025–26)
**Qiskit** (IBM, Apache-2.0) is the de-facto standard: v2.x rebuilt the core in Rust, added a C API, and claims best-in-class transpilation on the Benchpress suite. **Cirq** (Google) serves the Google-stack research community. **PennyLane** (Xanadu) owns the differentiable-programming/QML niche (`S-qml`) with autodiff through circuits. **tket/pytket** (Quantinuum) is the leading retargetable third-party compiler. **Braket SDK** (AWS) and **Q#/QIR** (Microsoft, with the Azure resource estimator) round out the cloud layer (`S-cloud`); NVIDIA **CUDA-Q** pushes GPU-hybrid workflows and drives the "quantum-centric supercomputing" framing. Interoperability runs through **OpenQASM 3** and **QIR** (an LLVM-based intermediate representation). The frontier: dynamic-circuit compilation (mid-circuit measurement / feed-forward), error-aware routing using live calibration data, and the first **fault-tolerant compilers** targeting a *logical* instruction set (lattice-surgery operations) rather than physical gates. The reference implementation leans on exactly this layer — Qiskit's exact state-preparation compiler builds the amplitude-encoding circuits it runs (`reference-impl/MATH.md` §2).

## Key graded claims
- [T2] All major SDKs actively maintained; OpenQASM 3 / QIR as interchange — GitHub release records (established)
- [T4] Qiskit "most performant transpiler" — IBM Benchpress benchmarking, arXiv:2409.08844 (vendor-run benchmark; methodology public)
- [T2] Compilation reduces two-qubit counts 2–50% versus naive lowering across suites — tket paper, Quantum Sci. Technol. 6, 014003 (2021) + Benchpress (demonstrated)
- [T4] Vendor "quantum-centric supercomputing" middleware roadmaps — IBM/NVIDIA announcements (roadmap)

## Speedup / caveat
Software **multiplies** hardware; it never creates asymptotic advantage. Between-SDK benchmark claims are usually vendor-run — check who compiled the competitor's baseline, since a poorly configured rival transpiler is an easy strawman (`S-bench`).

## Conflicts / open questions
Whether the field consolidates on Qiskit the way ML consolidated on PyTorch, or QIR-level interop keeps the layer plural (open-source governance is itself soft power, `E-oss`). How fault-tolerant ISAs (lattice-surgery instruction sets) get standardized across vendors.

## Sources
github.com/Qiskit/qiskit; quantumai.google/cirq; pennylane.ai; github.com/CQCL/tket; arXiv:2409.08844; Quantum Sci. Technol. 6, 014003 (2021). Cross-links: `S-gates`, `S-cloud`, `S-qml`, `E-oss`, `reference-impl/`.
