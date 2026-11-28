# WaykiChain

https://github.com/WaykiChain/WaykiChain. License MIT. Stars 1,046. Last push 2022-11-30. C++. Checked 2026-11-27.

## Architecture
Bitcoin-derived C++ node in `src/`: `chain`, `p2p`, `rpc`, `wallet`, `miner` (with PBFT context and manager), `persistence` (databases), `crypto`, `entities`, `tx` and two contract VMs, `vm/luavm` and `vm/wasm`. Build by autotools, with Gitian descriptors, Debian packaging and Docker.

## Data Layer
Block and state databases in `persistence/`, covering accounts, assets, CDPs, DEX orders and price feeds. A transaction memory pool in `tx/txmempool`.

## Event Loop
Node main loop with network threads, a mining thread and RPC server. Consensus uses delegated block production with PBFT finality.

## Execution
Typed on-chain transactions in `src/tx/`: coin transfer, asset issue (`assettx`), collateralized debt position (`cdptx`), DEX orders (`dextx`, `dexoperatortx`), price feed and median price (`pricefeedtx`, `blockpricemediantx`), staking, delegate votes, proposals and contract calls (`contracttx`).

## Risk
Protocol-level: CDP collateral ratios, forced liquidation, price median from delegate feeds, and governance proposals to change parameters.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
JSON-RPC interface and wallet. No external exchange adapters.

## Fit
Reference for on-chain stablecoin CDP and DEX mechanics inside a base-layer chain. Low activity since 2022, so use it for reading the CDP and price-feed design.
