# exchange-core

https://github.com/exchange-core/exchange-core. License Apache-2.0. Stars 2,678. Last push 2026-11-27. Java. Checked 2026-11-27.

## Architecture
Java matching engine on the LMAX Disruptor ring buffer. `ExchangeCore.java` wires stages: grouping, `RiskEngine`, `MatchingEngineRouter`, `ResultsHandler`; `orderbook/` has a naive and a direct-memory ART order book; `processors/journaling` adds snapshots and replay. `ExchangeApi.java` is the entry.

## Data Layer
In-memory order books and user profiles; Chronicle Wire serialization, LZ4 snapshots.

## Event Loop
Single-writer pipeline over a ring buffer with pinned threads; commands are events.

## Execution
Matching of GTC, IOC, FOK budget and post-only orders on spot, margin and futures symbols.

## Risk
`RiskEngine` pre-checks balances and margin before a command reaches the matcher; state hash checks for replay.

## Strategies Shipped
None, this is an exchange.

## AI Components
None.

## Connectors
In-process Java API; tests include latency and throughput suites (millions of ops a second).

## Fit
Reference for a low-latency exchange core. Useful for building a simulator or a local paper exchange.
