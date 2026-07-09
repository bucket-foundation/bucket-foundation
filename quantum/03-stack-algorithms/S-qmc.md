# Quantum Monte Carlo / amplitude estimation · S-qmc
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Quantum Amplitude Estimation (QAE) estimates the amplitude $a$ in a state $\sqrt{1-a}\,\ket{0}\ket{\psi_0}+\sqrt{a}\,\ket{1}\ket{\psi_1}$ to additive error $\varepsilon$ using $O(1/\varepsilon)$ calls to the state-preparation oracle — versus the $O(1/\varepsilon^2)$ samples any classical Monte Carlo needs, since classical error shrinks only as $O(1/\sqrt{M})$. That is a quadratic speedup for estimating expectation values, the core operation in Monte Carlo integration. Montanaro (2015) generalized it to arbitrary-variance mean estimation. Because expected values price options, aggregate risk (VaR/CVaR), and compute Greeks, QAE is the headline near-to-mid-term algorithm for `I-finance` (JPMorgan, Goldman Sachs, HSBC all have published implementations). Canonically QAE = amplitude amplification (`S-grover`) + phase estimation (`S-qft`); "Grover-free" iterative and maximum-likelihood variants remove the deep QPE register.

## Where it stands (2025–26)
The quadratic speedup is proven and demonstrated at small scale on trapped-ion and superconducting hardware (arXiv:2109.09685, arXiv:2201.06987). Two caveats dominate the honest picture. (1) Depth: canonical QAE needs very deep circuits — the reason iterative QAE (Grinko et al.) and maximum-likelihood QAE were invented, trading depth for repetitions to reach NISQ. (2) The oracle problem: the speedup assumes an efficient circuit that loads the target probability distribution into amplitudes without approximation error — a state-preparation / `S-qram` assumption that, as with `S-hhl`, can silently cost as much as it saves. Resource estimates (Chakrabarti et al., 2021) put useful financial QAE firmly in the fault-tolerant era, needing many logical qubits and long coherent runs.

## Key graded claims
- T1 QAE gives $O(1/\varepsilon)$ vs classical $O(1/\varepsilon^2)$ — quadratic Monte Carlo speedup — Brassard–Høyer–Mosca–Tapp 2002 (quant-ph/0005055); Montanaro, Proc. R. Soc. A 471 (2015) (established)
- T2 Grover-free / iterative / MLE amplitude estimation for shallower circuits — Grinko et al., npj QI 7 (2021); Suzuki et al. 2020 (established)
- T3/T4 Financial QAE (option pricing, risk) demonstrated small-scale; useful scale needs FTQC — arXiv:1905.02666 (JPMorgan); Chakrabarti et al., Quantum 5, 463 (2021) (demonstrated / roadmap)

## Speedup / caveat
Proven quadratic speedup over classical Monte Carlo. Caveats: (1) only quadratic, so fault-tolerance overhead can wash it out for realistic runtimes (`S-grover`, `O-advantage`); (2) requires deep circuits and an efficient, exact distribution-loading oracle — the loading cost is the crux and links directly to `S-qram`.

## Conflicts / open questions
Does the distribution-loading oracle for real market data admit an efficient circuit, and does the quadratic gain survive full FT resource accounting? Unresolved — the same fine print that dogs Grover.

## Sources
quant-ph/0005055; Proc. R. Soc. A 471, 20150301 (2015); npj QI 7, 52 (2021); arXiv:1905.02666; Quantum 5, 463 (2021); arXiv:2109.09685. Cross-links: `S-grover`, `S-qft`, `S-qram`, `I-finance`, `O-advantage`.
