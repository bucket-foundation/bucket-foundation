# Elections and Politics

ID `I-pm-elections`. As of 2026-11-27.

Parent: [Prediction Markets](../../prediction-markets.md).

## Venues
- Kalshi: category "Politics, Elections" in the open events API. Grade A.
- Polymarket: tag "politics" in the Gamma events API, which serves the international venue. Polymarket US listings not fetched. Grade A for international, C for US.
- Robinhood: Midterms/Elections and Politics on the prediction markets page. Grade A.

## Contract Structure
Binary Yes and No contracts priced from $0.01 to $0.99 that pay $1 on Yes. Multi-outcome events split into one binary contract per candidate or party. Grade A.

## Example Live Markets
- Kalshi KXPRESPARTY-2028, 2028 presidential winner by party: Democratic Yes last $0.67, Republican $0.33; settles on the inauguration for the term starting 20 Jan 2029.
- Polymarket democratic-presidential-nominee-2028: $1,333,039,218 volume; presidential-election-winner-2028: $747,221,802 volume.
Prices are last trade from the Kalshi API and volume is lifetime from the Polymarket Gamma API, both fetched 2026-11-27. Grade A.

## New Jersey Status
- Kalshi: Third Circuit ruled 2-1 for Kalshi on 2026-04-06; New Jersey cert petition No. 26-299 pending, Kalshi response due 2026-12-07.
- Polymarket US: DeFi Rate lists it as available in NJ; the Third Circuit ruling names Kalshi only, so state enforcement risk remains. Polymarket international blocks US users.
- Robinhood: offered through Robinhood Derivatives, LLC; Robinhood bars IRAs.
Source: [ACCESS-MATRIX](../../../10-markets-law/ACCESS-MATRIX.md). Grade B.

## Sources
- [Kalshi events API, series KXPRESPARTY](https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXPRESPARTY&status=open), fetched 2026-11-27.
- [Kalshi open events](https://api.elections.kalshi.com/trade-api/v2/events?status=open&limit=200), fetched 2026-11-27.
- [Polymarket Gamma events, tag politics](https://gamma-api.polymarket.com/events?active=true&closed=false&tag_slug=politics&order=volume&ascending=false), fetched 2026-11-27.
- [Robinhood prediction markets](https://robinhood.com/us/en/prediction-markets/), fetched 2026-11-27.
