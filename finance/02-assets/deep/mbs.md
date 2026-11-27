# Mortgage-Backed Securities Deep Dive

Card: [Mortgages and Mortgage-Backed Securities](../mbs.md), ID `A-mbs`. As of 2026-11-27. Grades: A primary, B secondary, C single source pending check. Every source below was fetched 2026-11-27.

## Prepayment Math
- CPR is the annualized prepayment rate; SMM is its monthly form, \( \mathrm{SMM} = 1-(1-\mathrm{CPR})^{1/12} \). Grade A. [SIFMA Uniform Practices Chapter SF, Standard Formulas](https://www.sifma.org/wp-content/uploads/2017/08/chsf.pdf).
- 100% PSA: 0.2% CPR in the first month after origination of the loans, plus 0.2% CPR each month until month 30, then 6.0% CPR. A speed of \( k\% \) PSA multiplies that curve by \( k/100 \). Grade A. Same source.
- In formula form, \( \mathrm{CPR}_t = \tfrac{k}{100}\cdot 0.06\cdot \min(t,30)/30 \).
- Worked values: 100% PSA at month 10 is 2.0% CPR; 150% PSA at month 40 is 9.0% CPR, SMM 0.7828%; a 6% CPR is SMM 0.5143%; a 20% CPR refinance wave is SMM 1.8423%. [empirical: SIFMA Chapter SF definitions, 2026-11-27, python3 -c "print(1-(1-0.09)**(1/12))"]
- Rates set speed. With the Freddie Mac 30-year rate at 7.21% on 25 Nov 2026, most outstanding loans carry lower coupons and have no refinance incentive, so speeds sit near turnover and duration extends. Grade A for the rate. [empirical: FRED MORTGAGE30US, 2026-11-27, https://fred.stlouisfed.org/data/MORTGAGE30US.txt]

## TBA Market
- Agency pools trade forward as TBA: price, coupon, agency and settlement month are agreed; the seller names the specific pools on the notification date. SIFMA sets the monthly notification and settlement dates by class. Grade A. [SIFMA MBS Notification and Settlement Dates, published 29 Jan 2026](https://www.sifma.org/resources/general/mbs-notification-and-settlement-dates/).
- Sample 2026 dates from that table: January Class A notification 12 Jan, settlement 14 Jan; Class D notification 23 Jan, settlement 27 Jan. Class A notification falls two business days before settlement in each month shown. Grade A. Same source.
- Good-delivery variance and pool count rules live in SIFMA Uniform Practices Chapter 8; that chapter was not fetched in this pass.

## Agency and Non-Agency
- Agency MBS carry a Fannie Mae, Freddie Mac or Ginnie Mae guarantee of principal and interest; holders take prepayment and rate risk. Fannie and Freddie entered FHFA conservatorship in September 2008. Grade A. [FCIC Final Report](https://www.govinfo.gov/content/pkg/GPO-FCIC/pdf/GPO-FCIC.pdf).
- Private-label securities pool and tranche credit risk: senior tranches are paid first, junior tranches absorb losses first, which the FCIC calls a waterfall. Grade A. Same source.
- The Fed held $1.883T of agency MBS on 18 Nov 2026. Grade A. [Federal Reserve H.4.1](https://www.federalreserve.gov/releases/h41/current/), as cited in the card.

## 2008 Mechanics
From the FCIC Final Report, January 2011. Grade A.
- "We conclude this financial crisis was avoidable." The Commission found that officials and executives ignored warnings and failed to manage evolving risks.
- Pipeline: speculators, brokers, lenders and the firms that built MBS, CDOs, CDOs squared and synthetic CDOs each held too little skin in the game and expected to pass risk to the next buyer.
- Credit default swaps let AIG sell protection on mortgage securities and made synthetic CDOs possible. Synthetic CDOs were bets on real mortgage securities and allowed multiple bets on the same bonds, which multiplied losses.
- Policy response: the rescue of Bear Stearns, conservatorship for Fannie and Freddie, no rescue for Lehman, then a rescue of AIG; the Commission says the inconsistency added to the panic.
- The govinfo PDF prints numerals in a font that text extraction drops, so the dollar figures for AIG protection and Goldman Sachs synthetic CDO volume are left out here until a clean text copy is fetched.

## Data Sources
| Source | Holds |
|---|---|
| [SIFMA Chapter SF](https://www.sifma.org/wp-content/uploads/2017/08/chsf.pdf) | CPR, SMM, PSA definitions |
| [SIFMA settlement dates](https://www.sifma.org/resources/general/mbs-notification-and-settlement-dates/) | TBA calendar |
| [FRED MORTGAGE30US](https://fred.stlouisfed.org/series/MORTGAGE30US) | primary mortgage rate |
| [Fed H.4.1](https://www.federalreserve.gov/releases/h41/current/) | Fed MBS holdings |
| [FCIC report](https://www.govinfo.gov/app/details/GPO-FCIC) | 2008 record |
