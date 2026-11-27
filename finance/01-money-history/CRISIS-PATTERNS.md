# Crisis Patterns

As of 2026-11-27. Synthesis of 32 event cards in `crises/` and 9 century cards in `centuries/`. Lab figures computed from `finance/lab/data/raw/` on 2026-11-27: Shiller monthly 1871 to Sep 2024, FRED, Yahoo daily, and the Jordà-Schularick-Taylor Macrohistory database R6 (18 countries, 1870 to 2020, 88 systemic crises). Scripts: `lab/crisis_stats.py`, `lab/crisis_jst.py`.

## Signal 1: Credit Grows Faster Than Output
Every card from Mesopotamia to 2008 starts with debt rising faster than the income that services it: grain loans against harvests, Medici loans to princes, railroad bonds in 1873, margin loans in 1929, land loans in Japan, subprime in 2007.

JST test: in the year a crisis starts, the median 5-year rise in bank credit to GDP is 8.7 points, against 3.5 points across all country-years. Real house prices rose a median 15.8% over the 5 years before a crisis, against 7.4% in all years. When 5-year credit growth sits in a country's top fifth, the chance of a crisis within two years is 10.9%, against 5.1% otherwise. The signal doubles the base rate and still misses most years; it sets exposure size and leaves timing to other signals.

## Signal 2: Short Funding Against Long or Illiquid Assets
1907 trusts funded stocks with overnight call money. 2008 dealers funded mortgage bonds in repo. SVB funded long Treasuries with uninsured deposits that left at $40 billion a day. FTX and Terra promised instant redemption against illiquid or circular assets. The run comes when the funder doubts the asset, and its speed has risen with technology: weeks in 1907, one day in 2023.

Screen: uninsured or overnight funding as a share of liabilities, against unrealized losses or haircuts on assets.

## Signal 3: The Price of Liquidity Spikes First
Call money went from 9.5% to 100% in October 1907. Treasury collateral reuse fell from 7.5 to 5.5 in March 2020 while 10-year yields rose from 0.54% to 1.18% during an equity crash. Crypto funding rates hit nearly 30% before the October 2025 liquidations. Funding prices lead the asset price.

## Signal 4: Policy Tightening Into a Boom
The NY Fed discount rate was 6% in August 1929. The Bank of Japan raised five times from May 1989 to August 1990. Fed funds rose to 6.5% in 2000, 5.25% in 2006 and from 0.2% to 4.65% between March 2022 and March 2023, ahead of the 2022 crypto failures and SVB.

The 10-year minus 3-month Treasury spread inverted in Jun 1973, Dec 1978, Nov 1980, Aug 2000, Aug 2006, Jun 2019 and Nov 2022. Lead time to the equity peak ran from minus several months (1973) to 14 months (2006 to Oct 2007). The November 2022 inversion lasted into 2025 and the S&P 500 rose through it, so inversion is a regime marker and a poor timer.

## Signal 5: Valuation Sets the Size of the Fall
Shiller CAPE at the peak: 32.6 in 1929 (fall of 81% real), 42.9 in 2000 (47% real, 83% for QQQ), 27.3 in 2007 (52% real), 18.7 in 1973 (54% real with inflation), 8.5 in 1980. The 1871 to 2024 median is 16.5. High CAPE predicts poor long returns and gives no date; 1999 to 2000 stayed above 40 for over a year.

## Signal 6: Pegs Break All at Once
Bretton Woods (gold cover), the ERM (rates a recession could not bear), Thailand 1997 (short dollar debt), Russia 1998, the yuan in 2015, and stablecoins in 2022 and 2023 (UST to near zero, USDC to $0.87). Defenders spend reserves and raise rates; when that fails to move the price, the peg goes within hours. Payoff to the short is asymmetric.

## Signal 7: Correlations Go to One
LTCM's spreads "in almost every case, they diverged" in 1998. In March 2020 SPY, TLT, GLD and BTC all fell together; only cash hedged. In April 2025 and through 2022, stocks and Treasuries fell together. Diversification across assets that share a funding source fails in the crisis.

## Signal 8: The Money Itself Loses Value
Rome cut silver from 94% to 5%. Song notes traded at 30% to 40% of face. Law's notes inflated 23% a month. After 1971 US CPI reached 14.6% inflation. When the state finances war or deficits through the money, real assets beat nominal claims.

## What Stops a Crisis
A lender of last resort that commits without limit: Hamilton in 1792, Morgan in 1907, the Fed on 20 Oct 1987, Draghi on 26 Jul 2012, the Fed on 15 and 23 Mar 2020. Where the backstop was small or reversed, as in 1931 to 1932, the fall continued. Price bottoms in the lab data cluster within days of these commitments.

## Systematic Rules Supported by the Cards
| Rule | Evidence | Weak spot |
|---|---|---|
| Cut exposure when price is below its 10-month average | Out of most of 1929 to 1932, 2000 to 2002, 2008 | Whipsaw in V-shaped crashes: 1987, 2020, 2025 |
| Scale risk down when credit to GDP rises fast | JST: crisis odds double in the top fifth | Fires years early |
| Watch funding prices daily: call money, repo, FX basis, perp funding | 1907, 2020, Oct 2025 | Data access for private markets |
| Hold cash as the crisis hedge | Mar 2020, 2022 | Loses to inflation in the 1970s and after 1971 |
| Buy after an unlimited backstop | 1987, 2012, 2020 | 1930 to 1931 had partial backstops that failed |

## Lab Data Gaps
- No Nikkei, GBP, GME or high-yield spread history before 2023 in `lab/data`. FRED BAMLH0A0HYM2 starts 2023-11-27.
- Shiller ends Sep 2024; SPY carries 2024 to 2026.
- Pre-1870 events have no series. Bank of England Millennium data would cover 1694 onward.

## Card Index
Centuries: [ancient](centuries/C-ancient.md), [medieval](centuries/C-medieval.md), [15th](centuries/C-15.md), [16th](centuries/C-16.md), [17th](centuries/C-17.md), [18th](centuries/C-18.md), [19th](centuries/C-19.md), [20th](centuries/C-20.md), [21st](centuries/C-21.md).

Events: [Mesopotamia](crises/X-mesopotamia.md), [Rome](crises/X-rome.md), [Song paper](crises/X-song-paper.md), [Medici](crises/X-medici.md), [tulips](crises/X-tulip.md), [Bank of England](crises/X-boe-1694.md), [Mississippi](crises/X-mississippi.md), [South Sea](crises/X-south-sea.md), [1792](crises/X-1792.md), [1837](crises/X-1837.md), [1873](crises/X-1873.md), [1907](crises/X-1907.md), [1929](crises/X-1929.md), [Bretton Woods](crises/X-bretton-woods.md), [1971](crises/X-1971.md), [1973 oil](crises/X-1973-oil.md), [Volcker](crises/X-volcker.md), [1987](crises/X-1987.md), [Japan](crises/X-japan-1990.md), [ERM](crises/X-erm-1992.md), [Asia](crises/X-asia-1997.md), [LTCM](crises/X-1998-ltcm.md), [dot-com](crises/X-2000-dotcom.md), [2008](crises/X-2008-gfc.md), [eurozone](crises/X-2010-euro.md), [China 2015](crises/X-2015-china.md), [COVID](crises/X-2020-covid.md), [meme stocks](crises/X-2021-meme.md), [Terra and FTX](crises/X-2022-crypto.md), [SVB](crises/X-2023-svb.md), [2025](crises/X-2025.md), [2026](crises/X-2026.md).
