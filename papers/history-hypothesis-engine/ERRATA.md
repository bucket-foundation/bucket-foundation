# Errata

The minted PDF (DOI 10.5281/zenodo.22694649) stays as published. Each entry names what the implementation changed after minting and where the paper still states the earlier form.

## 2026-09-15: cross-kind independence bonus removed

The paper defines $X(K) = 1 + 0.3 \cdot (\text{cross-family pairs})$ (glossary row $X(K)$, equation `eq:cross-kind`) and works an example with $X(2) = 1.3$. The implementation dropped the term in PR #158 (`hte.belief.pooled_weight` is now the plain tier-weighted sum) because independence between evidence kinds is unestimated, so the multiplier rewarded an assumption; see `_intake/hypothesis-engine/STATISTICAL-AUDIT-2026-09-15.md`, Evidence table. Every number in the paper's worked example that carries the 1.3 factor is 1.3 times the value the code returns today. A revised edition will replace the term with an estimated interaction or state its absence.
