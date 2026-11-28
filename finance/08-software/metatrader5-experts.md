# metatrader5 geraked

https://github.com/geraked/metatrader5. License MIT. Stars 711. Last push 2025-11-15. MQL5. Checked 2026-11-27.

## Architecture
MQL5 Expert Advisors in `Experts/`, shared code in `Include/`, indicators in `Indicators/`, compiled builds in `Build/`, tester reports in `Test/`. Two `EATemplate` files show the structure: `OnInit`, `OnTick`, position-sizing helpers.

## Data Layer
MT5 terminal price history.

## Event Loop
MT5 tick callback.

## Execution
MT5 trade class order placement.

## Risk
Risk-percent lot sizing, stop-loss and take-profit per trade, optional news filter.

## Strategies Shipped
`CEZLSMA`, `3MAF`, `BBRSI`, `DHLAOS`, `3MACD`, `2MACDSTO`, `2MAAOS`, `AFAOSMD`, `NWERSIASF`, `LRCMACD`, `COT1` and more.

## AI Components
None.

## Connectors
MetaTrader 5 brokers.

## Fit
Large set of readable EAs for forex and CFDs plus a template. Backtest reports ship with each.
