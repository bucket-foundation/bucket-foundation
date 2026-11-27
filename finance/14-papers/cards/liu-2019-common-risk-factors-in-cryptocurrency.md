# Common Risk Factors in Cryptocurrency <!-- voice-ignore-line -->

Topic: Cryptocurrency  
Also tagged: Asset Pricing, Cryptocurrency  
OpenAlex: https://openalex.org/W3139542328  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Yukun Liu, Aleh Tsyvinski, Xi Wu | <!-- voice-ignore-line -->
| Year | 2019 |
| Venue | The Journal of Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/jofi.13119 |
| Cited by | 772 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Empirical analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We find that three factors – cryptocurrency market, size, and momentum – capture the crosssectional expected cryptocurrency returns.
<!-- voice-ignore-next 1 -->
> We show that all of these strategies are accounted for by the cryptocurrency three-factor model.

## Replication

Cited as a source by strategy cards: [cy-cross-section-factors](../../09-strategies/cards/cy-cross-section-factors.md), [cy-onchain-valuation](../../09-strategies/cards/cy-onchain-valuation.md), [cy-rebalancing](../../09-strategies/cards/cy-rebalancing.md), [cy-ts-momentum](../../09-strategies/cards/cy-ts-momentum.md). Each card grades decay after publication and retail feasibility.

## Abstract

Taken from the open-access full text; OpenAlex holds none.

<!-- voice-ignore-next 1 -->
> We find that three factors – cryptocurrency market, size, and momentum – capture the crosssectional expected cryptocurrency returns. We consider a comprehensive list of priceand market-related factors in the stock market, and construct their cryptocurrency counterparts. Nine cryptocurrency factors form successful long-short strategies that generate sizable and statistically significant excess returns. We show that all of these strategies are accounted for by the cryptocurrency three-factor model.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w25882/w25882.pdf

## Deep Read

Source: open-access NBER Working Paper 25882, May 2019, the version published in the Journal of Finance 77(2), 2022. Read 2026-11-27.

### Research Question

Do the price and market-based characteristics that predict stock returns also predict the cross-section of cryptocurrency returns, and can a small factor model price them?

### Data and Sample

1,707 coins with price, volume and market capitalization data from the start of 2014 to the end of 2018, weekly. Coins with market capitalization under $1 million are dropped and non-return variables winsorized at the 1st and 99th percentiles each week. The number of coins passing filters grows from 109 in 2014 to 1,583 in 2018. The coin market return is value-weighted over all coins.

### Method

From the equity factor lists of Feng et al. (2017) and Chen and Zimmermann (2018), the authors take the 25 that use only price and market data, in four groups: size, momentum, volume and volatility. Each week coins are sorted into quintiles and the quintile 5 minus quintile 1 return is measured the following week. Long-short returns are tested against a CAPM with the coin market return (CMKT), equity factor models, and a crypto three-factor model of CMKT, a size factor (CSMB) and a momentum factor (CMOM).

### Main Results

9 of 25 strategies earn significant returns: market capitalization, price, maximum price, one- to four-week momentum, dollar volume and the standard deviation of dollar volume.

Size: long the smallest and short the largest coins earns 3.4 percent a week on market capitalization, 3.9 percent on week-end price and 4.1 percent on the week's high price. Momentum strategies also earn several percent a week.

The crypto CAPM leaves most alphas large and significant, with R2 from about zero for one-week momentum to 6.8 percent for maximum price. Fama-French 3, Carhart 4 and Fama-French 5 factor models do not explain crypto returns.

The three-factor model of CMKT, CSMB and CMOM explains all nine strategies: no alpha stays significant. CSMB absorbs the size, price and volume strategies; CMOM absorbs the two- to four-week momentum strategies.

Momentum is stronger in larger coins: 4.2 percent a week above median size, significant, against an insignificant 0.6 percent below median.

### Robustness

Strategies that short bitcoin in place of the low quintile give almost the same results, addressing the difficulty of shorting small coins. Removing unpriced risk in the style of Daniel et al. (2018) strengthens the size factor.

### Stated Limits

The sample spans five years with one large boom and bust; shorting most coins is limited; returns are before trading costs and exchange risk.

### Retail Systematic Trader

Crypto momentum at one to four weeks, concentrated in larger coins, is the most usable result: it survives shorting bitcoin in place of small coins and sits where liquidity is best. The size premium lives in tiny coins with wide spreads, thin books and delisting risk, which a retail trader cannot capture at the reported scale. The lab's crypto cross-section cards build on this paper; returns of several percent a week from 2014 to 2018 should be expected to shrink.
