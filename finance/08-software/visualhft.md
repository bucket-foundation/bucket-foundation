# VisualHFT

https://github.com/visualHFT/VisualHFT. License Apache-2.0. Stars 1,227. Last push 2026-11-26. C#. Checked 2026-11-27.

## Architecture
WPF desktop terminal on .NET. Core in `VisualHFT.Commons` (plugin base classes, pools, trigger engine, user settings), a `PluginManager`, `TriggerEngine` with UI and REST actions, and `VisualHFT.Plugins/` for connectors and studies. `SDK-MarketConnectorTemplate` and `SDK-StudyTemplate` are starting points for new plugins. `demoTradingCore` is a sample strategy host.

## Data Layer
Market connectors push level 2 books and trades into shared pooled objects. Studies subscribe to those streams in memory.

## Event Loop
Event and subscription driven. Each plugin derives from `BasePluginStudy` or the connector base and publishes updates to the rest of the terminal.

## Execution
`Simulators/ExchangeExecutionSimulator.cs` simulates fills for testing. The terminal is an observability tool and sends no live orders.

## Risk
Trigger rules (`TriggerRule`, `TriggerCondition`, `TimeWindow`) fire UI or REST actions when a study crosses a threshold. They alert and do not trade.

## Strategies Shipped
Market studies: VPIN order flow toxicity, LOB imbalance, market resilience with a bias variant, and order-to-trade ratio.

## AI Components
None.

## Connectors
Binance, Bitfinex, Bitstamp, Coinbase, Gemini, Kraken, KuCoin and a generic WebSocket plugin.

## Fit
Real-time microstructure monitor with a clean plugin SDK. VPIN and book imbalance code is reusable as reference for signal features.
