# Efficient Market Making via Convex Optimization, and a Connection to Online Learning <!-- voice-ignore-line -->

Topic: Prediction Markets  
Also tagged: Prediction Markets  
OpenAlex: https://openalex.org/W2013960211  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Jacob Abernethy, Yiling Chen, Jennifer Wortman Vaughan | <!-- voice-ignore-line -->
| Year | 2013 |
| Venue | ACM Transactions on Economics and Computation | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1145/2465769.2465777 |
| Cited by | 109 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Machine learning model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We demonstrate the advantages of this framework with the design of some particular markets.
<!-- voice-ignore-next 1 -->
> We also show that by relaxing the convex hull we can gain computational tractability without compromising the market institution’s bounded budget.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We propose a general framework for the design of securities markets over combinatorial or infinite state or outcome spaces. The framework enables the design of computationally efficient markets tailored to an arbitrary, yet relatively small, space of securities with bounded payoff. We prove that any market satisfying a set of intuitive conditions must price securities via a convex cost function, which is constructed via conjugate duality. Rather than deal with an exponentially large or infinite outcome space directly, our framework only requires optimization over a convex hull. By reducing the problem of automated market making to convex optimization, where many efficient algorithms exist, we arrive at a range of new polynomial-time pricing mechanisms for various problems. We demonstrate the advantages of this framework with the design of some particular markets. We also show that by relaxing the convex hull we can gain computational tractability without compromising the market institution’s bounded budget. Although our framework was designed with the goal of deriving efficient automated market makers for markets with very large outcome spaces, this framework also provides new insights into the relationship between market design and machine learning, and into the complete market setting. Using our framework, we illustrate the mathematical parallels between cost-function-based markets and online learning and establish a correspondence between cost-function-based markets and market scoring rules for complete markets.
