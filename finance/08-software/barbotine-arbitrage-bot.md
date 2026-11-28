# barbotine-arbitrage-bot

https://github.com/rexonelo/barbotine-arbitrage-bot. License Other. Stars 650. Last Push 2026-02-04. Python below 3.12. Checked 2026-11-27.

## Architecture
Three files. `main.py` parses modes and arguments and launches a session. `bot-fake-money.py` holds `TradingState`, `TradingConfig` and the opportunity monitor. `exchange_config.py` handles credentials, balances, fee and precision lookups, Telegram messages and emergency liquidation.

## Data Layer
ccxt order books fetched per exchange; balance and opportunity logs written to text files. No database.

## Event Loop
asyncio tasks, one per exchange, gathered inside a session. A listener thread waits for a manual exit key. `main.py` renews sessions on a timer when renewal is enabled.

## Execution
The public repo runs `fake-money` mode: it simulates orders with a configurable delay and re-reads the book before filling. The `real` mode is withheld; the README points to a paid full version. A `delta_neutral_config.py` names a Hyperliquid futures leg.

## Risk
Balance simulation across venues before each trade, emergency convert and cancel-all helpers, manual rebalance on Enter. No standing limits.

## Strategies Shipped
Cross-exchange spot arbitrage that pre-positions balances on every venue so no transfers occur.

## AI Components
None.

## Connectors
ccxt exchanges, Telegram and webhooks.

## Fit
Readable demonstration of order book arbitrage with balance simulation. The live path is closed source, so the repo works as a simulator and design sketch.
