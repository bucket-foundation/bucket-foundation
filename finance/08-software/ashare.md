# Ashare

https://github.com/mpquant/Ashare. License None stated. Stars 3,954. Last push 2025-12-24. Python. Checked 2026-11-27.

## Architecture
One 70-line module `Ashare.py` with a single public function `get_price`. It dispatches to `get_price_day_tx` (Tencent daily), `get_price_min_tx` (Tencent minute) and `get_price_sina` (Sina any period). `MyTT.py` is bundled; `Demo1.py` and `Demo2.py` show indicator use.

## Data Layer
Tencent and Sina quote endpoints return JSON that the module reshapes into a DataFrame with open, close, high, low and volume. If one source fails the code falls back to the other. No store.

## Event Loop
None. Polling is left to the caller.

## Execution
None.

## Risk
None.

## Strategies Shipped
`Demo1.py` and `Demo2.py` compute MA, MACD and similar indicators on fetched bars and print crossovers.

## AI Components
None.

## Connectors
Tencent and Sina quote APIs.

## Fit
Minimal free A-share price fetcher with source failover. The endpoints are unofficial and unversioned, so a break gives no warning.
