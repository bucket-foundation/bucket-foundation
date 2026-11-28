# polybot

https://github.com/ent0n29/polybot. License MIT. Stars 1,063. Last push 2026-02-20. Java 21. Checked 2026-11-27.

## Architecture
Maven multi-module of Spring Boot services over a shared `polybot-core`: `executor-service` (order gateway), `strategy-service` (quoting engine), `ingestor-service` (market and user data), `analytics-service` (REST over ClickHouse) and `infrastructure-orchestrator-service`. `research/` holds Python scripts for snapshots, replication scores and paper-trading dashboards. Docker Compose files bring up ClickHouse, Redpanda, Prometheus and Grafana.

## Data Layer
ClickHouse for trades, positions and market context (schema in `analytics-service/clickhouse`). Redpanda (Kafka API) carries order lifecycle events from `HftEventPublisher`. Ingestors read Polymarket CLOB, Data and Gamma APIs, a market websocket, and Polygon receipts over JSON-RPC.

## Event Loop
Services run on Spring scheduling and websocket callbacks. The strategy service calls the executor over HTTP; events flow to Kafka topics.

## Execution
The executor exposes order endpoints for limit, market and cancel, a paper exchange simulator, and an auto-settlement scheduler that redeems conditional tokens through a proxy wallet factory.

## Risk
`LiveTradingGuardFilter` blocks live orders unless enabled. Bankroll service, sizing, taker and timing configs, per-market inventory tracking and a position tracker.

## Strategies Shipped
`GabagoolDirectionalEngine`: quotes both outcomes of short-horizon up/down markets, with complete-set top-up logic that buys the lagging side when the hedged edge clears a threshold. `QuoteCalculator` prices quotes.

## AI Components
None.

## Connectors
Polymarket CLOB, Gamma and Data APIs, Polygon RPC, Kafka-compatible Redpanda, ClickHouse.

## Fit
Most complete JVM reference for Polymarket infrastructure with ingestion, paper mode and replication analytics. Heavy to run: six services plus a broker and a warehouse.
