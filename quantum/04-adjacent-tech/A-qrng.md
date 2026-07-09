# Quantum Random Number Generation · A-qrng
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Randomness drawn from quantum measurement, where outcomes are unpredictable by physics (`F-measure`) rather than by algorithmic complexity. Three rungs of trust:
1. **Hardware QRNG** — trust the device; measure vacuum-field fluctuations, photon arrival times, or beam-splitter path. Fast and cheap.
2. **Device-independent (DI) randomness** — trust only physics; a Bell-inequality violation certifies genuine unpredictability even with untrusted hardware. Slow, needs loophole-free Bell setups.
3. **Certified randomness via random circuit sampling (RCS)** — a quantum computer produces bits a remote user can verify are fresh and random even while distrusting the server (Aaronson's protocol).

## Maturity & real deployments (2025–26)
**The oldest commercial quantum product line — and the fastest-moving on raw throughput.**
- **Hardware**: ID Quantique's **Quantis** chips have sold for two decades and shipped inside Samsung Galaxy "Quantum" phones; **Quside**, **Toshiba**, **Quantum Dice** sell QRNG hardware. Buyers are lotteries, casinos, HSMs, and key generation.
- **Speed race**: a **photonic-integrated QRNG hit 18.8 Gbit/s** real-time output (USTC, 2021) — still a benchmark; **Quantum Dice's VERTEX** PCIe card does 2.66 Gbit/s post-processed; and a 2025 **Toshiba chip-scale QRNG** reached **~3 Gbit/s** while shrinking to a device that could embed in everyday hardware (Optica, 2025). Throughput and integration, not sensitivity, are the competitive axes.
- **Certified randomness (the 2025 headline)**: JPMorgan Chase, Quantinuum, Argonne, Oak Ridge, and UT Austin demonstrated certified randomness on Quantinuum's **56-qubit H2** (Nature 640, 2025) — the first claimed commercial-relevant application of a quantum computer beyond classical capability, using Aaronson's RCS protocol with supercomputer verification at **Frontier**. **Quantinuum's Quantum Origin** became the first software QRNG to earn **NIST ESV validation** (April 2025), and a certified-randomness product line followed.

## Key graded claims
- T1 Measurement outcomes on superposed states are irreducibly random — quantum theory + loophole-free Bell tests 2015 (established)
- T2 Chip/photonic hardware QRNG at multi-Gbit/s (18.8 Gbit/s record; ~3 Gbit/s integrated, 2025) — USTC 2021; Toshiba/Optica 2025 (demonstrated)
- T2 Certified randomness expansion on a 56-qubit trapped-ion processor, verified at exascale — Liu et al., Nature 640 (2025) (demonstrated)
- T2 Quantum Origin first software QRNG with NIST ESV validation — Quantinuum/NIST, April 2025 (demonstrated)
- T4 Certified randomness as a commercial product with near-term customer demand — Quantinuum/JPMC (claimed)

## Conflicts / open questions
- **Aaronson himself flags the certified-randomness demo's limits**: certification needed exascale classical verification (only a handful of machines on Earth can do it), and the guarantee is *computational* — it assumes the server can't out-compute Frontier at spoofing, so it weakens as classical simulation improves. It is a beautiful proof-of-principle, not yet a product anyone must buy.
- **Does anyone need it?** Most applications are fine with a $50 hardware chip or a well-seeded CSPRNG. The market question for both certified and device-independent RNG is whether the extra trust guarantee is worth the price — outside high-assurance government/finance niches, the answer today is usually no.

## The honest call
**Hardware QRNG is a mature, real, commodity product** (two decades of sales, in your phone). **Certified randomness is a landmark 2025 demonstration** — arguably the first genuinely-useful thing a beyond-classical quantum computer has done — **but not yet a business**; its guarantee is computational and its verification cost is exascale. The gap between "shipping chip" and "verifiable quantum-advantage service" is the whole story of this node.

## Sources
- https://www.nature.com/articles/s41586-025-08737-1 (certified randomness, Nature 640, 2025)
- https://www.optica.org/about/newsroom/news_releases/2025/quantum_random_number_generator_combines_small_size_and_high_speed/ (Toshiba ~3 Gbit/s chip)
- https://scottaaronson.blog/?p=8746 (Aaronson on the demo's limits)
- https://www.jpmorgan.com/technology/news/certified-randomness
