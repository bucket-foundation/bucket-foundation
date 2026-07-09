# Error-Correction Overhead — The Physical:Logical Ratio · O-overhead
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
Error correction is a tax: every logical qubit is paid for in physical qubits, and every non-Clifford (T) gate is paid for in magic states. Standard surface codes at useful code distance imply roughly **1,000 physical qubits per logical qubit**, and magic-state distillation factories have historically consumed a large fraction of the total footprint. The sharp question is how far new code families and distillation tricks compress that tax — and, critically, whether the headline low ratios from recent demos survive at *algorithm-relevant code distance and gate depth*. A 4.7:1 ratio at distance 4 on a hundred-qubit demo and a 1,000:1 ratio at distance 25 for a billion-gate algorithm are both true; the manual must say which regime a number lives in.

## Where the disagreement is
- **Optimist camp.** qLDPC codes cut overhead an estimated **~10–20× versus surface codes** [T3], and IBM's public Starling accounting claims up to **90% overhead reduction** with its bivariate-bicycle qLDPC codes [T4]. QuEra demonstrated **96 logical qubits from 448 physical atoms** (~4.7:1) with a high-rate [[16,6,4]] code, running error-corrected gates across all 96 at once, below threshold (Nature, Jan 2026) [T2/T3]. Quantinuum reported **94 logical qubits at ~2:1** on H-series with logical error below 10⁻⁴ (March 2026), and Microsoft+Quantinuum logged an **~800× error-rate improvement** (Nature, June 2026) [T2/T4]. GKP bosonic codes reach effectively 1:1 with the logical qubit outliving its physical parts [T2/T3]. Gidney's magic-state **cultivation** (2024–25) collapses distillation cost enough to help drive the 20× drop in RSA-2048 estimates; Litinski's line already argued "magic state distillation is cheaper than you think" [T3].
- **Skeptic camp.** The flattering ratios come from **low-distance, high-rate codes on small systems** — a [[16,6,4]] code has distance 4, far from the distance ~25 needed to hit 10⁻¹² logical error for a billion-gate algorithm. At those target error rates, realistic architectures still project **hundreds-to-1,000:1 all-in** once routing, ancillas, and T-factories are counted [T3]. qLDPC's long-range connectivity is natural for neutral atoms and ions and remains awkward for fixed-lattice superconducting chips, which is why IBM needs new c-/l-couplers to use it at all [T3]. Vendor "logical qubit" counts use vendor-chosen definitions and often report memory rather than a full logical *gate set* including T-gates [T4 — grade hard].

## What would resolve it
An end-to-end fault-tolerant algorithm — thousands of logical operations including T-gates, with the full physical budget published — at a measured all-in ratio. If a qLDPC machine sustains **<100:1 at distance ≥ 11** with a working magic-state supply, the overhead pessimists lose. If every deep-circuit demo quietly reverts to ~1,000:1 surface-code accounting once T-gates and routing enter, they win. The tell is whether the low ratios are reported *with* a universal gate set at algorithm-relevant distance, or only for memory/Clifford operation.

## Sources
- QuEra, 96 logical qubits from 448 atoms, [[16,6,4]] qLDPC, below threshold — Nature (Jan 2026) [T2/T3]
- Quantinuum 94 logical qubits (Mar 2026); Microsoft+Quantinuum 800× improvement, Nature (Jun 2026) [T2/T4]
- Gidney, arXiv:2505.15917 (yoked surface codes, magic-state cultivation) [T3]
- IBM Starling qLDPC overhead accounting — ibm.com/quantum/blog/large-scale-ftqc [T4]
- postquantum.com qLDPC overview; arXiv:2410.07327 (low-overhead magic states via code switching); arXiv:2606.20263 (Vine Codes, planar qLDPC) [T3]
