# trader

https://github.com/timercrack/trader. License Apache-2.0. Stars 8,482. Last push 2026-02-28. C. Checked 2026-11-27.

## Architecture
Django project with an asyncio trading core. `native/ctp_bridge/` is a C++ pybind module over the CTP futures API (Linux and Windows headers). `ctp_native/` holds `gateway.py`, `bus.py` and `state_store.py`. `strategy/` has `base_strategy.py` (993 lines), `brother2.py` and `kronos.py`. `panel/` is the Django admin dashboard.

## Data Layer
MySQL through Django models (`MainBar`, `Trade`, `Instrument`); daily main-contract bars feed signals. `bus.py` includes a `LocalRedisLikeClient` that stands in for Redis.

## Event Loop
Async: the base strategy starts a session, refreshes account, positions and instruments, subscribes market data and reacts to CTP callbacks.

## Execution
`ReqOrderInsert` and `cancel_order` send Chinese futures orders through CTP, with contract roll handling when the main code changes.

## Risk
Volatility sizing: risk fraction of equity divided by ATR times contract multiplier; the order is dropped when margin or the risk budget is exceeded. ATR trailing stop.

## Strategies Shipped
`brother2.py`: channel breakout trend following with long and short smoothed averages and ATR stop. `kronos.py` forecasts main-contract bars with the Kronos model.

## AI Components
`kronos.py` loads a pretrained Kronos tokenizer and predictor on CUDA.

## Connectors
CTP, WeChat notifier, MySQL.

## Fit
Complete futures stack for China with real broker plumbing and ATR sizing.
