# Treasury Auctions

ID `M-treasury-auctions`. As of 2026-11-27. Section: fiscal.

## What It Is
Treasury sells notes and bonds by single-price auction at 1:00 p.m. ET. The high yield is the clearing rate; bid-to-cover is bids received over the amount offered. A tail is the high yield above the when-issued yield at 1:00 p.m., which needs intraday data the lab does not hold.

## Recent Results
TreasuryDirect auction API, fetched 2026-11-27. Grade A.
| Issue date | Security | High yield | Bid-to-cover | Size |
|---|---|---|---|---|
| 30 Nov 2026 | 2-year | 4.700% | 2.65 | $69B |
| 30 Nov 2026 | 5-year | 4.719% | 2.37 | $70B |
| 30 Nov 2026 | 7-year | 4.708% | 2.43 | $44B |
| 16 Nov 2026 | 3-year | 4.627% | 2.53 | $58B |
| 16 Nov 2026 | 10-year | 5.020% | 2.46 | $42B |
| 2 Nov 2026 | 2-year | 4.708% | 2.59 | $69B |
| 2 Nov 2026 | 5-year | 4.845% | 2.33 | $70B |
| 2 Nov 2026 | 7-year | 4.894% | 2.46 | $44B |
The 10-year sold at 5.02% in the November refunding, 11 bp above the 4.91% close of 24 Nov.

## Market Reaction
Weak demand at long auctions raises term premium the same afternoon. Sizes are fixed for the next several quarters; see [treasury-issuance-quarterly-refunding](treasury-issuance-quarterly-refunding.md).

## Data
[TreasuryDirect auctioned securities API](https://www.treasurydirect.gov/TA_WS/securities/auctioned?format=json&type=Note&days=40).

## Sources
- TreasuryDirect API above, fetched 2026-11-27. Grade A.
- [Refunding statement 4 Nov 2026](https://home.treasury.gov/news/press-releases/sb0678), fetched 2026-11-27. Grade A.
