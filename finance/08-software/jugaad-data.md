# jugaad-data

https://github.com/jugaad-py/jugaad-data. License None. Stars 601. Last Push 2026-11-21. Python. Checked 2026-11-27.

## Architecture
Package `jugaad_data/` with `nse` (`history.py`, `live.py`, `archives.py`), `bse/live.py`, `amfi`, `rbi`, `holidays.py`, `util.py` and a `cli.py`. Classes `NSEHistory`, `NSEIndexHistory` and `NSELive` wrap exchange web endpoints.

## Data Layer
Scrapes NSE history, derivatives, index and total return index series, bhavcopy archives, AMFI mutual fund data and RBI data. Optional pandas output and an on-disk response cache.

## Event Loop
None. Pull functions and a CLI. Each source class builds a session with browser-like headers, because the exchange sites reject bare clients.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None. An `AGENTS.md` guides coding agents.

## Connectors
NSE, BSE, AMFI and RBI public sites.

## Fit
Primary free source for Indian equity and derivatives history. Each change to an exchange site can break a scraper, so pin the version and test it.
