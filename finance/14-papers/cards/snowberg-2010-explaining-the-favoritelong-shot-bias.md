# Explaining the Favorite–Long Shot Bias: Is it Risk-Love or Misperceptions? <!-- voice-ignore-line -->

Topic: Sports Betting Markets  
Also tagged: Sports Betting Markets  
OpenAlex: https://openalex.org/W3123039092  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Erik Snowberg, Justin J. Wolfers | <!-- voice-ignore-line -->
| Year | 2010 |
| Venue | Journal of Political Economy | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1086/655844 |
| Cited by | 372 as of 2026-11-27 |
| Cited by inside this set | 7 |

## Method

Theoretical model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Using a new, large-scale data set ideally suited to implement these tests, we find evidence in favor of the view that misperceptions of probability drive the favorite–long shot bias, as suggested by prospect theory.

## Replication

Lab replication: Favorite-longshot. See [lab/RESULTS.md](../../lab/RESULTS.md). Verdict: Survived in football and Kalshi; Polymarket sample too small.
Cited as a source by strategy cards: [sb-favorite-longshot-racing](../../09-strategies/cards/sb-favorite-longshot-racing.md). Each card grades decay after publication and retail feasibility.

## Abstract

<!-- voice-ignore-next 1 -->
> The favorite–long shot bias describes the long-standing empirical regularity that betting odds provide biased estimates of the probability of a horse winning: long shots are overbet whereas favorites are underbet. Neoclassical explanations of this phenomenon focus on rational gamblers who overbet long shots because of risk-love. The competing behavioral explanations emphasize the role of misperceptions of probabilities. We provide novel empirical tests that can discriminate between these competing theories by assessing whether the models that explain gamblers’ choices in one part of their choice set (betting to win) can also rationalize decisions over a wider choice set, including compound bets in the exacta, quinella, or trifecta pools. Using a new, large-scale data set ideally suited to implement these tests, we find evidence in favor of the view that misperceptions of probability drive the favorite–long shot bias, as suggested by prospect theory.

## Full Text

Open-access copy: https://docs.iza.org/dp4884.pdf

## Deep Read

Source: open-access IZA Discussion Paper 4884, April 2010, the version published in the Journal of Political Economy 118(4), 2010. Read 2026-11-27.

### Research Question

Is the favorite-longshot bias at the racetrack caused by risk-loving bettors with correct beliefs, or by bettors who misperceive probabilities, overweighting small ones as prospect theory predicts?

### Data and Sample

Every North American horse race from 1992 to 2001, from Axcis Inc., a subsidiary of the Jockey Club. 6,403,712 starts in 865,934 races with win odds and finishing positions; Figure 1 uses 5,610,580 cleaned US starts. Winning payoffs for exactas in 314,977 races, quinellas in 116,307 and trifectas in 282,576.

### Method

Both model classes fit the win pool exactly: a representative bettor with a convex utility over payoffs (risk-love), or with a probability weighting function over correct payoffs (misperceptions). The authors then use each fitted model to price compound bets, exactas, quinellas and trifectas, with Harville's formula for conditional finishing probabilities. The model that prices the exotic bets closer to their realized payoffs wins. Table 1 reports absolute errors and the share of races where each model is closer. Tables 2 and 3 relax the conditional independence in Harville's formula by estimating second-place probabilities from the data.

### Main Results

Figure 1: betting horses at 100/1 or longer returns about minus 61 percent per dollar, betting at random about minus 23 percent, and betting the favorite in every race about minus 5.5 percent. Horses between 4/1 and 9/1 return about minus 18 percent.

Table 1, exactas (n = 197,551): mean absolute error is 0.0139 for risk-love and 0.0125 for misperceptions, a difference of 0.00137 (standard error 0.00002); misperceptions is closer in 57.9 percent of races. Quinellas (n = 70,169): misperceptions closer in 54.0 percent. Trifectas (n = 137,756): absolute percentage error 100 percent for risk-love against 57.4 percent for misperceptions, closer in 71.1 percent of races.

The fitted weighting function is close to Prelec (1998). The authors conclude the bias comes from misperceived probabilities.

### Robustness

Weighting by pool size, dropping the longest odds, adjusting for track take, and relaxing the conditional independence assumption (Table 3) leave the conclusion unchanged.

### Stated Limits

Neither label covers its class exactly; each includes a range of theories. At the longest odds, patterns remain that neither model fits. Prices of non-winning exotic combinations are not recorded. The bias persists because misperceptions do not create profits for unbiased bettors after the track take.

### Retail Systematic Trader

Retail traders cannot profit by betting favorites: the best bucket still loses 5.5 percent after the take. The useful rule is to stop buying longshots, where expected loss per dollar runs near 61 percent. The same probability-weighting pattern appears in lottery-like stocks, far out-of-the-money options and prediction market tails, where selling overpriced longshots can pay if fees are lower than the racetrack take. The lab's favorite-longshot replication tests this on modern odds.
