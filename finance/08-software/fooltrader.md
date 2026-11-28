# fooltrader

https://github.com/foolcage/fooltrader. License MIT. Stars 1,201. Last push 2023-05-22. Python. Checked 2026-11-27.

## Architecture
Scrapy-based data system in `fooltrader/`: `spiders`, `datasource`, `datamanager`, `domain` (market schema), `api`, `rest`, `bot` and `botsamples`, `connector`, `sched`. Docs state the project is frozen and succeeded by zvt.

## Data Layer
Scrapy spiders for China stocks, futures and crypto, stored as CSV and Elasticsearch documents under one schema.

## Event Loop
Scheduled spider runs; bot classes consume ticks and kline events.

## Execution
Sample bots against a simulated account; no broker.

## Risk
None.

## Strategies Shipped
`botsamples/` holds simple MA-based sample bots.

## AI Components
None.

## Connectors
Scrapy sources, Elasticsearch, REST API.

## Fit
Historical reference for schema-first market data. Superseded by zvt.
