# polymarket-kalshi-weather-bot

https://github.com/suislanchez/polymarket-kalshi-weather-bot. License none declared. Stars 845. Last push 2026-03-02. Python backend, React frontend. Checked 2026-11-27.

## Architecture
`backend/`: data (weather, weather_markets, kalshi_markets, btc_markets, crypto), core (signals, weather_signals, scheduler, settlement), ai (Claude, Groq), FastAPI `api/main.py`, SQLite models. React dashboard in `frontend/`.

## Data Layer
31-member GFS ensemble forecasts, Kalshi KXHIGH temperature markets, Polymarket weather markets, Binance 1-minute candles.

## Event Loop
Scheduler scans markets, writes signals, settles them later.

## Execution
Signal generation and simulated settlement; the code has no live order path.

## Risk
Fractional Kelly 0.15, max trade size $75 for BTC and $100 for weather, max entry price, max pending trades.

## Strategies Shipped
`core/weather_signals.py`: probability equals the share of ensemble members above the bucket threshold; trade when edge vs market is 8% or more. `core/signals.py`: BTC 5-minute up/down composite of RSI, momentum, VWAP deviation, SMA cross and market skew; three of four must agree, entry at 55 cents or less, 2% edge minimum.

## AI Components
Claude and Groq classify markets and review signals.

## Connectors
Kalshi, Polymarket reads, Binance data.

## Fit
Template for the weather edge in `06-youtube/SYNTHESIS.md`. It already works as a signal generator with a dashboard, the notify-first shape. No license.
