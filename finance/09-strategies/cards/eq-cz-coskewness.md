# Coskewness

ID: `eq-cz-coskewness`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Chen-Zimmermann

## Logic

Signal: Coskewness. Buy the stocks with the lowest values and short the highest, 30 percent tails, VW weights, rebalanced every 1 months. Signal is the sample counterpart of $E[\tilde{r}_{it} \tilde{r}_{mt}^2]/( SD[\tilde{r}_{it} ] SD[\tilde{r}_{mt}]^2$ where $\tilde{r}_{it}$ is the de-meaned stock excess return and $\tilde{r}_{mt}$ is the de-meaned market excess return.

## Source

1. Conditional Skewness in Asset Pricing Tests. Harvey, Siddique, 2000, The Journal of Finance. https://doi.org/10.1111/0022-1082.00247 (Crossref search, fetched 2026-11-27)
2. Chen and Zimmermann, Open Source Asset Pricing SignalDoc.csv, release 2026.10. https://huggingface.co/datasets/OpenSourceAP/CrossSection (web fetch, fetched 2026-11-27)

## Claimed Edge

Original paper, sample 1964 to 1993: long-short 0.30 percent a month, t-stat 1.96. Chen-Zimmermann class: predictor, predictability in original paper likely.

## Post-Publication Decay

Chen-Zimmermann replication: in-sample 0.27 percent a month, t 2.2; after publication 0.33 percent, t 2.1, 121 percent of in-sample; 2016 to 2025 0.66 percent, t 2.6.

Decay source: Open Source Cross-Sectional Asset Pricing. Chen, Zimmermann, 2020, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3604626 (Crossref search, fetched 2026-11-27)

## Capacity

Large: value-weighted sort.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OpenSourceAP/CrossSection](https://github.com/OpenSourceAP/CrossSection), signal `Coskewness`.

## Merged Duplicates

- CoskewACX

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
