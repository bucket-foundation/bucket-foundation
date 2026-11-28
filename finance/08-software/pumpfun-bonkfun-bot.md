# pumpfun-bonkfun-bot

https://github.com/chainstacklabs/pumpfun-bonkfun-bot. License Apache-2.0. Stars 1,103. Last push 2026-11-25. Python. Checked 2026-11-27.

## Architecture
`src/bot_runner.py` loads one YAML file per bot from `bots/` and starts each in its own process with `multiprocessing`. `src/trading/universal_trader.py` runs the buy and sell flow. `src/platforms/` has one folder per launchpad (pumpfun, launchlab, letsbonk, stonkfun) with address provider, curve math, event parser and instruction builder. `src/monitoring/` holds the listeners.

## Data Layer
Solana RPC, Geyser gRPC streams, block subscriptions, log subscriptions and shred streams. Positions persist as one JSON file per bot in `positions/` via `position_store.py`; `trade_log.py` records trades.

## Event Loop
asyncio per bot. A listener (geyser, logs, blocks or shred stream, chosen by `listener_factory.py`) emits new-coin events that trigger the buy path.

## Execution
Builds bonding-curve buy and sell instructions, plus PumpSwap and LaunchLab CPMM markets after graduation. Dynamic or fixed priority fees in `core/priority_fee`. Slippage limits, an extreme-fast mode that skips the price read, and a cleanup manager that closes token accounts.

## Risk
Pre-buy check pipeline (`trading/checks`): allowed quote mints, transfer fee, name match, creator, mayhem mode and top holders. Fixed buy size, max token age, RPC rate limiter, take-profit and stop-loss percentages, and a hold-time limit.

## Strategies Shipped
Sniper bots by detection source (`bot-sniper-1-geyser`, `-2-logs`, `-3-blocks`, `-5-shreds`, `-6-stonkfun`). Exit modes: time_based, tp_sl and manual.

## AI Components
None.

## Connectors
Solana RPC and WSS, Geyser, pump.fun, PumpSwap, LaunchLab, letsbonk.fun and stonk.fun.

## Fit
Complete reference for launchpad sniping on Solana with the listener, fee and check layers in place. The strategy is entry at coin creation with a short hold, so adverse selection is high. Useful for Solana execution plumbing.
