## Deep Read

Source: open-access NBER Working Paper 8462, the version published in the Journal of Political Economy 111(3), 2003. The cover page uses a broken font; the body extracts cleanly. Read 2026-11-27.

### Research Question

Is market-wide liquidity a priced state variable, so that stocks whose returns are more sensitive to aggregate liquidity shocks earn higher expected returns?

### Data and Sample

CRSP daily returns and volume for NYSE and AMEX common stocks, with the aggregate liquidity series from August 1962 to December 1999 and portfolio tests from January 1966 to December 1999. Decile portfolios hold about 187 stocks each on average.

### Method

Each stock's monthly liquidity is gamma from equation (1): regress the stock's daily excess return over the market on its previous day's return and on the previous day's signed dollar volume (volume times the sign of the excess return). Less liquid stocks show larger volume-driven reversals, a more negative gamma. Aggregate liquidity averages the gammas, scaled for market size; innovations come from an AR(2) on the changes. A stock's liquidity beta is its loading on those innovations alongside the market, size and value factors. Each year, stocks are sorted into deciles on a predicted liquidity beta built from past betas and stock characteristics, held 12 months, and the value-weighted 10-1 spread is tested against the CAPM, Fama-French and Fama-French plus momentum models. Section 4 asks how much weight the liquidity spread gets in the ex-post tangency portfolio.

### Main Results

Aggregate liquidity shows sharp drops that coincide with market downturns and flights to quality, such as October 1987 and the 1998 LTCM crisis. Liquidity changes are positively correlated across size deciles, and the smallest stocks are the least liquid and the most sensitive to aggregate liquidity.

Table 3 and the introduction: from 1966 to 1999, the spread between the top and bottom deciles of predicted liquidity beta earns a four-factor alpha of 7.5 percent a year and a three-factor alpha above 9 percent a year, significant, with similar results in both 17-year halves. Post-ranking liquidity betas rise across deciles.

Section 4: liquidity-risk spreads take large weight in the maximum Sharpe ratio portfolio of the market, size, value and momentum spreads. An equally weighted liquidity-risk spread halves momentum's alpha over 1966 to 1999 and turns it slightly negative over 1983 to 1999.

### Robustness

Two subperiods, predicted and historical betas, value and equal weighting, controls for the level of liquidity as a characteristic, and alternative factor models.

### Stated Limits

The measure captures one dimension of liquidity, volume-related reversals; spreads, depth and turnover are left for future work, as are fixed income and international markets.

### Retail Systematic Trader

Stocks whose returns fall when market liquidity dries up pay a premium, and that premium explains part of momentum. A retail book is long liquidity risk if it holds small, illiquid or momentum names, and should expect those positions to lose together in liquidity crises like 1987, 1998 and 2008. The Pastor-Stambaugh traded liquidity factor is published on Pastor's site, so a trader can measure the book's loading and size it before a crunch. Reported alphas are before costs, and later replications report a smaller premium after 1999.
