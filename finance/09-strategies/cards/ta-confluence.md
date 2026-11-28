# Multi-Indicator Confluence

ID: `ta-confluence`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Score several indicators, trend, momentum, volatility and volume, and trade when enough of them agree, as in NNFX, evaluator scores and composite dashboards.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 19 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships the rule with no performance claim. Brock, Lakonishok and LeBaron 1992 found simple trading rules beat buy-and-hold on the Dow before 1987.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OctoBot](../../08-software/octobot.md), [Qbot](../../08-software/qbot.md), [QuantDinger](../../08-software/quantdinger.md), [binance-trading-bot](../../08-software/binance-trading-bot.md), [crypto-trading-bot](../../08-software/crypto-trading-bot.md), [freqtrade](../../08-software/freqtrade.md), [hummingbot](../../08-software/hummingbot.md), [jesse](../../08-software/jesse.md), [tradingview-mcp](../../08-software/tradingview-mcp.md)

## Code

- `freqtrade: freqtrade/templates/sample_strategy.py`
- `hummingbot: controllers/directional_trading/macd_bb_v1.py`
- `jesse: jesse/strategies/RealStrategyRegression1/__init__.py`
- `OctoBot: packages/tentacles/Trading/Mode/daily_trading_mode`
- `binance-trading-bot: packages/strategy/momentum`
- `crypto-trading-bot: src/strategy/strategies/cci_macd.ts`
- `tradingview-mcp: core/services/backtest_service.py`
- `Qbot: qbot/strategies/*.py`
- `QuantDinger: library/strategies/070_quantdinger_easy_system_score.py`
- `QuantDinger: library/strategies/088_quantdinger_optimized_trend_tracker.py`
- `QuantDinger: library/strategies/092_quantdinger_golden_edge.py`
- `QuantDinger: library/strategies/154_quantdinger_nononsense_forex_high_timeframe_trading_absurd_non_rep.py`
- `QuantDinger: library/strategies/156_quantdinger_profit_maximizer_strategy.py`
- `QuantDinger: library/strategies/169_quantdinger_thinktech_ai_signals.py`
- `QuantDinger: library/strategies/183_quantdinger_automated_bitcoin_btc_investment_strategy.py`
- `QuantDinger: library/strategies/185_quantdinger_double_ai_super_trend_trading_strategy_presenttrading.py`
- `QuantDinger: library/strategies/189_quantdinger_grab_trading_system.py`
- `QuantDinger: library/strategies/196_quantdinger_precision_confluence_trading_strategy_joat.py`
- `QuantDinger: library/strategies/205_quantdinger_y_profit_maximizer_strategy_with_exit_points.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
