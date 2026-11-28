# a-stock-data

https://github.com/simonlin1212/a-stock-data. License Apache-2.0. Stars 12,053. Last push 2026-11-03. Python. Checked 2026-11-27.

## Architecture
An agent skill rather than a package. `SKILL.md` (v3.10.4) carries 87 endpoint recipes with runnable Python inlined, grouped into 15 layers. `docs/` records source integrations per release; `tests/` hold fixture-based checks for adjustment factors, valuation and official data.

## Data Layer
No store. Recipes call Tencent, exchange sites, Eastmoney, Sina, Cninfo and others; `tests/fixtures/sina_adjust/` pins forward and backward adjusted price samples.

## Event Loop
None.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
The skill is written for coding agents: it states when to load and when to skip, lists fallback sources when a primary is blocked, and rate-limits Eastmoney calls.

## Connectors
34 sources across quotes, research reports, northbound flow, margin data, limit-up pools, convertible bonds, futures exchanges and macro rates.

## Fit
Compact data cookbook for agents working on Chinese equities and futures. Fallback table is the useful part.
