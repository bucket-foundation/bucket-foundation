# In-Play News Latency

ID: `sb-in-play`
Family: Sports Betting
Retail feasibility: **F**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade exchange prices in the seconds after goals or injuries.

## Source

1. Information and Efficiency: Goal Arrival in Soccer Betting. Croxson, James Reade, 2013, The Economic Journal. https://doi.org/10.1111/ecoj.12033 (Crossref DOI, fetched 2026-11-27)
2. In-play or in-running betting. UK Gambling Commission. https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/in-play-or-in-running-betting (fetched 2026-11-27)

## Claimed Edge

Croxson and Reade find prices update within seconds of goals.

## Post-Publication Decay

Sportsbooks add a delay on bet acceptance to keep their prices accurate, and betting exchanges add one to protect their bettors.

Decay source: Information and Efficiency: Goal Arrival in Soccer Betting. Croxson, James Reade, 2013, The Economic Journal. https://doi.org/10.1111/ecoj.12033 (Crossref DOI, fetched 2026-11-27)

## Capacity

Tiny.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
