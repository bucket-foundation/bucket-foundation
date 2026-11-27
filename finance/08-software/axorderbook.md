# AXOrderBook

https://github.com/fpga2u/AXOrderBook. License MIT. Stars 424. Last push 2024-01-15. Python and C++ HLS. Checked 2026-11-27.

## Architecture
`py/behave/axob.py` (1,876 lines, class `AXOB` with `onMsg`, `onOrder`, `onExec`, `onTrade`, price cage logic), `py/tool/` message parsers for Level 2 order, execution and snapshot records (`axsbe_*`), `hw/` Vitis HLS kernels (HBM access, HBM arbiter) for an Alveo U50, `doc/design.md`.

## Data Layer
A-share tick-by-tick order and execution messages from the Shanghai and Shenzhen exchanges; replay test scripts per trading day. HBM2 holds orders and price trees on the FPGA design.

## Event Loop
Message driven: `AXOB.onMsg` processes one security's L2 messages serially. The hardware design runs macro units in parallel, each owning 64 securities, behind a router and an arbiter.

## Execution
None. Rebuilds order books and publishes 1000-level snapshots with order queues per level.

## Risk
None. Models the exchange price cage (`CAGE`) and auction phases.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Shanghai and Shenzhen Level 2 message formats.

## Fit
Reference for exchange-grade order book reconstruction, including the active (simulated matching) and passive (wait for trades) models. Use for A-share market microstructure work.
