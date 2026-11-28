# uniswap-python

https://github.com/uniswap-python/uniswap-python. License MIT. Stars 1,018. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
Client classes in `uniswap/`: `uniswap.py` (`Uniswap` for V1, V2 and V3), `uniswap4.py` (V4), and async twins `asyncuniswap.py` and `asyncuniswap4.py`. Helpers in `fee.py`, `token.py`, `tokens.py`, `util.py` and `constants.py`, a `cli.py` entry point and ABIs under `assets/`. `examples/price_impact.py` and `v4_examples.py` show usage.

## Data Layer
On-chain reads through web3.py: pool and exchange contracts, token balances, tick bitmaps and pool TVL. `constants.py` maps chain ids (Ethereum, Polygon, Unichain, World Chain and others) to deployments. The `metrics/` folder holds daily adoption snapshots as JSON.

## Event Loop
None. Synchronous calls, or async variants for the caller's loop.

## Execution
`make_trade` and `make_trade_output` for exact-in and exact-out swaps across ETH and token pairs, with V3 multi-hop routes. Liquidity calls: `add_liquidity`, `mint_liquidity`, `close_position`. Token approval, deadline, gas parameters and `multicall`.

## Risk
Slippage bounds on max input and min output, approval checks, and typed exceptions. No portfolio risk.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Uniswap V1, V2, V3 and V4 contracts on EVM chains through any web3 provider.

## Fit
Direct swap and quote client for on-chain legs of a DeFi system. Quote functions read price impact without sending a transaction.
