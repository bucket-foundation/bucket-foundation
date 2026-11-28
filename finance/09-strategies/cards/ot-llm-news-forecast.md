# LLM News Direction Forecast

ID: `ot-llm-news-forecast`
Family: Other
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Feed recent headlines and filings to an LLM, ask for next-day or next-week direction per ticker, and trade the answer.

## Source

1. Can ChatGPT Forecast Stock Price Movements? Return Predictability and Large Language Models. Lopez-Lira, Tang, 2023, Crossref. https://doi.org/10.2139/ssrn.4412788 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 3 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Lopez-Lira and Tang 2023 found ChatGPT headline scores predict next-day returns. FinGPT reports forecast accuracy without costs.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[FinGPT](../../08-software/fingpt.md), [lumibot](../../08-software/lumibot.md)

## Code

- `FinGPT: fingpt/FinGPT_Forecaster/`
- `FinGPT: fingpt/FinGPT_Others/FinGPT_Trading/`
- `lumibot: lumibot/example_strategies/agent_news_sentiment.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
