# crypto-trading-bot

https://github.com/Haehnchen/crypto-trading-bot. License MIT. Stars 3,552. Last push 2026-08-02. TypeScript. Checked 2026-11-27.

## Architecture
`src/`: `bot_runner.ts`, `modules/` (exchange, strategy, trade, ta, http, system), `strategy/` with strategy files, web UI in `web/` and `views/`, notifiers in `notify/`.

## Data Layer
Candles from exchanges through ccxt, stored in SQLite.

## Event Loop
Per-pair ticks evaluate strategies on candle close.

## Execution
ccxt orders; signal-only mode sends notifications without trading.

## Risk
Strategy-level stop loss and take profit; per-pair capital.

## Strategies Shipped
`src/strategy/strategies/`: awesome_oscillator_cross_zero, cci, cci_macd, macd, obv_pump_dump, parabolicsar, pivot_reversal_strategy, dca_dipper, dip_catcher, noop.

## AI Components
None.

## Connectors
100+ exchanges through ccxt; Telegram and Slack notify.

## Fit
Signal-only mode with Telegram notify matches the notify-first shape for crypto.
