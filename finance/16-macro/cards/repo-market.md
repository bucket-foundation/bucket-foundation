# Repo Market

ID `M-repo-market`. As of 2026-11-27. Section: money market plumbing.

## What It Is
A repurchase agreement is a short secured loan: one side sells securities and agrees to buy them back, overnight or at a set term. Cash lenders are money funds and banks; borrowers are dealers and leveraged funds financing Treasury positions. Segments: tri-party, with a clearing bank as agent; centrally cleared through FICC, including DVP; and non-centrally cleared bilateral. The OFR publishes "daily data on rates and volumes in centrally cleared and tri-party repurchase agreement (repo) markets," with tri-party data "generally made available with a two-day lag." Grade A.

## Current State
25 Nov 2026, NY Fed. Grade A.
- SOFR 3.95% on $3,145B; tri-party GCR 3.93% on $1,214B.
- Fed backstops on both sides: ON RRP at 3.75%, $0.3B used; standing repo at 4.00%, unused.
- Government money funds, the main tri-party lenders, hold $6,593.4B; see [money-market-funds](money-market-funds.md).

## Market Reaction
Repo is where reserve scarcity shows first: Sept 2019 and March 2020. See [sofr-iorb-spread](sofr-iorb-spread.md) and [treasury-basis-trade](treasury-basis-trade.md).

## Data
FRED `SOFR`, `RRPONTSYD`, `RPONTSYD`; [OFR short-term funding monitor](https://www.financialresearch.gov/short-term-funding-monitor/).

## Sources
- [OFR repo dataset](https://www.financialresearch.gov/short-term-funding-monitor/datasets/repo/), fetched 2026-11-27. Grade A.
- NY Fed Markets API SOFR and TGCR, fetched 2026-11-27. Grade A.
