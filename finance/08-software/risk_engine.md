# risk_engine

https://github.com/skyhackvip/risk_engine. License Apache License 2.0. Stars 678. Last Push 2026-07-07. Go. Checked 2026-11-27.

## Architecture
Decision engine for credit and fraud scenarios. `core/` has node types (`ruleset.go`, `tree.go`, `matrix.go`, `scorecard.go`, `abtest.go`, `conditional.go`), `flow.go`, `pipeline.go`, `kernel.go` and the `dsl.go` YAML parser. `api/` serves HTTP, `internal/operator` holds comparators, and `core/udf` adds sum, avg, min and max.

## Data Layer
Feature values arrive in the request and are typed (int, string, bool, date, array, map) in `core/feature.go`. Flows load from YAML files in `demo/`. No database.

## Event Loop
Request-response over HTTP through gin handlers. A flow executes nodes serially or concurrently and short-circuits on a blocking rule.

## Execution
None. Output is a decision and score.

## Risk
This is the product: rule sets, decision trees, decision tables, matrix tables, scorecards, champion-challenger tests and conditional branching.

## Strategies Shipped
Eight demo flows: simple, ruleset, tree, matrix, scorecard, abtest, conditional and multifeature.

## AI Components
None.

## Connectors
None.

## Fit
Template for a rules and scorecard layer in front of any payment or lending decision. Not a market trading system. Documentation is in Chinese.
