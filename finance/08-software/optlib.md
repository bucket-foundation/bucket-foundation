# optlib

https://github.com/dbrojas/optlib. License MIT. Stars 1,644. Last push 2022-11-18. Python. Checked 2026-11-27.

## Architecture
Small library of three modules: `optlib/gbs.py` (943 lines of pricing math), `optlib/api.py` (market data client) and `optlib/instruments.py` (data classes `Pricehistory`, `Option`, `OptionChain`). One test file, `tests/test_gbs.py`.

## Data Layer
`api.py` calls the TD Ameritrade REST endpoints with an API key read from `TDA_API_KEY`. Responses parse into pandas DataFrames. No local storage.

## Event Loop
None. Synchronous request and calculate calls.

## Execution
None. The library prices and reads quotes only.

## Risk
Greeks (delta, gamma, theta, vega, rho) from the generalized Black-Scholes-Merton functions. Input validation raises `GBS_InputError` and `GBS_CalculationError`.

## Strategies Shipped
None. Pricing models: `black_scholes`, `merton`, `black_76`, `garman_kohlhagen`, `asian_76`, `kirks_76` (spread options), `american` and `american_76` (Bjerksund-Stensland 1993 and 2002 approximations).

## AI Components
None.

## Connectors
TD Ameritrade market data API. That API was retired after the Schwab merger, so the connector is stale while the pricing code stands alone.

## Fit
Compact reference for closed-form option pricing and implied volatility (Newton and bisection solvers). Useful as a test oracle for other pricers. Last push is 2022.
