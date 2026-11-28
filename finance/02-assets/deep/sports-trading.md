# Sports Trading Deep Dive

Card: [Sports Trading](../sports-trading.md), ID `A-sports`. As of 2026-11-27. Grades: A primary, B secondary, C single source pending check. Every source below was fetched 2026-11-27.

## Vig Math
American odds to implied probability: \( q = \tfrac{100}{A+100} \) for \( A>0 \), \( q = \tfrac{|A|}{|A|+100} \) for \( A<0 \).
- Standard spread at -110 on both sides: \( q = 110/210 = 0.5238 \) each; overround \( \sum q = 1.0476 \). The book's hold on balanced action is \( 1 - 1/\sum q = 4.55\% \). [empirical: definition, 2026-11-27, python3 -c "s=2*110/210;print(s,1-1/s)"]
- Breakeven win rate at -110 is 52.38%.

## No-Vig Probability
Proportional method: \( \hat\pi_i = q_i / \sum_j q_j \).
- Favorite -150, underdog +130: \( q = 0.6000 \) and \( 0.4348 \), sum 1.0348; no-vig favorite probability \( 0.6/1.0348 = 0.5798 \). [empirical: definition, 2026-11-27, python3 -c "a=150/250;b=100/230;print(a/(a+b))"]
- The proportional method spreads margin evenly. Books load more margin on longshots, so for lopsided prices the method overstates the underdog; power and Shin methods correct for this. No source on those methods was fetched in this pass.

## Closing Line Value
CLV is the percent improvement of your decimal odds over the closing decimal odds, \( \mathrm{CLV} = d_{\text{bet}}/d_{\text{close}} - 1 \).
- Karl Whelan, "The Truth about Closing Line Value," 12 Aug 2026: 3,670 NBA games from 2022-23 to 2024-25, about ten books per bet, quotes at 24, 18, 12, 6 and 1 hours and 10 minutes before tip. Bets sorted into CLV deciles. About half had positive CLV. Three of five positive deciles lost money on average; the ninth decile averaged 5% CLV and 0.2% profit; only the top decile earned, at 11.4%. NBA moneyline margin is about 4.5%. Grade B, an economist's blog with method stated and detail in his book Fine Margins. [Whelan](https://www.karlwhelan.com/?p=2595).
- Reading: CLV must beat the margin before it shows up as profit. A bettor with 3% average CLV into a 4.5% hold still loses.
- Moskowitz, "Asset Pricing and Sports Betting," NBER: over 100,000 contracts across NBA, NFL, MLB and NHL show momentum and value moves from open to close at about one fifth the size of financial markets, too small to beat costs. Grade C: the NBER PDF did not extract; this comes from a summary. [NBER paper](https://conference.nber.org/conf_papers/f92072/f92072.pdf), [Alpha Architect summary](https://alphaarchitect.com/2015/09/value-momentum-sports-betting/).
- Bouchard, Harvard senior thesis 2019, MLB: larger relative line moves were less accurate, a sign of overreaction. Grade C, summary only. [Harvard DASH](https://dash.harvard.edu/bitstream/handle/1/37364609/BOUCHARD-SENIORTHESIS-2019.pdf?sequence=1).

## Data Sources
| Source | Holds |
|---|---|
| [Whelan blog](https://www.karlwhelan.com/?p=2595) | CLV and margin studies |
| [Kalshi](https://api.elections.kalshi.com/trade-api/v2/markets) and [Polymarket](https://gamma-api.polymarket.com/markets) APIs | exchange sports prices with explicit fees |

Pinnacle's CLV article fetched at HTTP 200 with no readable text; it renders in the browser only.
