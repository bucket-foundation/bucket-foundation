# pandas_market_calendars

https://github.com/rsheftel/pandas_market_calendars. License MIT. Stars 1,011. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
`MarketCalendar` base class in `market_calendar.py` with a name registry (`calendar_registry.py`, `class_registry.py`) and `get_calendar(name)` factory. About 30 calendar modules in `calendars/` (NYSE, CME Globex families, CBOE, ICE, LSE, Eurex, JPX, HKEX, SSE, NSE, ASX, TSX, SIX, TASE, forex, a crypto Globex session and others). `holidays/` holds rule sets; `sources.py` records where each calendar came from. `calendar_utils.py` has `merge_schedules`, `date_range` and session marking.

## Data Layer
Holiday rules, early closes and late opens defined as pandas offsets in code. Output is DataFrames of UTC open and close timestamps per session, with optional break and pre or post market columns.

## Event Loop
None.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
None.

## Fit
Utility for any backtest or live loop that needs session boundaries, holidays, half days and intraday date ranges. Methods `schedule`, `valid_days`, `open_at_time`, `is_open_now`, `early_closes` and `late_opens` cover the common calls. Also used by Zipline-style engines.
