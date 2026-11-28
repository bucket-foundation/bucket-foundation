# Altman Z-Score

ID: `eq-cz-zscore`
Family: Equities
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Altman Z-Score. Buy the stocks with the lowest values and short the highest, 20 percent tails, EW weights, rebalanced every 1 months. 1.2*(current assets (act) - current liabilities (lct))/total assets (at) + 1.4*(Retained earnings (re)/total assets (at)) + 3.3*(net income (ni) + interest expense (xint) + total taxes (txt))/total assets (at) +.6*(market value of equity/Total liabilities (lt)) + revenue (revt)/ total assets (at).

## Source

1. Is the Risk of Bankruptcy a Systematic Risk?. Dichev, 1998, The Journal of Finance. https://doi.org/10.1111/0022-1082.00046 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1981 to 1995: t=1.59 in univar reg. Chen-Zimmermann class: placebo, predictability in original paper not.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample -0.32 percent a month, t -1.1; after publication 0.12 percent, t 0.3, -37 percent of in-sample; 2016 to 2025 0.46 percent, t 0.7.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Small: equal-weighted sort tilted to microcaps.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `ZScore`.

## Merged Duplicates

- ZScore_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
