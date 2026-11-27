# Trading with the Momentum Transformer: An Intelligent and Interpretable Architecture

ID: `eq-ax-trading-with-the-momentum-transformer-an-intellige`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Unlike state-of-the-art Long Short-Term Memory (LSTM) architectures, which are sequential in nature and tailored to local processing, an attention mechanism provides our architecture with a direct connection to all previous time-steps. The Momentum Transformer is inherently interpretable, providing us with greater insights into our deep-learning momentum trading strategy, including the importance of different factors over time and the past time-steps which are of the greatest significance to the model.

## Source

1. Trading with the Momentum Transformer: An Intelligent and Interpretable Architecture. Kieran Wood and co-authors, 2021, arXiv 2112.08534. https://arxiv.org/abs/2112.08534 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: We introduce the Momentum Transformer, an attention-based deep-learning architecture, which outperforms benchmark time-series momentum and mean-reversion trading strategies. Our architecture, an attention-LSTM hybrid, enables us to learn longer-term dependencies, improves performance when considering returns net of transaction costs and naturally adapts to new market regimes, such as during the SARS-CoV-2 crisis.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
