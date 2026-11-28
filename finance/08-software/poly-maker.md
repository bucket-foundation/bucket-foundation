# poly-maker

https://github.com/warproxxx/poly-maker. License MIT. Stars 1,541. Last push 2026-07-09. Python 3.12. Checked 2026-11-27.

## Architecture
Single async process in `src/polymaker/`: `catalog` (Gamma API market scan and scoring), `marketdata` (websocket order books), `strategy` (estimators, quoting, regime), `execution` (gateway, rate limit, reconciler), `risk/manager.py`, `state` (SQLite), `userstream`, `alerts.py`, `journal.py`.

## Data Layer
Gamma API for market metadata, CLOB market websocket for books, user websocket for fills. SQLite state.

## Event Loop
asyncio; book updates trigger requoting; reconciler diffs target quotes against live orders with churn tolerance.

## Execution
Post-only maker orders on Polymarket CLOB V2, both sides (BUY YES and BUY NO). Exchange heartbeat as dead-man switch; position merge (`merge.py`) recovers collateral.

## Risk
Position caps per market, daily-loss kill switch, regime machine that pulls quotes during news spikes, volatility and toxicity estimators.

## Strategies Shipped
`strategy/quoting.py`: fair value plus inventory skew two-sided quoting; `regime.py`: quote pull on volatility regime; `catalog/scoring.py`: rank markets by reward and rebate income against spread and volatility risk.

## AI Components
None.

## Connectors
Polymarket CLOB V2, Gamma API.

## Fit
Best open reference for Polymarket liquidity provision with the risk parts (heartbeat, kill switch, regime pull) in place. Paper mode exists.
