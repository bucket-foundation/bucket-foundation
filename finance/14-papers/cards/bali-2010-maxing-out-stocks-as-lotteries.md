# Maxing out: Stocks as lotteries and the cross-section of expected returns <!-- voice-ignore-line -->

Topic: Portfolio Theory  
Also tagged: Asset Pricing, Portfolio Theory  
OpenAlex: https://openalex.org/W3122225907  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Turan G. Bali, Nusret Cakici, Robert Whitelaw | <!-- voice-ignore-line -->
| Year | 2010 |
| Venue | Journal of Financial Economics | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1016/j.jfineco.2010.08.014 |
| Cited by | 1867 as of 2026-11-27 |
| Cited by inside this set | 6 |

## Method

Cross-sectional regressions on asset returns. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Motivated by existing evidence of a preference among investors for assets with lottery-like payoffs and that many investors are poorly diversified, we investigate the significance of extreme positive returns in the cross-sectional pricing of stocks.
<!-- voice-ignore-next 1 -->
> Portfolio-level analyses and firm-level cross-sectional regressions indicate a negative and significant relation between the maximum daily return over the past one month (MAX) and expected stock returns.

## Replication

Cited as a source by strategy cards: [eq-max-lottery](../../09-strategies/cards/eq-max-lottery.md). Each card grades decay after publication and retail feasibility.

## Abstract

Taken from the open-access full text; OpenAlex holds none.

<!-- voice-ignore-next 1 -->
> Motivated by existing evidence of a preference among investors for assets with lottery-like payoffs and that many investors are poorly diversified, we investigate the significance of extreme positive returns in the cross-sectional pricing of stocks. Portfolio-level analyses and firm-level cross-sectional regressions indicate a negative and significant relation between the maximum daily return over the past one month (MAX) and expected stock returns. Average raw and risk-adjusted return differences between stocks in the lowest and highest MAX deciles exceed 1% per month. These results are robust to controls for size, book-to-market, momentum, short-term reversals, liquidity, and skewness. Of particular interest, including MAX reverses the puzzling negative relation between returns and idiosyncratic volatility recently documented in Ang et al. (2006, 2008).

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w14804/w14804.pdf

## Deep Read

Source: open-access NBER Working Paper 14804, the version published in the Journal of Financial Economics 99(2), 2011. Read 2026-11-27.

### Research Question

Do stocks with extreme positive daily returns in the past month, lottery-like stocks, earn lower future returns, and does this explain the idiosyncratic volatility puzzle?

### Data and Sample

CRSP daily and monthly returns for NYSE, AMEX and NASDAQ common stocks, July 1962 to December 2005. Fama-French and momentum factors from Kenneth French's library.

### Method

MAX is a stock's largest daily return in the previous month; MAX(N) averages the N largest. Each month stocks are sorted into deciles on MAX and held one month, value- and equal-weighted, with raw returns and four-factor alphas and Newey-West t-statistics (Table I). Bivariate sorts control for size, book to market, momentum, short-term reversal, illiquidity and skewness. Firm-level Fama-MacBeth regressions of next-month returns on MAX and controls. Tables test whether MAX persists and whether adding MAX changes the sign on idiosyncratic volatility (Table XII).

### Main Results

Table I, value-weighted: the high-minus-low MAX decile return is minus 1.03 percent a month (t = minus 2.83); the four-factor alpha difference is minus 1.18 percent (t = minus 4.71). Deciles 1 to 7 earn 1.00 to 1.16 percent a month; deciles 8, 9 and 10 earn 0.86, 0.52 and minus 0.02 percent. Those top deciles have average maximum daily returns of 9, 12 and 24 percent.

Equal-weighted: the difference is minus 0.65 percent (t = minus 1.83) and the alpha difference minus 0.66 percent (t = minus 2.31); excluding stocks under $5 enlarges these to minus 0.71 and minus 0.81 percent.

Averages of the top five daily returns give a spread of about minus 1.22 percent a month.

Bivariate sorts and Fama-MacBeth regressions: MAX stays negative and significant after controls for size, book to market, momentum, reversal, illiquidity and skewness.

Table XII: with MAX in the regression, the relation between idiosyncratic volatility and future returns turns positive and significant (t = 4.69), reversing the Ang et al. (2006) puzzle.

### Robustness

Value and equal weights, the $5 price filter, alternative MAX(N) definitions, subperiods and controls; MAX is persistent month to month.

### Stated Limits

The authors offer a preference for lottery-like payoffs among underdiversified investors as the explanation and acknowledge it is not proven. Microstructure effects in low-priced stocks could affect equal-weighted results, which they test with the price filter.

### Retail Systematic Trader

Avoiding stocks that just had a 10 percent-plus up day is cheap and long-only: the top MAX decile earned about zero over 1962 to 2005. Shorting them faces high borrow costs and squeeze risk, since these names attract lottery demand. A retail screen that excludes the top MAX decile from long books, alongside a low idiosyncratic volatility filter, captures most of the effect. Later replications report a smaller effect after publication.
