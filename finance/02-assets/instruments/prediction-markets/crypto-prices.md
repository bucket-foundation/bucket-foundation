# Crypto Prices

ID `I-pm-crypto-prices`. As of 2026-11-27.

Parent: [Prediction Markets](../../prediction-markets.md).

## Venues
- Kalshi: category "Crypto" in the open events API. Grade A.
- Polymarket: tag "crypto" in the Gamma events API, which serves the international venue. Polymarket US listings not fetched. Grade A for international, C for US.
- Robinhood: Crypto on the prediction markets page. Grade A.

## Contract Structure
Binary Yes and No contracts priced from $0.01 to $0.99 that pay $1 on Yes. Hourly and daily strike ladders on an index price; Kalshi BTC contracts settle on the 60-second average of the CF Benchmarks BRTI. Grade A.

## Example Live Markets
- Kalshi KXBTCD-26NOV2717, BTC price at 5 pm EST on 27 Nov 2026: "$66,500 or above" Yes last $0.01.
- Polymarket what-price-will-bitcoin-hit-before-2027: $96,860,195 volume; when-will-bitcoin-hit-150k: $27,389,652 volume.
Prices are last trade from the Kalshi API and volume is lifetime from the Polymarket Gamma API, both fetched 2026-11-27. Grade A.

## New Jersey Status
- Kalshi: Third Circuit ruled 2-1 for Kalshi on 2026-04-06; New Jersey cert petition No. 26-299 pending, Kalshi response due 2026-12-07.
- Polymarket US: DeFi Rate lists it as available in NJ; the Third Circuit ruling names Kalshi only, so state enforcement risk remains. Polymarket international blocks US users.
- Robinhood: offered through Robinhood Derivatives, LLC; Robinhood bars IRAs.
Source: [ACCESS-MATRIX](../../../10-markets-law/ACCESS-MATRIX.md). Grade B.

## Sources
- [Kalshi events API, series KXBTCD](https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXBTCD&status=open), fetched 2026-11-27.
- [Kalshi open events](https://api.elections.kalshi.com/trade-api/v2/events?status=open&limit=200), fetched 2026-11-27.
- [Polymarket Gamma events, tag crypto](https://gamma-api.polymarket.com/events?active=true&closed=false&tag_slug=crypto&order=volume&ascending=false), fetched 2026-11-27.
- [Robinhood prediction markets](https://robinhood.com/us/en/prediction-markets/), fetched 2026-11-27.
