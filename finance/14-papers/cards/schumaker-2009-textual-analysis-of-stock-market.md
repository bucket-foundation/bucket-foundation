# Textual analysis of stock market prediction using breaking financial news: The AZFin text system <!-- voice-ignore-line -->

Topic: Machine Learning in Finance  
Also tagged: Machine Learning in Finance  
OpenAlex: https://openalex.org/W2015174807  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Robert P. Schumaker, Hsinchun Chen | <!-- voice-ignore-line -->
| Year | 2009 |
| Venue | ACM Transactions on Information Systems | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1145/1462198.1462204 |
| Cited by | 1022 as of 2026-11-27 |
| Cited by inside this set | 3 |

## Method

Machine learning model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Using a support vector machine (SVM) derivative specially tailored for discrete numeric prediction and models containing different stock-specific variables, we show that the model containing both article terms and stock price at the time of article release had the best performance in closeness to the actual future stock price (MSE 0.04261), the same direction of price movement as the future price (57.1% directional accuracy) and the highest return using a simulated trading engine (2.06% return).

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Our research examines a predictive machine learning approach for financial news articles analysis using several different textual representations: bag of words, noun phrases, and named entities. Through this approach, we investigated 9,211 financial news articles and 10,259,042 stock quotes covering the S&P 500 stocks during a five week period. We applied our analysis to estimate a discrete stock price twenty minutes after a news article was released. Using a support vector machine (SVM) derivative specially tailored for discrete numeric prediction and models containing different stock-specific variables, we show that the model containing both article terms and stock price at the time of article release had the best performance in closeness to the actual future stock price (MSE 0.04261), the same direction of price movement as the future price (57.1% directional accuracy) and the highest return using a simulated trading engine (2.06% return). We further investigated the different textual representations and found that a Proper Noun scheme performs better than the de facto standard of Bag of Words in all three metrics.
