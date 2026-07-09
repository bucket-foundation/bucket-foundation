# Open-source ecosystem & soft power · E-oss
**Layer:** L5 Ecosystem & geopolitics · **Chapter:** §06 · **Status:** depth

## Summary
The quantum software layer is dominated by **vendor-backed open-source SDKs**, and whoever's framework a developer learns first shapes which hardware they reach for later — soft power and lock-in dressed as free tooling. The big three are **Qiskit** (IBM), **Cirq** (Google), and **PennyLane** (Xanadu), joined by tket/pytket (Quantinuum), Braket SDK (AWS), Q#/QDK (Microsoft), and D-Wave's Ocean. All are permissively licensed and free, but each is a funnel toward its sponsor's cloud and hardware. The counter-force is interop standards — **OpenQASM** (IBM-originated assembly, now OpenQASM 3) and **QIR** (Microsoft-led LLVM-based intermediate representation under the **QIR Alliance / Linux Foundation**) — which keep code portable across backends and blunt pure lock-in. The open geopolitical question is whether the world converges on this Western toolchain or **forks** along the export-control line into China's parallel stack (broken out as `E-china-stack`).

## The landscape (graded)
- T2 Qiskit, Cirq, PennyLane are the leading full-stack SDKs, all corporate-maintained (IBM/Google/Xanadu) yet open and free — multiple 2025 surveys (established)
- T2 PennyLane is hardware-agnostic by design (device plugins target Qiskit/Cirq/Forest/Braket) — Xanadu docs (established)
- T2 OpenQASM + QIR provide cross-backend portability; a Cirq circuit can be lowered to OpenQASM and run via Qiskit on IBM hardware — 2025 ecosystem writeups (established)
- T3 The ecosystem is partly siloed — specialized QEC/chemistry tools don't interoperate cleanly; cohesion is an open community effort — surveys (reported)
- T3 NVIDIA **CUDA-Q** is emerging as a de facto hybrid GPU-QPU orchestration layer, giving Nvidia soft-power leverage over the classical side of every quantum workflow — Nvidia (reported)

## Key graded claims
- T3 Framework choice functions as soft-power lock-in — learning Qiskit funnels toward IBM Quantum cloud; governance-by-defaults, not contract lock-in (analysis/claimed)
- T2 Governance is **corporate, not neutral-foundation**, for most SDKs — Qiskit/Cirq/PennyLane steered by their sponsors; the **QIR Alliance (Linux Foundation)** is the main neutral-governance exception (established)
- T3 A 2026 formal-verification study (arXiv 2604.06712) found security vulnerabilities across ~45 open-source quantum simulators — software-supply-chain risk (preprint)

## Conflicts / open questions
- Is portability (OpenQASM/QIR) real enough to defeat lock-in, or do deep tooling layers (transpilers, error mitigation, pulse control) **re-lock** users to one vendor in practice?
- No dominant *neutral* foundation governs the top SDKs — unlike Linux/Apache — so "open source" here is closer to open-source-as-marketing than a community-governed commons. The one durable neutral layer is the IR (QIR), not the SDKs.
- **Fork risk (see E-china-stack):** China's Origin QPanda / Baidu Paddle Quantum / Huawei HiQ are a full parallel stack; export controls (E-export) make convergence less likely each year.

## Sources
- https://www.opensourceforu.com/2025/11/the-top-open-source-quantum-computing-frameworks/
- https://postquantum.com/quantum-computing/quantum-programming/
- https://www.ibm.com/quantum/ecosystem
- https://arxiv.org/html/2604.06712v2
- https://medium.com/@adnanmasood/the-quantum-platforms-briefing-day-5-open-source-ecosystem-51109e78df70
