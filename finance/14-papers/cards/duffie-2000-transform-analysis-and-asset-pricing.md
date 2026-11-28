# Transform Analysis and Asset Pricing for Affine Jump-diffusions <!-- voice-ignore-line -->

Topic: Derivatives  
Also tagged: Asset Pricing, Derivatives  
OpenAlex: https://openalex.org/W3123321876  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Darrell Duffie, Jun Pan, Kenneth J. Singleton | <!-- voice-ignore-line -->
| Year | 2000 |
| Venue | Econometrica | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/1468-0262.00164 |
| Cited by | 3317 as of 2026-11-27 |
| Cited by inside this set | 6 |

## Method

Model-based analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> This example highlights the impact on option ‘smirks’ of the joint distribution of jumps in volatility and jumps in the underlying asset price, through both jump amplitude as well as jump timing.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> In the setting of ‘affine’ jump-diffusion state processes, this paper provides an analytical treatment of a class of transforms, including various Laplace and Fourier transforms as special cases, that allow an analytical treatment of a range of valuation and econometric problems. Example applications include fixed-income pricing models, with a role for intensity-based models of default, as well as a wide range of option-pricing applications. An illustrative example examines the implications of stochastic volatility and jumps for option valuation. This example highlights the impact on option ‘smirks’ of the joint distribution of jumps in volatility and jumps in the underlying asset price, through both jump amplitude as well as jump timing.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w7105/w7105.pdf

## Deep Read

Source: open-access NBER Working Paper 7105, April 1999, the version published in Econometrica 68(6), 2000. The scan's equations extract poorly; structure and results come from the prose and Table 1 discussion. Read 2026-11-27.

### Research Question

For state variables that follow affine jump-diffusions, can one compute in closed form, up to ODEs, the transforms needed to price bonds, defaultable debt and options, and what do jumps in volatility do to the index option smirk?

### Data and Sample

The theory needs no data. The illustration calibrates to 87 S&P 500 futures options on November 2, 1993, with maturities from 17 to 318 days and strikes from 0.74 to 1.17 times the futures price, from Yacine Ait-Sahalia's site (Figure 1). The risk-free rate is set at 3.19 percent and the dividend yield at zero.

### Method

An affine jump-diffusion (AJD) state X has drift, diffusion covariance, jump intensity and discount rate all affine in X, with a jump-size distribution whose transform is known. Equation (2.2) defines a discounted transform of X(T). Proposition 1 shows it equals exp(alpha(t) plus beta(t) times x), with alpha and beta solving complex-valued Riccati-type ODEs (2.4) and (2.5). An extended transform covers payoffs linear in X. Fourier inversion of the transform gives prices of options and other payoffs. Applications cover multi-factor term structure models, default intensity models for corporate bonds, and stochastic volatility models with jumps. Section 4 compares three nested models fit by least squares on option prices: SV (stochastic volatility, no jumps), SVJ-Y (jumps in price) and SVJJ (simultaneous correlated jumps in price and volatility).

### Main Results

The transform result unifies and extends Heston (1993), Bates (1996, 1997), Scott (1997), Bakshi-Cao-Chen (1997) and affine term structure models, with prices obtained from ODE solutions and one-dimensional Fourier integrals.

Table 1 and Figures 1 to 3, the 1993 calibration: adding jumps in volatility (SVJJ) cuts the estimated volatility of the diffusion part of variance, addressing the puzzle in Bates and Bakshi-Cao-Chen that diffusive volatility of volatility looked too high. The price jump variance falls to near zero, and jumps in price and volatility become almost perfectly negatively correlated, which reinforces the negative skew. Jump timing and amplitude together shape the smirk across maturities.

### Robustness

Not applicable to a theory paper; the example is a one-day calibration meant as illustration.

### Stated Limits

Results require the regularity and integrability conditions in Appendices B and C. The smirk example uses one day of data and is not an estimation.

### Retail Systematic Trader

The affine transform method is how most practical stochastic volatility and jump models, including Heston and Bates, get priced fast. A retail options trader can use it, through open-source libraries, to fit a smile each day and compare model and market prices. The empirical lesson is that index put skew reflects crash risk where volatility and price jump together; selling downside puts collects that premium and carries that joint-jump exposure, so size short volatility positions for a gap down with a volatility spike.
