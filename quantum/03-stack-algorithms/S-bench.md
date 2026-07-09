# Benchmarks & "advantage" claims · S-bench
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
How the field measures machines and adjudicates beyond-classical claims. **Holistic metrics**: Quantum Volume (IBM 2019 — the largest square random circuit a device passes, $2^n$; conflates width, depth, fidelity into one number), CLOPS (circuit layers per second, a speed metric), Algorithmic Qubits (IonQ, application-weighted — disputed methodology). **Component metrics**: gate fidelity via randomized benchmarking / cross-entropy benchmarking / cycle benchmarking (`S-gates`), plus IBM's "layer fidelity." **Advantage claims** rest on sampling tasks — random circuit sampling (RCS, scored by cross-entropy benchmarking / XEB) and boson sampling — where classical simulation cost is *conjectured* exponential, tying the claim to a complexity assumption rather than a proof (`S-complexity`, `S-tensornet`).

## Where it stands (2025–26)
Every advantage claim has drawn a classical counterattack; several fell. **Google 2019** (Sycamore, 53-qubit RCS, "10,000 years"): IBM answered 2.5 days immediately; Pan–Chen–Zhang tensor-network methods (2021–22) cut it to hours-then-minutes on GPU clusters — effectively matched (status: fell). **USTC Jiuzhang** boson sampling (2020): substantially eroded by spoofing and tensor methods. **Willow** (Dec 2024): 105-qubit RCS claimed at $\sim 10^{25}$ classical-years; no classical match to date, tensor-network teams still narrowing the gap — contested-by-default. **Willow "quantum echoes"** (Oct 2025): 13,000× on an OTOC measurement (`S-qsim`), marketed as *verifiable* advantage — under scrutiny, unresolved. Quantinuum holds the QV record ($\sim 2^{25}$ region, self-reported, 2025); IBM de-emphasized QV in favor of gate-count / layer-fidelity metrics; the resulting **benchmark fragmentation is itself a finding**. IBM staked "verified quantum advantage by end of 2026" on Nighthawk. The reference implementation models the honest small-scale version of this discipline: it reports kernel RMSE and diagonal-deviation as per-run noise gauges rather than a headline advantage number (`reference-impl/MATH.md` §6–7).

## Key graded claims
- [T2] Sycamore 2019 RCS beyond-classical — Arute et al., Nature 574, 505 (2019), then matched classically: Pan et al., PRL 129, 090502 (2022) (status: fell)
- [T3/T4] Willow 2024 RCS unmatched classically so far — Google blog + Nature 638 (2024) (claimed; contested by default, standing)
- [T4] QV $\approx 2^{25}$ record — Quantinuum blog (vendor self-reported)
- [T4] Algorithmic Qubits metric — IonQ; publicly disputed by Quantinuum ("Debunking algorithmic qubits") (contested)

## Speedup / caveat
Sampling tasks have **no known application**; their hardness is conjectural and erodes as classical algorithms improve (`S-tensornet`, `O-advantage`). A benchmark controlled by the vendor reporting it is **T4 by rule** (`evidence/SCHEMA.md`). "Verifiable" advantage matters because RCS results are themselves hard to check — Google's OTOC claim leans on this (`O-verification`).

## Conflicts / open questions
C-advantage: does Willow-class RCS stay unmatched? What replaces QV as the cross-platform standard — DARPA QBI / QED-C application benchmarks are the leading candidates for an application-grounded, vendor-neutral metric.

## Sources
Nature 574, 505 (2019); PRL 129, 090502 (2022); arXiv:2408.13687; blog.google quantum-echoes; quantinuum.com/blog. Cross-links: `S-tensornet`, `S-complexity`, `S-qsim`, `S-gates`, `O-advantage`, `O-verification`, `reference-impl/`.
