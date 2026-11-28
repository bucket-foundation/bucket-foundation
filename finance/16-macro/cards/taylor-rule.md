# Taylor Rule

ID `M-taylor-rule`. As of 2026-11-27. Section: monetary theory.

## What It Is
<!-- voice-ignore-next 1 -->
John Taylor, "Discretion versus Policy Rules in Practice", Carnegie-Rochester 1993. Equation (1): r = p + .5y + .5(p - 2) + 2, with r the fed funds rate, p inflation over the previous four quarters, y the percent deviation of real GDP from trend. "If both the inflation rate and real GDP are on target, then the federal funds rate would equal 4 percent, or 2 percent in real terms." Taylor wrote that the rule "fits the actual policy performance during the last few years remarkably well." Grade A.

## Current State
Computed 2026-11-27 from FRED data, Grade A inputs, house calculation:
- p = core PCE 3.26% for Oct 2026.
- y = 100 x (GDPC1 24,665.2 less GDPPOT 24,200.4) / 24,200.4 = +1.92% for 2026 Q3, using CBO potential.
- r = 3.26 + 0.96 + 0.63 + 2 = 6.85%.
Swapping the fixed 2% real rate for the Laubach-Williams r-star of 1.65% and the LW output gap of 1.20 for 2026 Q2: r = 3.26 + 0.60 + 0.63 + 1.65 = 6.14%. With headline CPI 4.08% in place of core PCE, r = 8.07%. The actual range is 3.75% to 4.00%. The 1993 rule calls for a far higher rate; a lower r-star, see [r-star](r-star.md), or a supply-shock view of inflation narrows the gap.

## Market Reaction
A large rule gap feeds the hawkish dissents of Oct 2026 and keeps 2-year yields above the range.

## Data
FRED `PCEPILFE`, `GDPC1`, `GDPPOT` in [lab](../../lab/data/raw/fred/).

## Sources
- [Taylor 1993, Stanford PDF](https://web.stanford.edu/~johntayl/Onlinepaperscombinedbyyear/1993/Discretion_versus_Policy_Rules_in_Practice.pdf), fetched 2026-11-27. Grade A.
- FRED series above, fetched 2026-11-27. Grade A.
