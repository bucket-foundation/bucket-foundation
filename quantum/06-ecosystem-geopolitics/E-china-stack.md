# China's parallel software stack — fork & soft-power risk · E-china-stack
**Layer:** L5 Ecosystem & geopolitics · **Chapter:** §06 · **Status:** depth · **New node** (cycle 2 random-walk, field-flagged)

## Summary
China runs a **full parallel quantum-software stack** that mirrors the Qiskit/Cirq/PennyLane ecosystem (E-oss) end to end, so a Chinese developer, chip, and cloud can operate without touching any US-governed toolchain. The anchors: **Origin Quantum** (Hefei) with **QPanda** (programming framework), **Origin Pilot** (a quantum operating system, open-sourced Feb 2026), **ChemiQ** (chemistry), and **Tianji** (measurement-and-control, v4.0 supporting 500+ qubits, May 2025); **Baidu's Paddle Quantum** (quantum-ML on the PaddlePaddle DL framework); and **Huawei's HiQ** (simulator + algorithm library on Huawei Cloud). This is the software counterpart to the hardware story in E-china. The strategic point is a **fork risk**: whoever's framework developers learn first shapes which hardware they later reach for, and export controls (E-export) make convergence on one global toolchain less likely each year. Origin is notable as arguably the only company anywhere building the *entire* stack — processor, cryogenics, control system (Tianji), OS (Origin Pilot), framework (QPanda), and cloud — in-house.

## The landscape (graded)
- T2 **Origin QPanda** is China's leading open-source quantum programming framework; Origin operates the Wukong superconducting machine on a public cloud — company/press (established)
- T3 **Origin Pilot** (quantum OS for multi-task scheduling / resource management) was **open-sourced in February 2026** — a deliberate soft-power move to seed adoption around Chinese hardware — postquantum.com (reported)
- T3 **Tianji 4.0** measurement-and-control system supports 500+ qubits and reduces PhD-level bring-up to standard engineering workflows (May 2025) — Origin (claimed; vendor)
- T2 **Baidu Paddle Quantum** — open-source QML toolkit on PaddlePaddle; Baidu built the 36-qubit Qianshi processor (2023) before **donating its quantum lab to BAAI (2024)** — Baidu docs / press (established). The software outlived the hardware program.
- T2 **Huawei HiQ** — cloud quantum simulator + algorithm library integrated with Huawei Cloud — Huawei (established)

## Key graded claims
- T3 The Chinese stack is a **genuine fork**, not a veneer over Western tools — QPanda/Paddle Quantum/HiQ have independent APIs and do not depend on Qiskit/Cirq (reported)
- T3 **Soft-power play:** open-sourcing Origin Pilot/QPanda mirrors IBM's Qiskit funnel strategy — free tooling as a channel to Chinese cloud + hardware, aimed at Belt-and-Road / non-aligned markets (analysis)
- T4 Interop with OpenQASM/QIR (E-oss) exists partially, but a determined bifurcation along the export-control line would strand cross-stack portability (claimed)

## Conflicts / open questions
- **Does the world converge or fork?** OpenQASM/QIR portability (E-oss) vs export-control-driven decoupling (E-export). Resolution: whether Chinese and Western clouds keep honoring each other's IRs through 2027–28.
- Corporate retreat paradox: Baidu/Alibaba exited *hardware* (E-china, E-patents) yet their *software* (Paddle Quantum) persists — soft power can outlast the lab that spawned it.
- Adoption outside China is unmeasured — GitHub stars and cloud-usage numbers for QPanda/HiQ are not independently audited.

## Sources
- https://postquantum.com/quantum-computing/china-quantum-os-origin-pilot/
- https://postquantum.com/quantum-computing-companies/origin-quantum/
- https://thequantuminsider.com/2026/05/15/10-plus-companies-leading-the-quantum-technologies-race-in-china/
- https://entangledfuture.com/guides/quantum-computing-in-china/
- https://quantumzeitgeist.com/china-quantum-computing-companies/
