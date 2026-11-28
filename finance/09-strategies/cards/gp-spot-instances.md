# Cloud Spot Instance Arbitrage

ID: `gp-spot-instances`
Family: GPU and Compute
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Run interruptible workloads on spot instances at deep discounts and resell compute or capacity.

## Source

1. Deconstructing Amazon EC2 Spot Instance Pricing. Agmon Ben-Yehuda, Ben-Yehuda, Schuster, Tsafrir, 2013, ACM Transactions on Economics and Computation. https://doi.org/10.1145/2509413.2509416 (Crossref DOI, fetched 2026-11-27)
2. Amazon EC2 Spot introduces new pricing model. AWS, 2017. https://aws.amazon.com/about-aws/whats-new/2017/11/amazon-ec2-spot-introduces-new-pricing-model-and-the-ability-to-launch-new-spot-instances-via-runinstances-api (fetched 2026-11-27)

## Claimed Edge

Spot capacity sells well below on-demand; prices are set by provider rules.

## Post-Publication Decay

In November 2017 AWS moved Spot to a pricing model with low, predictable prices that adjust gradually based on long-term supply and demand trends.

Decay source: Deconstructing Amazon EC2 Spot Instance Pricing. Agmon Ben-Yehuda, Ben-Yehuda, Schuster, Tsafrir, 2013, ACM Transactions on Economics and Computation. https://doi.org/10.1145/2509413.2509416 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
