<!-- voice-ignore-file: transcript-derived digest -->
A Quant's Perspective on the 2008 Financial Crisis | Susquehanna | VlOjcOp9a5U | 0.94 h

Teaches: A lecture by Doug Costa on how bonds, CDOs, mortgage-backed securities and credit default swaps worked, and how a wrong assumption of low default correlation in the Gaussian copula model hurt traders who were short equity tranches and long senior tranches.

Claims:
- Corporate bond pricing adds a default hazard rate to discounting; 2008 to 2018 one-year default rates were 0% for AAA, 0.02% for AA, 0.28% for BBB minus, 0.68% for BB plus, 10% for B minus and 23% for C. "zero defaults aa bonds had 0 02%" [0:12:14]
- A CDO pools about 100 bonds and tranches coupons in a waterfall; senior tranches get rated AAA because the equity and mezzanine tranches absorb the first defaults, and CDO squared repackages the junk tranches. "aaa products out of 100 junk bonds" [0:25:35]
- Credit default swaps (idea attributed to Blythe Masters at J.P. Morgan in the 1990s) became insurance anyone could buy without owning the bond; they were OTC, unregulated and carried counterparty risk. "idea a young woman named blythe masters" [0:31:10]
- Mortgage originators sold loans onward, so they loosened standards (teaser rates down to 0%, zero down, interest only, ninja loans, negative amortization), and house prices rose from 2000 to 2007 and fell when teasers reset. "line pretty continuously from 2000 to 2007" [0:40:14]
- Pricing used the Gaussian copula with a single correlation rho (the Merton default model plus Monte Carlo); traders quoted an implied correlation smile, with equity tranche near 0.4. "gaussian copula model with a single correlation" [0:50:37]
- Subprime RMBS needed correlations of about 80 to 90%, not 0.1 to 0.4; in a two bond example with 5% default probability, raising correlation from 0 to 1 takes senior tranche loss risk from 0.25% to 5% while equity tranche risk falls from 9.75% to 5%. "if probability of default is 5% 0" [0:54:18]

Architecture: none (explanatory; Gaussian copula Monte Carlo with a 100x100 correlation matrix simplified to a single rho, say 40,000 paths) [0:48:00-0:49:00].

Worked:

Failed:
- High correlation helped the equity short slightly but devastated the senior longs; the speaker says one case lost about 13 billion against a 4 billion gain, 9 billion net. "up losing like you know $13 billion" [0:55:42]
- Traders were anchored on historical correlation levels. "anchored mentally to this kind of level" [0:00:10]
