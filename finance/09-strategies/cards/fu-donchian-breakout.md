# Channel Breakout

ID: `fu-donchian-breakout`
Family: Futures and CTA
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy on a new N-day high, sell on a new N-day low, sized by ATR.

## Source

1. Trend-following trading strategies in commodity futures: A re-examination. Szakmary, Shen, Sharma, 2010, Journal of Banking &amp; Finance. https://doi.org/10.1016/j.jbankfin.2009.08.004 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 10.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Trend rules earned profits in most commodity futures in a long sample.

## Post-Publication Decay

Shares trend weakness in the 2010s.

Decay source: Time series momentum: Is it there?. Huang, Li, Wang, Zhou, 2020, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2019.08.004 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md), [backtrader](../../08-software/backtrader.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 3.15
- code QuantDinger: library/strategies/002_quantdinger_donchian_breakout.py
- code QuantDinger: library/strategies/008_quantdinger_high_low_channel.py
- code QuantDinger: library/strategies/010_quantdinger_ssl_channel.py
- code QuantDinger: library/strategies/015_quantdinger_turtle_system.py
- code QuantDinger: library/strategies/017_quantdinger_fractal_breakout.py
- code QuantDinger: library/strategies/042_quantdinger_turtle_donchian_atr.py
- code QuantDinger: library/strategies/105_quantdinger_channel_breakout.py
- code QuantDinger: library/strategies/142_quantdinger_high_low_channel_multi_averages_crypto_swing_strategy.py
- code QuantDinger: library/strategies/143_quantdinger_hybrid_rsi_breakout_dashboard.py
- code backtrader: samples/pinkfish-challenge/pinkfish-challenge.py
- code jesse: jesse/strategies/RealStrategyRegression2/__init__.py
- code prediction-market-backtesting: strategies/breakout.py
- code pysystemtrade: systems/provided/rules/breakout.py
- code rqalpha: rqalpha/examples/turtle.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
