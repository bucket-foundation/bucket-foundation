# Temporal Relational Ranking for Stock Prediction <!-- voice-ignore-line -->

Topic: Machine Learning in Finance  
Also tagged: Machine Learning in Finance  
OpenAlex: https://openalex.org/W2893230400  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Fuli Feng, Xiangnan He, Xiang Wang, Cheng Luo, Yiqun Liu, Tat-Seng Chua | <!-- voice-ignore-line -->
| Year | 2019 |
| Venue | ACM Transactions on Information Systems | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1145/3309547 |
| Cited by | 721 as of 2026-11-27 |
| Cited by inside this set | 3 |

## Method

Deep learning model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Extensive experiments demonstrate the superiority of our RSR method.
<!-- voice-ignore-next 1 -->
> It outperforms state-of-the-art stock prediction solutions achieving an average return ratio of 98% and 71% on NYSE and NASDAQ, respectively.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Stock prediction aims to predict the future trends of a stock in order to help investors make good investment decisions. Traditional solutions for stock prediction are based on time-series models. With the recent success of deep neural networks in modeling sequential data, deep learning has become a promising choice for stock prediction. However, most existing deep learning solutions are not optimized toward the target of investment, i.e., selecting the best stock with the highest expected revenue. Specifically, they typically formulate stock prediction as a classification (to predict stock trends) or a regression problem (to predict stock prices). More importantly, they largely treat the stocks as independent of each other. The valuable signal in the rich relations between stocks (or companies), such as two stocks are in the same sector and two companies have a supplier-customer relation, is not considered. In this work, we contribute a new deep learning solution, named Relational Stock Ranking (RSR), for stock prediction. Our RSR method advances existing solutions in two major aspects: (1) tailoring the deep learning models for stock ranking, and (2) capturing the stock relations in a time-sensitive manner. The key novelty of our work is the proposal of a new component in neural network modeling, named Temporal Graph Convolution, which jointly models the temporal evolution and relation network of stocks. To validate our method, we perform back-testing on the historical data of two stock markets, NYSE and NASDAQ. Extensive experiments demonstrate the superiority of our RSR method. It outperforms state-of-the-art stock prediction solutions achieving an average return ratio of 98% and 71% on NYSE and NASDAQ, respectively.
