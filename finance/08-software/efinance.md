# efinance

https://github.com/Micro-sheep/efinance. License MIT. Stars 4,189. Last push 2026-07-17. Python. Checked 2026-11-27.

## Architecture
Library `efinance/` with one subpackage per asset class (`stock`, `fund`, `bond`, `futures`), each with `getter.py`, `config.py` and `utils.py`, plus `common/` for shared getters and `shared/`. Functions return pandas objects.

## Data Layer
No store. Scrapes Eastmoney quote, fund and bond endpoints. Multi-code calls fan out with the `multitasking` thread helper. `get_quote_history`, `get_realtime_quotes`, `get_history_bill`, `get_today_bill` and `get_top10_stock_holder_info` cover prices, money flow and holders.

## Event Loop
None. Pull functions.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Eastmoney web endpoints.

## Fit
Short route to A-share, fund, bond and futures quotes and fund-flow bills. A single upstream makes it fragile.
