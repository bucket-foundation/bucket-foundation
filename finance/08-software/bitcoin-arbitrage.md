# bitcoin-arbitrage

https://github.com/maxme/bitcoin-arbitrage. License MIT. Stars 2,588. Last push 2024-10-20. Python. Checked 2026-11-27.

## Architecture
`arbitrage/arbitrer.py` holds the `Arbitrer`; `public_markets/` has 29 exchange depth readers (`_bitstamp.py`, `_binance.py`, `_bitfinex.py`, `_gdax.py` and others); `private_markets/` has trading clients for Bitstamp and Paymium; `observers/` receive opportunities.

## Data Layer
Polls order book depth from each public market; `fiatconverter.py` converts quote currencies. `historydumper.py` writes depths to disk and `replay_history` replays them.

## Event Loop
Blocking `while True` loop in `Arbitrer.loop`: update depths, run `tick`, sleep for `refresh_rate`.

## Execution
`traderbot.py` executes the most profitable queued opportunity on one private client with a 120 second wait between trades; `traderbotsim.py` simulates.

## Risk
Balance margin check sizing volume by cash and coin balance; minimum profit and volume thresholds in `config.py-example`. No kill switch.

## Strategies Shipped
`arbitrer.py`: cross-exchange depth walk, buy on the lowest ask and sell on the highest bid while ask is below bid.

## AI Components
None.

## Connectors
29 public exchange modules, two private clients, email and XMPP alerts.

## Fit
Historical reference for cross-exchange spread detection. Exchange APIs are dated; the depth-walk profit function is the reusable part.
