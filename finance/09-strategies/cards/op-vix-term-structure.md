# VIX Futures Roll

ID: `op-vix-term-structure`
Family: Options and Volatility
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Short VIX futures when the curve is in contango, long when backwardated, hedged with equity futures.

## Source

1. The VIX Futures Basis: Evidence and Trading Strategies. Simon, Campasano, 2014, The Journal of Derivatives. https://doi.org/10.3905/jod.2014.21.3.054 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 7.3. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/exploiting-term-structure-of-vix-futures/ (fetched 2026-11-27)
4. Volmageddon and the Failure of Short Volatility Products. Augustin, Cheng, Van den Bergen, 2021, Financial Analysts Journal, CFA Institute summary. https://rpc.cfainstitute.org/research/financial-analysts-journal/2021/volmageddon-failure-short-volatility-products (fetched 2026-11-27)

## Claimed Edge

The VIX futures basis predicts futures returns and supports profitable trades.

## Post-Publication Decay

A sudden volatility rise on 5 February 2018 caused a one-day loss of more than 90% in short volatility exchange-traded products.

Decay source: The VIX Futures Basis: Evidence and Trading Strategies. Simon, Campasano, 2012. https://doi.org/10.2139/ssrn.2094510 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 7.2
- Quantpedia exploiting-term-structure-of-vix-futures

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
