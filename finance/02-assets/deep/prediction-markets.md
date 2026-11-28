# Prediction Markets Deep Dive

Card: [Prediction Markets](../prediction-markets.md), ID `A-predict`. As of 2026-11-27. Grades: A primary, B secondary, C single source pending check. Every source below was fetched 2026-11-27.

## Fee Schedules
- Polymarket taker fee: \( \text{fee} = C \times \text{feeRate} \times p(1-p) \) for \( C \) shares at price \( p \). Makers pay nothing; fees fund a daily maker rebate. Taker rates by category: 0.05 for sports, finance, tech, election politics and BTC 5- and 15-minute markets; 0.01 for other crypto, non-election politics, economics and culture; geopolitics is fee-free. No deposit or withdrawal fee from Polymarket. Grade A. [Polymarket docs, Fees](https://docs.polymarket.com/polymarket-learn/trading/fees).
- Kalshi general trading fee: \( \text{fee} = \lceil 0.07 \times C \times P(1-P) \rceil \) rounded up to the next cent, with \( P \) in dollars. Some series carry other multipliers or maker fees. Grade B: kalshi.com returned HTTP 429 to both curl and WebFetch, so the formula comes from secondary write-ups quoting the PDF. [Kalshi fee schedule](https://kalshi.com/docs/kalshi-fee-schedule.pdf), [Allium, 3 Sep 2026](https://allium.so/blog/kalshi-fees-why-the-cost-peaks-near-50-cents/).

## Fee Math
- \( p(1-p) \) peaks at \( p = 0.5 \). For 100 contracts at 50 cents: Kalshi \( 0.07 \times 100 \times 0.25 = \$1.75 \); Polymarket sports \( 0.05 \times 100 \times 0.25 = \$1.25 \); Polymarket economics \( \$0.25 \). [empirical: Polymarket docs and Allium, 2026-11-27, arithmetic]
- As a share of stake \( Cp \), the fee is \( \text{rate}\times(1-p) \): 3.5% at 50 cents on Kalshi, 0.7% at 90 cents. Cheap longshots pay the largest fee share of stake.

## Liquidity
- Polymarket top five open markets by 24-hour volume on 27 Nov 2026: an esports match at $2.11M with $116,500 book liquidity; a BTC price-band market at $2.05M with $27,411; a Fed December 25 bp cut market at $1.37M with $1.96M liquidity and a 0.1 cent spread. Grade A. [empirical: Polymarket Gamma API, 2026-11-27, curl 'https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=10']
- Kalshi sample of 200 open events: the top market by 24-hour volume traded 17,975 contracts with a 67 to 71 cent quote, a 4-cent spread; a Speaker market with 515,710 open interest quoted 99.2 to 99.4. Grade A for the sample; it is a 200-event slice and misses the busiest sports books. [empirical: Kalshi trade API, 2026-11-27, curl 'https://api.elections.kalshi.com/trade-api/v2/events?status=open&limit=200&with_nested_markets=true']

## Resolution Risk
- Zelensky suit market, 2025: about $237M traded on whether Zelensky would wear a suit before July. UMA's oracle first found his NATO outfit qualified; a token-holder challenge reversed it and the market resolved No despite wide coverage of the outfit. A May 2025 market had resolved No on a similar outfit. Grade B. [Decrypt](https://decrypt.co/329210/polymarket-rules-no-237m-bet-zelenskyy-suit?amp=1), [CryptoSlate](https://cryptoslate.com/polymarket-faces-backlash-over-disputed-200m-zelensky-suit-market/).
- UMA's CEO said 26 of the last 30 disputed markets resolved with 95% or more of token votes on the winning side. Grade C, as reported. [The Defiant](https://thedefiant.io/news/nfts-and-web3/polymarket-controversy-heats-up-after-the-zelenskyy-suit-market-resolves).
- A single holder reportedly used about 5 million UMA to force a Yes on a mineral-deal market for an agreement that did not exist. Grade C. [The Defiant](https://thedefiant.io/newsletter/defi-daily/zelenskyys-fashion-tests-polymarket-).
- Rule: price resolution risk as a second probability. A contract at \( p \) with resolution error probability \( q \) against you has expected value \( (1-q)\,\pi - p \) for true probability \( \pi \).
- Legal risk on Kalshi and other CFTC venues: state and federal courts split on preemption; see [2026-STATE.md](../2026-STATE.md).

## Data Sources
| Source | Holds |
|---|---|
| [Polymarket Gamma API](https://gamma-api.polymarket.com/markets) | markets, volume, liquidity |
| [Kalshi trade API](https://api.elections.kalshi.com/trade-api/v2/markets) | markets, quotes, open interest |
