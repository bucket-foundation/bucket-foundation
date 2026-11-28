# OSkhQuant

https://github.com/khscience/OSkhQuant. License NOASSERTION. Stars 1,704. Last push 2026-10-19. Python. Checked 2026-11-27.

## Architecture
Desktop PyQt app for China A-shares: `GUIkhQuant.py`, `khFrame.py` (strategy frame), `khTrade.py`, `khRisk.py`, `khQTTools.py`, `MyTT.py` indicators, `khChanLunTools.py` (Chan theory), `duckdb_storage`, `BacktestHistoryManager.py`.

## Data Layer
Downloads quotes through baostock and xtquant into DuckDB.

## Event Loop
Frame callback model: user strategy implements `init` and `handlebar`.

## Execution
Backtest fills with commission and slippage; live path via QMT is not shipped.

## Risk
`khRisk.py` position and stop checks.

## Strategies Shipped
Strategy templates in docs and indicator library (MyTT, Chan lines).

## AI Components
None.

## Connectors
baostock, xtquant data.

## Fit
Installable desktop backtester for A-shares with a QMT-style strategy API.
