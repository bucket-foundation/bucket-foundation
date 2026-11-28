# microrealestate

https://github.com/microrealestate/microrealestate. License Other (custom LICENSE.md). Stars 1,246. Last push 2026-11-18. TypeScript. Checked 2026-11-27.

## Architecture
Docker Compose set of services under `services/`: `api` (managers for leases, rents, properties, occupants, accounting and dashboard), `authenticator`, `gateway`, `emailer`, `pdfgenerator`, `resetservice`, `tenantapi`, and `common` with shared models. Web apps in `webapps/` (`landlord`, `tenant`, `commonui`). `cli/` and `docker/` carry install scripts and a Caddy proxy.

## Data Layer
MongoDB collections defined in `services/common/src/collections` (account, `realm` and others). Redis is a cache with a 32 MB cap.

## Event Loop
Request and response HTTP services. A cron in `services/api/src/crons/renewcontractjob.ts` renews leases.

## Execution
No order flow. `businesslogic/tasks` runs a rent computation pipeline in seven steps: base, debts, discounts, VATs, balance, payments, total. Receipts and notices render as PDFs and go out by email.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
SMTP and other email transports, PDF generation, Caddy.

## Fit
Landlord accounting and rent collection tooling. It is an operations app, so it feeds treasury and receivables work only if Bucket ever holds rented property. Low relevance to trading research.
