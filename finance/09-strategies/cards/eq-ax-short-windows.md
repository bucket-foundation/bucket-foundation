# Short Windows

ID: `eq-ax-short-windows`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Of the 75 papers with a trading test, 51% deduct no trading costs and only 9% model costs from data; the median test window is 12 months, and a quarter of windows are six months or shorter. Two of the five hypotheses pass (short windows; uncontrolled look-ahead).

## Source

1. Short Windows, Unmodelled Costs, Unknown Cutoffs: A Pre-Registered Evidence Audit of 91 LLM Trading Papers. Henry Zhang, 2026, arXiv 2611.18934. https://arxiv.org/abs/2611.18934 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Papers on large-language-model (LLM) trading agents and alpha mining report Sharpe ratios that would be remarkable in any other part of empirical finance. Three fail: more papers report a trial count than we predicted, though most of those counts are repeated random seeds rather than the number of strategies searched; and the predicted links between headline Sharpe and test-window length, and between headline Sharpe and costs, are not detectable in the 13 papers that state a headline Sharpe in their abstract or conclusion.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
