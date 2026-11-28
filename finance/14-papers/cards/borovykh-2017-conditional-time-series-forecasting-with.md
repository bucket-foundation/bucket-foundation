# Conditional Time Series Forecasting with Convolutional Neural Networks <!-- voice-ignore-line -->

Topic: Machine Learning in Finance  
Also tagged: Machine Learning in Finance  
OpenAlex: https://openalex.org/W2603648311  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Anastasia Borovykh, Sander M. Bohté, Cornelis W. Oosterlee | <!-- voice-ignore-line -->
| Year | 2017 |
| Venue | arXiv | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.48550/arxiv.1703.04691 |
| Cited by | 898 as of 2026-11-27 |
| Cited by inside this set | 1 |

## Method

Neural network model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We show that a convolutional network is well-suited for regression-type problems and is able to effectively learn dependencies in and between the series without the need for long historical time series, is a time-efficient and easy to implement alternative to recurrent-type networks and tends to outperform linear and recurrent models.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We present a method for conditional time series forecasting based on an adaptation of the recent deep convolutional WaveNet architecture. The proposed network contains stacks of dilated convolutions that allow it to access a broad range of history when forecasting, a ReLU activation function and conditioning is performed by applying multiple convolutional filters in parallel to separate time series which allows for the fast processing of data and the exploitation of the correlation structure between the multivariate time series. We test and analyze the performance of the convolutional network both unconditionally as well as conditionally for financial time series forecasting using the S&P500, the volatility index, the CBOE interest rate and several exchange rates and extensively compare it to the performance of the well-known autoregressive model and a long-short term memory network. We show that a convolutional network is well-suited for regression-type problems and is able to effectively learn dependencies in and between the series without the need for long historical time series, is a time-efficient and easy to implement alternative to recurrent-type networks and tends to outperform linear and recurrent models.
