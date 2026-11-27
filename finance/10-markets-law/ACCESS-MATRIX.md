# Access Matrix

Bead `bkt-q5moa.6`. As of 2026-11-27. US individual resident in New Jersey. Every cell rests on a card in this folder; follow the card for sources and grades.

## Asset by Venue

| Asset | Venue | Account types | Federal tax | NJ legal status | Cards |
|---|---|---|---|---|---|
| Stocks, ETFs | NYSE, Nasdaq, Cboe via broker | Taxable, IRA, Roth, solo 401k, LLC | 0/15/20% long term; ordinary short term; $3,000 net loss cap; 30-day wash sale | Legal. T+1. 23/5 trading targets 2026-12-06 | `venues/nyse.md`, `law/wash-sale.md` |
| Margin and day trading | Broker | Taxable, LLC. IRA margin barred: pledging is a prohibited transaction | As above | Reg T 50% initial. $25k PDT minimum ended 2026-06-04; brokers switch by 2027-10-20 | `law/reg-t-margin.md`, `law/pdt-intraday-margin.md` |
| Futures, index options | CME, Cboe, ICE via FCM | Taxable, LLC; IRA only where the broker allows | Section 1256: 60/40, marked to market at year end | Legal | `law/section-1256.md`, `venues/cme.md` |
| Spot crypto | Coinbase, Kraken, Binance US | Taxable, LLC; IRA through a self-directed custodian | Property. No wash sale rule; H.R. 9172 not passed. 1099-DA basis reporting for coins bought after 2025 | Legal; Binance US serves NJ | `law/crypto-1099-da.md`, `venues/coinbase.md` |
| Crypto perps | Coinbase from May 2026, Kraken from 2026-06-15, Hyperliquid | Taxable | CFTC-listed futures can qualify for 1256; check the contract card | Coinbase and Kraken US legal. Hyperliquid blocks NJ | `venues/hyperliquid.md`, `venues/kraken.md` |
| DEX tokens | Uniswap and peers | Self-custody, taxable | Property | No venue license; token status open while CLARITY stalls | `venues/dex.md`, `law/clarity-act.md` |
| Stablecoins | Exchanges, issuers | Taxable, self-directed IRA | Property | GENIUS effective 2027-01-18; OCC rule final, FDIC, NCUA and Treasury rules pending | `law/genius-act.md` |
| Event contracts | Kalshi | Taxable only | No IRS guidance as of 2026-06-16; 1256 status unsettled | Third Circuit 2-1 for Kalshi on 2026-04-06; NJ cert petition 26-299 pending | `venues/kalshi.md`, `cases/PREDICTION-MARKET-CASES.md` |
| Event contracts | Polymarket US, Robinhood, Coinbase, Crypto.com | Taxable; Robinhood bars IRAs | No IRS guidance as of 2026-06-16 | Third Circuit ruling names Kalshi only; state enforcement risk remains. DeFi Rate lists Polymarket US as available in NJ. Robinhood has pulled NJ sports contracts per DeFi Rate, 2026-11-13 | `venues/polymarket-us.md`, `venues/robinhood-pm.md` |
| Event contracts | Polymarket international | None | n/a | Blocks US users | `venues/polymarket-intl.md` |
| Sports bets | NJ sportsbooks | Cash account, 21+ | Ordinary income; from 2026 losses deductible at 90% and only up to winnings | Legal. NJ withholds 3%; operators pay 19.75% | `venues/sportsbooks-nj.md`, `law/sports-betting-tax.md` |
| Sports bets | Pinnacle, Betfair | None | n/a | Closed to NJ residents | `venues/pinnacle-sharp.md`, `venues/betfair.md` |
| Agency MBS | TBA dealer market | ETFs and funds in any account | Interest ordinary | Direct TBA is dealer-only | `venues/mbs-tba.md` |
| Real estate | Reg CF, Reg A+, Fundrise | Taxable; Fundrise IRA from $1,000; self-directed IRA for direct property | Leveraged IRA property creates UBTI, 990-T at $1,000 | Reg CF non-accredited cap: greater of $2,500 or 5% under $124,000; Reg A Tier 2 cap 10% | `venues/re-crowdfunding.md`, `accounts/self-directed-ira.md` |
| Private business | Acquire.com, BizBuySell, Flippa | Taxable, LLC; checkbook IRA with no self-dealing | Capital gain on sale; operating income ordinary | Legal | `venues/business-for-sale.md`, `accounts/checkbook-ira-llc.md` |
| GPU compute | Vast.ai, SF Compute; CME H100 futures | Taxable, LLC | Business income or expense | Legal. CME H100 launch scheduled 2026-10-05 pending CFTC review; no trading report found | `venues/compute.md` |

## Account Rules

| Account | 2026 limit | Constraint | NJ note |
|---|---|---|---|
| Traditional IRA | $7,500 plus $1,100 catch-up | No collectibles, no margin | No NJ deduction for contributions |
| Roth IRA | Same; phase-out $153k to $168k single, $242k to $252k joint | Same | Qualified distributions excluded from NJ income |
| Solo 401k | $24,500 deferral plus catch-up; $72,000 total | Needs self-employment income | |
| Self-directed IRA | IRA limits | Prohibited transaction disqualifies the whole IRA | |
| LLC trading entity | None | Pass-through by default | NJ: $100 formation, $75 annual report, $150 per owner partnership fee above two owners |
| Trader tax status, 475(f) | None | Election due by prior-year return date; ordinary gains, no wash sale, no $3,000 cap | |

## Open

- Supreme Court action on NJ v. Kalshi, No. 26-299: Kalshi response due 2026-12-07, nothing else docketed through 2026-11-27.
- CME H100 and B200 futures: first trading day and volume not confirmed in any fetched source.
- 23/5 equity go-live: Nasdaq Data News 2026-11-12 expects 2026-12-06, subject to DTCC and SIP readiness.
