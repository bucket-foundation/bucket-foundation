# Cloud QPU access · S-cloud
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
How anyone actually touches a quantum computer: cloud platforms queueing circuits to remote QPUs. Three models dominate. **IBM Quantum** — own fleet, per-QPU-minute runtime, tiered Open/Pay-as-you-go/Premium. **AWS Braket** — an aggregator fronting IonQ, Rigetti, IQM, QuEra, and others, priced per-task plus per-shot. **Azure Quantum** — aggregator fronting IonQ and Quantinuum, plus the Azure resource estimator, priced per-program or by subscription. Google Quantum AI stays research-partner-gated. The compilation and submission all run through the software layer (`S-software`). The reference implementation is written to hit exactly these backends — Qiskit Runtime to IBM's least-busy device, Braket to IonQ — with only the backend flag changing (`reference-impl/README.md`).

## Where it stands (2025–26)
Access is a solved problem; the cost structure shapes research. Representative 2026 numbers: IBM PAYG ≈ **$96/QPU-minute** ($48–72 with Flex/Premium tiers); Braket ≈ **$0.30/task** plus per-shot fees that vary ~25× by hardware (a 100-shot circuit runs ~$8.30 on IonQ Forte versus ~$0.34 on Rigetti); a 200k-shot VQE run spans **$85–$6,000** depending on backend. Quantinuum sells H-series/Helios access directly and via Azure. NVIDIA's CUDA-Q and "quantum-centric supercomputing" partnerships (IBM–RIKEN, various HPC centers) are pulling QPUs into HPC job schedulers as accelerators alongside GPUs. On-prem purchases (IQM, Rigetti, IBM systems at national labs) grew as sovereignty concerns rose (`E-supplychain`, `E-us`). Free tiers shrank across the board as demand from error-correction experiments soaked up device time.

## Key graded claims
- T2 Multi-vendor cloud access operational since 2016 (IBM) / 2019 (Braket, Azure) — platform documentation (established)
- T4 Published pricing: IBM ~$96/min PAYG; Braket $0.30/task + per-shot — aws.amazon.com/braket/pricing, IBM docs (vendor-published, verifiable)
- T5 "Quantum cloud market" TAM projections — analyst reports (forecast; double-counting risk, `E-market`)

## Speedup / caveat
Cloud access sets the **economics** of experimentation. At ~$100/minute, algorithm development happens on simulators and only validation touches hardware — exactly the workflow the reference impl documents (develop on Aer, validate on IBM/IonQ). Queue times and calibration drift make published fidelity numbers optimistic relative to what a random user session sees; a device benchmarked at 99.9% on a good day may deliver noticeably worse mid-drift.

## Conflicts / open questions
Aggregator versus vertical model — do Braket/Azure margins survive if the winning hardware vendors (IBM, Quantinuum) keep their best machines first-party? How fast does HPC-integrated access displace pure cloud submission as QEC workloads demand tight classical-quantum coupling (`S-decoders`)?

## Sources
aws.amazon.com/braket/pricing; learn.microsoft.com/azure/quantum/pricing; IBM Quantum docs. Cross-links: `S-software`, `S-decoders`, `E-market`, `E-supplychain`, `reference-impl/`.
