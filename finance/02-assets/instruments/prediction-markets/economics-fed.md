# Economics and the Fed

ID `I-pm-economics-fed`. As of 2026-11-27.

Parent: [Prediction Markets](../../prediction-markets.md).

## Venues
- Kalshi: category "Economics, Financials" in the open events API. Grade A.
- Polymarket: tag "economy" in the Gamma events API, which serves the international venue. Polymarket US listings not fetched. Grade A for international, C for US.
- Robinhood: Economics on the prediction markets page. Grade A.

## Contract Structure
Binary Yes and No contracts priced from $0.01 to $0.99 that pay $1 on Yes. Strike ladders: one binary contract per threshold, such as fed funds upper bound above X%. Grade A.

## Example Live Markets
- Kalshi KXFED-26DEC, fed funds rate after the 9 Dec 2026 meeting: "Above 3.25%" Yes last $0.99, "Above 4.50%" $0.01; resolves on the upper bound published on the Federal Reserve website.
- Kalshi KXCPI-26NOV, November 2026 CPI, open.
- Polymarket fed-decision-in-december: $65,512,173 volume; how-many-fed-rate-cuts-in-2026: $56,531,065 volume.
Prices are last trade from the Kalshi API and volume is lifetime from the Polymarket Gamma API, both fetched 2026-11-27. Grade A.

## New Jersey Status
- Kalshi: Third Circuit ruled 2-1 for Kalshi on 2026-04-06; New Jersey cert petition No. 26-299 pending, Kalshi response due 2026-12-07.
- Polymarket US: DeFi Rate lists it as available in NJ; the Third Circuit ruling names Kalshi only, so state enforcement risk remains. Polymarket international blocks US users.
- Robinhood: offered through Robinhood Derivatives, LLC; Robinhood bars IRAs.
Source: [ACCESS-MATRIX](../../../10-markets-law/ACCESS-MATRIX.md). Grade B.

## Sources
- [Kalshi events API, series KXFED](https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXFED&status=open), fetched 2026-11-27.
- [Kalshi open events](https://api.elections.kalshi.com/trade-api/v2/events?status=open&limit=200), fetched 2026-11-27.
- [Polymarket Gamma events, tag economy](https://gamma-api.polymarket.com/events?active=true&closed=false&tag_slug=economy&order=volume&ascending=false), fetched 2026-11-27.
- [Robinhood prediction markets](https://robinhood.com/us/en/prediction-markets/), fetched 2026-11-27.
