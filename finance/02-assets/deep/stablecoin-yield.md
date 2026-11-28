# Stablecoin Yield Deep Dive

Card: [Stablecoin Yield](../stablecoin-yield.md), ID `A-stableyield`. As of 2026-11-27. Grades: A primary, B secondary, C single source pending check. Every source below was fetched 2026-11-27.

## GENIUS Act Text
Public Law 119-27, fetched from govinfo after congress.gov failed in an earlier pass. Grade A. [govinfo PLAW-119publ27](https://www.govinfo.gov/content/pkg/PLAW-119publ27/html/PLAW-119publ27.htm).
- Interest ban, section 4(a)(11): "No permitted payment stablecoin issuer or foreign payment stablecoin issuer shall pay the holder of any payment stablecoin any form of interest or yield (whether in cash, tokens, or other consideration) solely in connection with the holding, use, or retention of such payment stablecoin."
- Reserves, section 4(a)(1)(A): issuers keep identifiable reserves "on an at least 1 to 1 basis," starting with coins and currency, Federal Reserve balances and demand deposits, with the full list in the statute.
- The ban binds issuers. Yield reaching holders through exchanges, affiliates or lending programs turns on the phrase "solely in connection with," which the text leaves to regulators. OCC rules finalized in November 2026; see [2026-STATE.md](../2026-STATE.md).

## T-Bill Backing
- Tether Q3 2026, as of 30 Sept 2026, BDO attestation: total assets about $191.5B against $183.5B liabilities, excess reserves $7.95B, up from $4.1B at end of Q2; direct and indirect U.S. T-bill exposure $132.4B, down from about $141B at end of Q1; Q3 net operating profit about $1.5B. Grade B: Tether's press release, with the BDO PDF itself unread. [Tether, 30 Oct 2026](https://tether.io/news/tether-generates-1-5-billion-in-q3-net-operating-profit-as-reserve-buffer-doubles-to-almost-8-billion/).
- Circle: most USDC reserves sit in the Circle Reserve Fund USDXX, a government money market fund, with the rest in bank cash; monthly assurance from a Big Four firm; composition labeled as of 23 Nov 2026. The circulation and reserve totals render in the browser and were blank in the fetched text. Grade A for composition. [Circle transparency](https://www.circle.com/transparency).

## Worked Yield
- 3-month T-bill: 4.18% on 24 Nov 2026, discount basis. Grade A. [empirical: FRED DTB3, 2026-11-27, https://fred.stlouisfed.org/data/DTB3.txt]
- Gross carry on Tether's T-bill book: \( 132.4 \times 0.0418 = \$5.53\text{B} \) a year. Holders receive none of it under section 4(a)(11) for a permitted issuer. [empirical: Tether Q3 2026 release and FRED DTB3, 2026-11-27, python3 -c "print(132.4*0.0418)"]
- Holder cost of the ban: a $10,000 balance forgoes about \( 10{,}000 \times 0.0418 = \$418 \) a year against a direct T-bill.
- Buffer test: Tether's $7.95B excess over $183.5B of liabilities is 4.33%. A loss larger than that on non-T-bill assets erases the buffer. [empirical: Tether Q3 2026 release, 2026-11-27, python3 -c "print(7.95/183.5)"]

## Data Sources
| Source | Holds |
|---|---|
| [govinfo PLAW-119publ27](https://www.govinfo.gov/app/details/PLAW-119publ27) | statute text |
| [Tether transparency](https://tether.to/en/transparency/) | supply, quarterly attestations |
| [Circle transparency](https://www.circle.com/transparency) | weekly reserve report, monthly attestations |
| [FRED DTB3](https://fred.stlouisfed.org/series/DTB3) | T-bill yield |
