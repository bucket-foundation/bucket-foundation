# SmartInvest

https://github.com/wzhe06/SmartInvest. License MIT. Stars 460. Last push 2021-09-13. Python. Checked 2026-11-27.

## Architecture
One script per idea, each with the same helpers (`get_drawdown`, `cal_period_perf_indicator`): `rotationStrategy/`, `trendStrategy/`, `timingByPERank/`, `calendarStrategy/`, `smartMortgage/`, plus `quantTrading/quantInvestExample.ipynb` and an investment tracking spreadsheet.

## Data Layer
CSV files of China index history (CSI 300, CSI 500, CSI 1000, futures main contract, index PE). Comments and column names are Chinese.

## Event Loop
Vectorized pandas, with a row loop where position depends on yesterday's position.

## Execution
None. Backtests multiply a position series by index returns and plot the equity curve.

## Risk
Max drawdown and period performance metrics. No position sizing.

## Strategies Shipped
`RotationStrategy.py`: hold CSI 300 or CSI 500 by 20-day momentum, with a cash variant. `TrendStrategy.py`: dual moving average and Bollinger band timing. `TimingByPERank.py`: flat above 0.8 PE percentile over five years, long again below 0.5. `CalendarStrategy.py`: hold index on trading days 1 to 5 of each month. `SmartMortgage.py`: mortgage against investment return calculator.

## AI Components
None.

## Connectors
None.

## Fit
Readable index timing backtests for China A-share indexes. Research scripts, no live path.
