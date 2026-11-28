# finance.js

https://github.com/ebradyjobory/finance.js. License MIT. Stars 1,269. Last push 2023-03-02. JavaScript. Checked 2026-11-27.

## Architecture
One file, `finance.js`, with a `Finance` constructor and prototype methods, plus TypeScript declarations in `finance.d.ts` and `index.d.ts`. Tests in `test/` covers the formulas with fixed inputs. The npm package name is `financejs`, version 4.1.0, with `finance.js` as the main file and `index.d.ts` for TypeScript users. The test file holds 25 cases.

## Data Layer
None. Pure functions on numbers and arrays.

## Event Loop
None.

## Execution
None.

## Risk
None. Calculations only.

## Strategies Shipped
None. Functions: `PV`, `FV`, `NPV`, `IRR`, `XIRR`, `PP` (payback period), `ROI`, `AM` (amortization), `PI`, `DF`, `CI`, `CAGR`, `LR`, `R72`, `WACC`, `PMT`, `IAR`, `CAPM`, `stockPV`.

## AI Components
None.

## Connectors
None.

## Fit
Small dependency-free corporate finance calculator for browser or Node UIs, such as loan and investment tools. Not a trading component: it has no market data, order handling or portfolio state.
