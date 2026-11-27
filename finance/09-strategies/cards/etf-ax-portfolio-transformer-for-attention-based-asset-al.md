# Portfolio Transformer for Attention-Based Asset Allocation

ID: `etf-ax-portfolio-transformer-for-attention-based-asset-al`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: With its full encoder-decoder architecture, specialized time encoding layers, and gating components, the PT has a high capacity to learn long-term dependencies among portfolio assets and hence can adapt more to changing market conditions such as the COVID-19 pandemic.

## Source

1. Portfolio Transformer for Attention-Based Asset Allocation. Damian Kisiel and co-authors, 2022, arXiv 2206.03246. https://arxiv.org/abs/2206.03246 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Any errors made during the forecasting step reduce the accuracy of the asset weightings, and hence the profitability of the overall portfolio. The Portfolio Transformer (PT) network, introduced here, circumvents the need to predict asset returns and instead directly optimizes the Sharpe ratio, a risk-adjusted performance metric used in practice.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
