# Text Sentiment Signals

ID: `eq-news-sentiment`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Score news or social text with a lexicon or NLTK classifier and buy positive, short negative names.

## Source

1. Giving Content to Investor Sentiment: The Role of Media in the Stock Market. Tetlock, 2005, Crossref. https://doi.org/10.2139/ssrn.685145 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Tetlock 2007 found negative media tone predicts lower next-day market returns.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md)

## Code

- `QuantConnect/Lean: Algorithm.Python/NLTKSentimentTradingAlgorithm.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
