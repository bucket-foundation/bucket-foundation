<!-- voice-ignore-file: transcript-derived digest -->
# 26. Introduction to Counterparty Credit Risk | MIT OpenCourseWare | bKmcRfE3I6E | 1.36 h

Teaches: A guest lecture by Yi Tang (Morgan Stanley) on counterparty credit risk: CVA definition and formula, portfolio effects, funding risk, the Berkshire put trade, and martingale testing, resampling and interpolation for enterprise-level models.

Claims:
- CVA is the price of counterparty credit risk, an adjustment to the default-free mark-to-market, and it also enters Basel III capital. "mark to market from counterparty default free" [0:05:29]
- In the 2008 crisis CVA mark-to-market losses exceeded actual counterparty default losses. "risk especially since the crisis in 2008" [0:06:27]
- Example: a trade goes from 0 to $100 million and the counterparty defaults with 50 percent recovery; the hedged dealer loses $50 million. "then your counterparty defaults with 50% recovery" [0:09:18]
- CVA is roughly minus mean positive exposure times CDS par spread times duration; the full form has an indicator for default before maturity and collateral. "the counterparty cds par spread times duration" [0:14:52]
- Offsetting trades can remove the loss, so CVA needs every trade facing the counterparty; receivables and payables are asymmetric, giving an option-like payoff. "and that's where the option like payoff" [0:19:19]
- Uncollateralized receivables need funding because hedges are collateralized; uncollateralized payables give a funding benefit. "uncollateralized payable funding benefits to partially hedge" [0:28:48]
- Berkshire sold long-dated puts on four indices and collected about $4 billion of premium without posting collateral; wrong-way risk. "berkshire sold long dated puts on four" [0:30:55]
- CVA hedge chains are cut by buying protection from a dealer on a fully collateralized basis. "b fully collateralized typically from a dealer" [0:44:16]


Worked:
- Using uncollateralized payable funding benefits partly hedges the funding risk of receivables. "uncollateralized payable funding benefits to partially hedge" [0:28:48]
- Martingale interpolation works by interpolating with time-zero quantities as the independent variable, so the martingale relationships hold. "linear interpolation using t as independent variable" [1:10:08]

Failed:
- Berkshire's CVA hedging by dealers widened Berkshire's credit spread, raising its funding cost. "spread widened everyone's spread widened so berkshire's" [0:39:09]
- CVA hedges have gap risk because exposure changes over time. "is the exposure can change over time" [0:36:03]
- Trade-level models aggregate PV linearly and miss non-linear risks such as CVA, funding and capital. "modeling one is non linear portfolio risks" [0:45:50]
- Zero recovery makes the risky annuity numeraire able to hit 0 and breaks the CDS martingale argument. "this risky annuity could have a 0" [0:59:35]
