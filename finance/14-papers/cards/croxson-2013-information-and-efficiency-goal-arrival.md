# Information and Efficiency: Goal Arrival in Soccer Betting <!-- voice-ignore-line -->

Topic: Sports Betting Markets  
Also tagged: Sports Betting Markets  
OpenAlex: https://openalex.org/W2060281229  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Karen Croxson, J. James Reade | <!-- voice-ignore-line -->
| Year | 2013 |
| Venue | The Economic Journal | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/ecoj.12033 |
| Cited by | 144 as of 2026-11-27 |
| Cited by inside this set | 2 |

## Method

Empirical analysis of market or survey data. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> On our evidence, prices update swiftly and fully.

## Replication

Cited as a source by strategy cards: [sb-in-play](../../09-strategies/cards/sb-in-play.md). Each card grades decay after publication and retail feasibility.

## Abstract

<!-- voice-ignore-next 1 -->
> An efficient market incorporates news into prices immediately and fully. Tests for efficiency in financial markets have been undermined by information leakage. We test for efficiency in sports betting markets – real‐world markets where news breaks remarkably cleanly. Applying a novel identification to high‐frequency data, we investigate the reaction of prices to goals scored on the ‘cusp’ of half‐time. This strategy allows us to separate the market's response to major news (a goal), from its reaction to the continual flow of minor game‐time news. On our evidence, prices update swiftly and fully.

## Full Text

Open-access copy: https://repec.cal.bham.ac.uk/pdf/11-01.pdf

## Deep Read

Source: open-access University of Birmingham Department of Economics Discussion Paper 11-01, January 21, 2011, the version published in The Economic Journal 124(575), 2014. Read 2026-11-27.

### Research Question

Do in-play betting prices absorb major news, a goal in soccer, at once and in full, as semi-strong form efficiency requires?

### Data and Sample

Second-by-second snapshots of Betfair's live order book for 1,206 professional soccer matches: 547 English Premiership, 165 Champions League, 249 UEFA Cup, 101 Euro 2008, 64 Scottish Premiership, 24 Asian Cup, 14 Intertoto Cup and 42 internationals. The average match sees over $6 million traded, half of it in play. 160 goals arrive within a short time before half time.

### Method

First, measure the jump in the scorer's implied win probability when a goal is scored (Table 1). Second, the identification strategy: after a goal scored just before half time, the 15-minute interval carries no new play, so any price drift during the break signals slow updating. Tables 2 and 3 apply statistical efficiency tests to the first five and ten minutes of half time. Tables 4 and 5 test two trading rules: back an outcome at the start of half time and lay it 5 or 10 minutes later (strategy A), or the reverse (strategy B), net of the spread, filtered by volume. Third, calibration tests over the full sample ask whether contracts priced at p win with frequency p during play. The paper also studies how liquidity moves around goals.

### Main Results

Table 1: on average the scorer's win probability jumps 22 percentage points at the goal; later goals and goals that change the leading side move prices most.

Tables 2 and 3: prices do not drift during the half-time break after a cusp goal.

Table 4: strategy A loses money. For all matches, the test statistics for backing and later laying are minus 2.89 and minus 2.93 for the home win, minus 4.10 and minus 3.79 for the away win, and minus 4.58 and minus 4.08 for the draw, at 5 and 10 minutes; restricting to higher-volume markets does not change the sign. Table 5 shows strategy B is also unprofitable.

Calibration over in-play prices shows no exploitable drift. The authors conclude prices update swiftly and fully.

### Robustness

Volume filters from more than 5 to more than 50 units, 5- and 10-minute windows, the full-sample calibration test, and the liquidity analysis.

### Stated Limits

Half-time traders or news patterns may differ from those during play, which motivates the in-play tests. Calibration needs large samples per price bin. The data cover one exchange.

### Retail Systematic Trader

Betfair in-play soccer prices react to goals within seconds and show no drift to trade after the fact; buying or selling the scoring side once the goal is visible on a broadcast loses the spread. Retail edge in in-play betting, if any, needs faster information than the market, and broadcast delay works against the retail trader. The lab's sports betting cards should treat post-news drift strategies on liquid exchanges as dead.
