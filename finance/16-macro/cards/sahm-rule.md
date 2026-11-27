# Sahm Rule

ID `M-sahm-rule`. As of 2026-11-27. Section: business cycles.

## What It Is
Claudia Sahm's recession trigger. FRED: it "signals the start of a recession when the three-month moving average of the national unemployment rate (U3) rises by 0.50 percentage points or more relative to the minimum of the three-month averages from the previous 12 months." It was proposed as the trigger for automatic stimulus payments in a Hamilton Project paper. Grade A.

## Current State
SAHMREALTIME 0.00 for Oct 2026; unemployment 4.1%. No signal. Grade A.

## Threshold
0.50 points, from the rule's definition. Readings from 0.30 upward are an early watch level used in the [dashboard](../DASHBOARD-SPEC.md), a house choice.

## Market Reaction
A trigger moves front-end yields down as markets price cuts. The rule uses real-time data, so revisions can erase or create signals.

## Release Schedule
Updates with the BLS Employment Situation: 4 Dec 2026, 8 Jan 2027, 5 Feb 2027, 5 Mar 2027, 8:30 a.m. ET.

## Data
FRED `SAHMREALTIME` ([lab](../../lab/data/raw/fred/SAHMREALTIME.csv)), `UNRATE` ([lab](../../lab/data/raw/fred/UNRATE.csv)).

## Sources
- [FRED SAHMREALTIME](https://fred.stlouisfed.org/series/SAHMREALTIME), fetched 2026-11-27. Grade A.
- [Hamilton Project, Direct stimulus payments to individuals](https://www.hamiltonproject.org/publication/policy-proposal/direct-stimulus-payments-to-individuals/), fetched 2026-11-27. Grade A.
- [BLS Employment Situation schedule](https://www.bls.gov/schedule/news_release/empsit.htm), fetched 2026-11-27. Grade A.
