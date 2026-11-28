# Weather and Climate

ID `I-pm-weather`. As of 2026-11-27.

Parent: [Prediction Markets](../../prediction-markets.md).

## Venues
- Kalshi: category "Climate and Weather" in the open events API. Grade A.
- Polymarket: tag "weather" in the Gamma events API, which serves the international venue. Polymarket US listings not fetched. Grade A for international, C for US.
- Robinhood: Climate on the prediction markets page. Grade A.

## Contract Structure
Binary Yes and No contracts priced from $0.01 to $0.99 that pay $1 on Yes. Daily temperature brackets per city; long-dated climate binaries. Grade A.

## Example Live Markets
- Kalshi KXHIGHNY-26NOV28, NYC high on 28 Nov 2026: "52 to 53 degrees" Yes last $0.40; resolves on the Central Park CLINYC reading per The Weather Company.
- Kalshi KXWARMING-50, 2 degrees Celsius warming before 2050, open.
- Polymarket where-will-2026-rank-among-the-hottest-years-on-record: $3,960,698 volume. The Polymarket weather tag also returns health markets such as measles counts.
Prices are last trade from the Kalshi API and volume is lifetime from the Polymarket Gamma API, both fetched 2026-11-27. Grade A.

## New Jersey Status
- Kalshi: Third Circuit ruled 2-1 for Kalshi on 2026-04-06; New Jersey cert petition No. 26-299 pending, Kalshi response due 2026-12-07.
- Polymarket US: DeFi Rate lists it as available in NJ; the Third Circuit ruling names Kalshi only, so state enforcement risk remains. Polymarket international blocks US users.
- Robinhood: offered through Robinhood Derivatives, LLC; Robinhood bars IRAs.
Source: [ACCESS-MATRIX](../../../10-markets-law/ACCESS-MATRIX.md). Grade B.

## Sources
- [Kalshi events API, series KXHIGHNY](https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXHIGHNY&status=open), fetched 2026-11-27.
- [Kalshi open events](https://api.elections.kalshi.com/trade-api/v2/events?status=open&limit=200), fetched 2026-11-27.
- [Polymarket Gamma events, tag weather](https://gamma-api.polymarket.com/events?active=true&closed=false&tag_slug=weather&order=volume&ascending=false), fetched 2026-11-27.
- [Robinhood prediction markets](https://robinhood.com/us/en/prediction-markets/), fetched 2026-11-27.
