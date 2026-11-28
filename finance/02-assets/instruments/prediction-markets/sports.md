# Sports

ID `I-pm-sports`. As of 2026-11-27.

Parent: [Prediction Markets](../../prediction-markets.md).

## Venues
- Kalshi: category "Sports" in the open events API. Grade A.
- Polymarket: tag "sports" in the Gamma events API, which serves the international venue. Polymarket US listings not fetched. Grade A for international, C for US.
- Robinhood: Sports, with football, basketball, hockey, college, tennis, cricket, golf, soccer, esports and more on the prediction markets page. Grade A.

## Contract Structure
Binary Yes and No contracts priced from $0.01 to $0.99 that pay $1 on Yes. Game-winner binaries per team, plus season futures and player stat ladders. Grade A.

## Example Live Markets
- Kalshi KXNFLGAME-26NOV29ATLMIN, Atlanta vs Minnesota on 29 Nov 2026: Minnesota Yes last $0.76, Atlanta $0.26.
- Polymarket uefa-champions-league-2027-champion: $81,696,112 volume; pro-football-2027-champion: $75,538,824 volume.
Prices are last trade from the Kalshi API and volume is lifetime from the Polymarket Gamma API, both fetched 2026-11-27. Grade A.

## New Jersey Status
- Kalshi: Third Circuit ruled 2-1 for Kalshi on 2026-04-06; New Jersey cert petition No. 26-299 pending, Kalshi response due 2026-12-07.
- Polymarket US: DeFi Rate lists it as available in NJ; the Third Circuit ruling names Kalshi only, so state enforcement risk remains. Polymarket international blocks US users.
- Robinhood: offered through Robinhood Derivatives, LLC; Robinhood bars IRAs. Robinhood pulled NJ sports contracts, per DeFi Rate on 2026-11-13.
Source: [ACCESS-MATRIX](../../../10-markets-law/ACCESS-MATRIX.md). Grade B.

## Sources
- [Kalshi events API, series KXNFLGAME](https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXNFLGAME&status=open), fetched 2026-11-27.
- [Kalshi open events](https://api.elections.kalshi.com/trade-api/v2/events?status=open&limit=200), fetched 2026-11-27.
- [Polymarket Gamma events, tag sports](https://gamma-api.polymarket.com/events?active=true&closed=false&tag_slug=sports&order=volume&ascending=false), fetched 2026-11-27.
- [Robinhood prediction markets](https://robinhood.com/us/en/prediction-markets/), fetched 2026-11-27.
