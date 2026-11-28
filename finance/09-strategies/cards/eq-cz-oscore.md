# O Score

ID: `eq-cz-oscore`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: O Score. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. OScore = -1.32 -.407*log(at/GNP deflator) + 6.03*(lt/at) - 1.43*( (act - lct)/at) +.076*(lct/act) - 1.72*I(lt > at) - 2.37*(ib/at) - 1.83*(fopt/lt) +.285*(ib + ib$_{t-12}$ + ib$_{t-24}$ < 0) -.521*( (ib - ib$_{t-12}$)/(abs(ib) +.abs(ib$_{t-12}$)) ).

## Source

1. Is the Risk of Bankruptcy a Systematic Risk?. Dichev, 1998, The Journal of Finance. https://doi.org/10.1111/0022-1082.00046 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1981 to 1995: long-short 1.17 percent a month, t-stat 3.36. Chen-Zimmermann class: predictor, predictability in original paper clear.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 1.03 percent a month, t 3.4; after publication 0.98 percent, t 2.6, 95 percent of in-sample; 2016 to 2025 1.55 percent, t 2.2.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `OScore`.

## Merged Duplicates

- OScore_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
