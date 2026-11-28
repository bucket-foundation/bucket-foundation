# bt

https://github.com/pmorissette/bt. License MIT. Stars 3,045. Last push 2026-11-24. Python. Checked 2026-11-27.

## Architecture
Tree of `Strategy` and `Security` nodes. Each strategy runs an `AlgoStack` of small composable `Algo` objects (when to run, what to select, how to weigh, rebalance). Built on ffn for stats.

## Data Layer
pandas price frames passed in; `bt.get` wraps ffn/yfinance.

## Event Loop
Daily loop over the index; each node updates value, then algos run on rebalance dates.

## Execution
Simulated rebalance at close with commission functions. No live trading.

## Risk
`TargetVol`, `LimitWeights`, `LimitDeltas`, `Margin`, `HedgeRisks` algos.

## Strategies Shipped
Building blocks in `bt/algos.py`: RunDaily/Weekly/Monthly/Quarterly, SelectMomentum, SelectN, SelectWhere, WeighEqually, WeighInvVol, WeighERC, WeighMeanVar, WeighTarget, TargetVol, Rebalance, RebalanceOverTime, CapitalFlow, TaxLiabilities.

## AI Components
None.

## Connectors
None.

## Fit
Fast to test allocation sleeves (momentum rotation, risk parity, 60/40 variants) that feed the monthly rebalance alert.
