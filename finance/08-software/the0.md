# the0

https://github.com/alexanderwanyoike/the0. License Apache-2.0. Stars 440. Last push 2026-11-15. TypeScript, Go. Checked 2026-11-27.

## Architecture
Platform for deploying bots as containers. `api/` NestJS (bots, custom bots, bot state, logs, API keys, MCP server), `runtime/` Go (daemon, docker and k8s launchers, desired-state reconciler, log shipping), `cli/` Go, `frontend/` Next.js, `sdk/` for Python, Node, Rust, C++, C#, Scala, Haskell and React, `k8s/` Helm chart, `example-bots/`.

## Data Layer
PostgreSQL for users and bot definitions (Drizzle), MongoDB for runtime state, NATS for events, S3-compatible store for bot code and logs.

## Event Loop
NATS events between API, runner and scheduler. Bots run as realtime containers or scheduled CronJobs.

## Execution
Runs user bot code. The platform places no orders itself. Example bots emit signals and metrics through the SDK.

## Risk
None in the platform. `python-macro-event-guard` flags scheduled macro releases so other bots can stand aside.

## Strategies Shipped
Example bots: SMA crossover in Rust, C++, C#, Scala and Haskell on Yahoo Finance prices; `typescript-price-alerts`; `python-portfolio-tracker`; `python-macro-event-guard`.

## AI Components
MCP server in the API so Claude Code or another client can list, deploy and debug bots.

## Connectors
Yahoo Finance REST and the FXMacroData calendar in examples. No broker adapter.

## Fit
Bot hosting layer with polyglot SDKs and Kubernetes deployment. Bring your own strategy and broker code.
