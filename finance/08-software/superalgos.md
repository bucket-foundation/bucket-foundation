# Superalgos

https://github.com/Superalgos/Superalgos. License Apache-2.0. Stars 5,827. Last push 2026-11-14. JavaScript (Node). Checked 2026-11-27.

## Architecture
Node platform with a browser visual editor. `Projects/` holds subsystems: Data-Mining, Algorithmic-Trading (TS/Bot-Modules/Trading-Bot), Portfolio-Management, Machine-Learning, TensorFlow, Social-Trading, Trading-Signals, Bitcoin-Factory, Network. Strategies are hierarchies of visual nodes (trigger on, take position, take profit, stop) saved as JSON in plugin repos.

## Data Layer
Sensor bots pull exchange candles and trades; indicator bots compute datasets to disk; all stored as files in `Local-Storage`.

## Event Loop
Task server runs bots per time frame; trading bot loop evaluates the node strategy each candle.

## Execution
ccxt-based exchange orders, paper, backtest and forward test from the same strategy definition. Network nodes can share signals.

## Risk
Stop loss and take profit phases in each strategy node; position size formulas.

## Strategies Shipped
None in this repo; community strategies live in separate plugin repos referenced by `Plugins/project-plugin-map.json`.

## AI Components
TensorFlow and Bitcoin-Factory projects train ML forecasters on the network.

## Connectors
Crypto exchanges through ccxt, Binance first.

## Fit
Heavy install, visual-first, crypto only. Low fit for a code-first notify system.
