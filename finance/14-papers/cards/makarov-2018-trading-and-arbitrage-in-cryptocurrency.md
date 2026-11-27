# Trading and Arbitrage in Cryptocurrency Markets <!-- voice-ignore-line -->

Topic: Cryptocurrency  
Also tagged: Cryptocurrency  
OpenAlex: https://openalex.org/W2809373714  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Igor Makarov, Antoinette Schoar | <!-- voice-ignore-line -->
| Year | 2018 |
| Venue | Journal of Financial Economics | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1016/j.jfineco.2019.07.001 |
| Cited by | 1155 as of 2026-11-27 |
| Cited by inside this set | 3 |

## Method

Empirical analysis of returns. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The idiosyncratic components help explain arbitrage spreads between exchanges.

## Replication

Cited as a source by strategy cards: [cy-cross-exchange-arb](../../09-strategies/cards/cy-cross-exchange-arb.md). Each card grades decay after publication and retail feasibility.

## Abstract

Taken from the open-access full text; OpenAlex holds none.

<!-- voice-ignore-next 1 -->
> Cryptocurrency markets exhibit periods of large, recurrent arbitrage opportunities across exchanges. These price deviations are much larger across than within countries, and smaller between cryptocurrencies, highlighting the importance of capital controls for the movement of arbitrage capital. Price deviations across countries co-move and open up in times of large bitcoin appreciation. Countries with higher bitcoin premia over the US bitcoin price see widening arbitrage deviations when bitcoin appreciates. Finally, we decompose signed volume on each exchange into a common and an idiosyncratic component. The common component explains 80% of bitcoin returns. The idiosyncratic components help explain arbitrage spreads between exchanges.

## Full Text

Open-access copy: https://researchonline.lse.ac.uk/id/eprint/100409/1/Cryptocurrency_Markets_JFE_final_v4.pdf

## Deep Read

Source: open-access author accepted manuscript in LSE Research Online, CC BY-NC-ND 4.0, of the article in the Journal of Financial Economics 135(2), 2020. Read 2026-11-27.

### Research Question

How large and persistent are price gaps for bitcoin across exchanges and countries, what limits the arbitrage capital that should close them, and what drives bitcoin prices?

### Data and Sample

Tick data from 34 exchanges in 19 countries, January 2017 to February 2018, including Bitstamp, Coinbase, Gemini and Kraken in the US, bitFlyer, Zaif and Quoine in Japan, and the main Korean and European venues. Prices are converted to dollars with spot exchange rates. Bitcoin, ethereum and ripple are covered.

### Method

Daily and intraday price ratios between exchanges within and across countries. A lower bound on arbitrage profits from the gap times the volume that could have crossed it. Comparisons of fiat-to-crypto gaps with crypto-to-crypto gaps on the same exchanges. Regressions of cross-country premia on bitcoin returns. Signed order flow on each exchange is decomposed into a common factor and an idiosyncratic part, and returns are regressed on both.

### Main Results

From December 2017 to early February 2018, the daily average price ratio between Korea and the US exceeded 15 percent and reached 40 percent on some days, the "Kimchi premium." The Japan-US gap averaged about 10 percent and the Europe-US gap about 3 percent. Within one country, gaps rarely exceed 1 percent on average.

Potential arbitrage profit exceeded $75 million on many days; from December 2017 to February 2018 the authors estimate at least $2 billion in total.

Gaps are one-sided: outside the US and Europe bitcoin trades at a premium to the US price and almost never below it. Premia across countries co-move and widen when bitcoin rises.

When the US-Korea bitcoin gap exceeded 20 percent, the ethereum-to-bitcoin rate differed by about 3 percent on average, an order of magnitude less. The gaps sit in fiat conversion, pointing to capital controls and banking frictions.

The common component of signed volume explains 80 percent of bitcoin returns.

### Robustness

Results hold for ethereum and ripple, at hourly and daily frequency, and with the extended set of all 34 exchanges.

### Stated Limits

Profit figures are upper-bound style estimates before transaction costs, settlement delays, exchange risk and capital controls; the authors stress that those frictions are why the gaps persist. Some exchange volume data may be inflated, and Tether's transparency was in question from December 2017.

### Retail Systematic Trader

Cross-country crypto gaps are large but mostly out of reach: most retail traders cannot open accounts abroad or move fiat across borders fast enough, which is the friction that keeps the gaps open. Within-country gaps are small and closed by professional desks. Crypto-to-crypto rates stay aligned, so triangular arbitrage on one exchange offers little. A premium widening in Korea or Japan marks local retail froth and has coincided with bitcoin price peaks; a trader can treat it as a sentiment gauge. The lab's cross-exchange arbitrage cards cover the venues in question.
