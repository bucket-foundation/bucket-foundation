# Hypothesis Engine: Ideal State and Unknowns

Status: DRAFT. Date: 2026-09-09. Companion to `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` and `TIMELINE-AND-COMBINATORICS-SPEC.md`, read here as the biased state: the founder's stated wishes for the engine, encoded before either spec asked what a hypothesis engine over history needs to represent about what it does not know. This spec derives the ideal state from that biased state, treats known unknowns and unknown unknowns as parts of the model instead of gaps a human notices later, and treats the generating and scoring LLM's own trained-in prior as one fallible input among several instead of the frame the rest of the system runs inside.

## 1. Bias Audit

| Bias | Where it lives | Consequence | Fix |
|---|---|---|---|
| Closed slot vocabulary | TIMELINE §2-3, `ALL_ACTORS`/`ALL_ACTIONS`/`ALL_MECHANISMS` and the fixed vocab index behind `address()` | An actor, mechanism, or place nobody has named yet has no address; the space is complete only relative to a vocabulary that cannot grow | Open-world `OTHER` slot with reserved probability mass, §6a |
| Sigmoid point score conflates no evidence with false | HISTORY §2, `tau = sigmoid(L)`; TIMELINE §4, `tau0 = sigmoid(L_prior)` computed before any evidence exists | A hypothesis nobody has looked at reads as one plain number, same as one actively refuted by evidence | Opinion `(b, d, u, a)` carries uncertainty mass apart from disbelief, §2 |
| Additive log-odds assumes source independence | HISTORY §2 groups evidence by `provenance.asserted_by`; TIMELINE §4 groups by knowledge kind | Two texts that both copy a third source count as two independent corroborations, doubling weight that is one witness | Stemma dependency graph, `n_eff` in place of raw `n`, §3 |
| Calendar-round time bins | TIMELINE §1/§3, `TIME_BIN` fixed at century width across a 20,000-year span | An event near a bin edge, or one needing decade resolution, gets misplaced or split | Bin width set from the period's own `date_posterior` HPD width instead of a fixed constant |
| Preservation and survivorship bias | HISTORY §5's documentary-silence example scores absence at a flat T3 | Absence in an oral-only or destroyed-archive period reads as informative as absence in a well-kept archive | Detectability term `delta` scales absence evidence, §4 |
| Founder-set concept priors as bias injection | TIMELINE §2, `prior_logit` on `extraterrestrials` and the other exotic actors, `editable_by: founder` | One founder's judgment becomes a silent constant folded into every future run's prior, standing in for the corpus's base rate | Founder prior tracked as its own evidence kind with its own reliability, §7 |
| Founder yes or no as a gradient | HISTORY §7, human review lands at T1, `k=2.0`, the ceiling of the weight table | One tap can outweigh several independent T2/T3 sources and force a recompute toward the founder's read | Founder review is one evidence kind, folded by fusion, calibration tracked over time, §7 |
| The LLM's consensus prior in generation | Nowhere named; `score_B` and `confidence_nucleus_C` proxy existing consensus, and Hist-LLM shows a trained model near 46 percent recall on this kind of task | The model's own trained-in sense of a period sits under every prior unaccounted for, and Hist-LLM says that sense sits closer to chance than to ground truth | `model-prior`, one tracked, low-tier evidence kind, §7 |
| "Full set" as an impossible claim | HISTORY §5: "The full set is exactly this combinatorial enumeration"; TIMELINE §3: `\|H_seq\| ~ 1.7 x 10^24` | Claims completeness over a space no process can materialize, and treats addressable in principle as generated in fact | Coverage estimate with an interval, per time bin, §8 |
| Prime-encoded addresses over a frozen vocabulary | TIMELINE §3, `PRIMES` fixed at thirteen slots, `vocab_index` fixed at generation time | Adding a concept to any slot's vocabulary shifts every later index, so every address already issued breaks | Append-only vocab index, new concepts appended never inserted, tied to §6a |

Every row shares one root cause: the earlier specs treat what the corpus has not yet found, named, or asked as equivalent to what does not exist. The ideal state gives each of those gaps a place in the model.

## 2. Belief as Opinion

Replace the single score `tau` with a subjective-logic opinion per hypothesis, `omega = (b, d, u, a)`: belief, disbelief, uncertainty mass, and base rate, with `b + d + u = 1`. The projected probability is

```
P(h) = b(h) + a(h) * u(h)
```

`a(h)` is the resting point of total ignorance: with no evidence, `b = d = 0`, `u = 1`, and `P = a`, exactly `tau0` from TIMELINE §4's zero-evidence worked example. The opinion form adds one missing tag: that number stands in for evidence, and is not evidence itself.

**From evidence sums to belief and disbelief.** HISTORY §2 and TIMELINE §4 already reduce a hypothesis's clusters to two numbers, `S_+` and `S_-`, the diminishing-returns sums of supporting and refuting evidence weight. Cumulative fusion of independent subjective-logic opinions that share one base rate is additive in evidence weight, the same operation a Beta distribution's parameters undergo when two independent samples pool; the existing `D(n)` discount already approximates that pooling for one side. `S_+` and `S_-`, with `n_eff` from §3 standing in for raw `n`, become the evidence counts that feed belief and disbelief directly:

```
r = D(n_+) * S_+          s = D(n_-) * S_-          W = 2
b(h) = r / (r + s + W)
d(h) = s / (r + s + W)
u(h) = W / (r + s + W)
a(h) = sigmoid(L_prior(h))
```

`W` is subjective logic's standard weight for total ignorance; a hypothesis with `r = s = 0` gets `u = 1` by construction, so a zero-evidence hypothesis carries a stated uncertainty mass instead of a defined low score. As evidence accumulates on either side, `r + s` grows and `u` shrinks, so the corpus's confidence tracks how much has been looked at, apart from which way the pool leans.

`L_prior(h)` is unchanged: HISTORY §2's blend of `score_B` and `confidence_nucleus_C` for a claim-based hypothesis, or TIMELINE §4's sum of slot `prior_logit` values for a combinatorial one. Both already compute a base rate; the opinion model reuses each as `a(h)` without touching either formula.

**Contradiction falls out on its own.** When `b(h)` and `d(h)` sit close together, `P(h)` sits close to `a(h)`: with `b = d`, `P = (1 - u)/2 + a*u`, which reduces to `a` as `u` approaches 1 and to `1/2` only when `a = 1/2`. A contested hypothesis settles at the prior it carries, whatever value that prior holds, instead of landing at even odds by default. `Omega_contradiction` is no longer a separate penalty; it is what the opinion equations already do.

**Ranking stays compatible.** `Theta_temporal(h)` still applies, as a shift on the logit of `P`:

```
L(h) = ln( P(h) / (1 - P(h)) ) + Theta_temporal(h)
```

`L(h)` is the same ranking signal HISTORY §2 defined, now a read-out of the opinion instead of the primitive it is built from. The tournament, the review-band cutoff, and every other consumer of `L(h)` or `tau` keeps working.

**Worked example, opinion form.** TIMELINE §4's Catalhoyuk example: farmers carry `L_prior = 2.5`, `a = sigmoid(2.5) = 0.924`; aliens carry `L_prior = -6.5`, `a = 0.0015`. Pooling the three evidence items (`S_+ = 6.186` for farmers, `S_- = 6.186` for aliens):

```
farmers: r=6.186, s=0   -> b=0.756, d=0.000, u=0.244, P = 0.756 + 0.924*0.244 = 0.982
aliens:  r=0, s=6.186   -> b=0.000, d=0.756, u=0.244, P = 0.000 + 0.0015*0.244 = 0.00037
```

Both land the same direction as the original `tau` values (0.9998 and 0.0000031) and stay separated, but land less extreme on each side: the opinion form keeps 24 percent of the pool as stated uncertainty, so three ordinary findings move the mainstream reading to 98 percent instead of four nines, and the exotic reading to four parts in ten thousand instead of three parts in a million. The evidence is unchanged; what changed is that the model now states how much of its confidence rests on the prior against how much rests on what was found.

## 3. Source Dependence

Grouping evidence by `provenance.asserted_by` counts two texts as independent the moment two different people are listed as having asserted them, even when one copied the other. Model every source as a node in a stemma, the dependency graph philology already uses for manuscript traditions, with a directed edge `copies_from` or `shares_archetype_with` and a copy-confidence weight in `[0,1]`, built from textual overlap, a citation chain recorded in `provenance`, or an explicit `derived_by.source_node` pointer left by an LLM extraction that quotes or paraphrases another claim's source.

Prune edges below a threshold `theta` (default 0.6), then count connected components:

```
n_eff = |components(stemma_graph, prune_below=theta)|
```

`n_eff` replaces raw `n` everywhere `D(n)` appears in HISTORY §2 and TIMELINE §4. Within one component, keep the best-tier member at full weight and discount the rest by a small factor `gamma` (default 0.1), since a second copy of the same archetype lowers transcription-error risk without adding an independent line of testimony:

```
component_weight = k(tier_best) * e_best + gamma * sum(other members) k(tier_i) * e_i
```

**LLM-extracted claims.** When two evidence entries share a `derived_by.source_node`, or one's `locator` is a near-duplicate of another's `quote`, collapse them into one stemma node before clustering, regardless of what `provenance.asserted_by` says. An LLM that reads one source twice under two extraction runs is one witness.

## 4. Preservation and Detectability

An absence of evidence is data only when evidence would likely have survived and been found. Add a detectability term:

```
delta(period, medium, region) = P(evidence of h observed | h true, period, medium, region)
```

read from a table keyed by period, medium (clay tablet, stone inscription, oral tradition, papyrus, and the rest of the evidence kinds in TIMELINE §4), and region. High `delta` marks a well-excavated, well-preserved, literate context; low `delta` marks a preliterate, unexcavated, or destroyed-archive one.

Absence contributes as refuting evidence scaled by `delta` in place of a flat tier:

```
e_absence = delta(period, medium, region) * e_raw_absence
```

As `delta` approaches 0, absence stops counting; as `delta` approaches 1, it counts in full, recovering HISTORY §5's original treatment as the high-detectability limit. Evidence of absence only counts when detectability is high. A positive find in a low-`delta` context is the rarer event, so a critic can weight it up by the same `delta` on the corroboration side, at review rather than by default.

The table lives at `tools/hypothesis-engine/detectability.json`, versioned and recalibrated on the schedule HISTORY §6 already sets for the truth-score constants, since detectability is itself a claim about the corpus that new excavation or archive access can revise.

## 5. Known Unknowns as Gap Nodes

A gap is a first-class node for something the corpus has not yet looked at: an unexcavated site, an untranslated text, an undated stratum, an unread archive. Each names the hypotheses it would move and an expected value of information:

```jsonc
{
  "id": "gap-untranslated-linear-a-ht31",
  "node_type": "gap",
  "gap_type": "untranslated-text",   // unexcavated-site|untranslated-text|undated-stratum|unread-archive
  "label": "Linear A tablet HT31, Haghia Triada",
  "period_id": "per-minoan-lm1a",
  "affects": ["hyp-minoan-eruption-link", "hyp-linear-a-language-family"],
  "voi": {"expected_delta_u": 0.18, "decision_weight": 0.70, "voi_score": 0.126},
  "status": "open"
}
```

`expected_delta_u` estimates how much reading the gap would shrink `u(h)` for each affected hypothesis, since new evidence always adds to `r` or `s` and shrinks `u` by construction (§2). `decision_weight` runs higher for a hypothesis already inside the founder review band or flagged high-impact, reusing HISTORY §7's criteria. An active-learning loop ranks open gaps by `voi_score` and surfaces the top of that queue the way HISTORY §7 surfaces the top of the review queue: one ranks what to judge, the other ranks what to go look at next.

## 6. Unknown Unknowns

**(a) Open-world slots.** Every slot vocabulary carries an `OTHER` concept with a reserved probability mass, sized by a Dirichlet-process new-concept probability:

```
P(new concept in slot) = alpha / (alpha + N)
```

`N` is the count of concept instances seen so far in that slot; `alpha` is a concentration constant tuned per slot. A hypothesis can name `ACTOR: other-unnamed` and still get an address, a prior, and a place in the frontier.

**(b) Missing-mass estimation.** Run generation several times under different explore/exploit seeds or prior profiles (§6d) and treat each run's frontier as a sample. Good-Turing estimates the unseen share of the hypothesis space as `f1/N`, where `f1` is the count of hypotheses seen in exactly one run and `N` is total hypotheses observed across runs. Chao1 estimates total richness:

```
S_est = S_obs + f1^2 / (2 * f2)
```

`f2` is the count seen in exactly two runs. Apply the same estimator to evidence discovery per period, counting discovery events instead of hypotheses, to size undiscovered evidence.

**(c) Surprise tracking.** When new evidence attaches to no existing hypothesis address within threshold, at no slot-value combination the generator has materialized, log an unknown-unknown event. Track the rate, events per period divided by total evidence discovered that period, as a health metric: a rising rate says the ontology trails the evidence; a falling rate says either convergence or a generator that has stopped looking.

**(d) Prior robustness.** Score every hypothesis under four prior profiles: consensus (`L_prior` as computed today), skeptic (flat or negative priors on every non-attested extraordinary claim), fringe (elevated priors on the exotic actors and mechanisms), and uniform (`L_prior = 0` everywhere). Report the spread of `P(h)` across profiles:

```
for profile in [consensus, skeptic, fringe, uniform]:
    a_p = sigmoid(L_prior(h, profile))
    P_p = b(h) + a_p * u(h)
robustness(h) = 1 - (max(P_p) - min(P_p))
```

A hypothesis with high `robustness(h)` earns more trust than one whose rank flips depending on which prior profile scores it.

## 7. The Model Accounting for Itself

Two roles join the generator, critic, ranker, evolver, and meta-reviewer HISTORY §5 already defines. The **unknown-unknown generator** proposes only slot values outside the current vocabulary and hypotheses outside the current frame, feeding directly into §6a's open-world mass; it never scores, only proposes. The **preservation critic** asks, for every surviving hypothesis, what evidence would exist if it were true and whether that evidence could have survived to be found, reading §4's detectability table before recommending rejection, so low `delta` is what explains an absence before falsity does.

Every generation run emits a self-report: the assumptions it made, which slot vocabularies it judged incomplete, the missing-mass estimate from §6b, and a calibration score from the holdout tests HISTORY §6 already defines. The self-report is a corpus artifact, reviewable the way a hypothesis is.

The model's own trained-in sense of a period enters the system as one evidence kind, `model-prior`, at a low tier, with its own reliability tracked run over run the same way the discovery-date holdout tracks a source's calibration. It never counts as truth on its own. Hist-LLM's near-46-percent recall against a coded historical databank is the standing reason this kind starts at a low tier: a trained model's sense of a period has not yet earned the trust ground truth would carry.

Founder signals get the identical treatment. A founder yes or no is one evidence kind, folded into `r` or `s` by the same fusion as any other cluster, with its own tracked calibration: whether a founder's past verdicts predicted later independent corroboration. It updates the pooled opinion. It never overrides it.

## 8. Coverage Claim

Replace "the full set is exactly this combinatorial enumeration" with a coverage estimate that states what it does not cover. For each time bin:

```
coverage_share = hypotheses_generated_and_scored(bin) / S_est(bin)
```

`S_est(bin)` is the Chao1 richness estimate from §6b for that bin's evidence clusters. Chao1 carries an analytic variance, so the report is an interval:

```
coverage_share, ci_low, ci_high, missing_mass_estimate
```

alongside every bin in TIMELINE §5's per-bin view. A bin with a narrow, high coverage interval has been looked at closely; a bin with a wide, low one has not, and the gap-node queue in §5 is where that difference becomes something to go do.

## 9. Beads

These extend HISTORY §8 and TIMELINE §6's lists. `bkt-hte-opinion-model` supersedes `bkt-hte-truth-score` and `bkt-hte-kind-truth-score`; the rest are additions.

1. **bkt-hte-opinion-model**: Replace the sigmoid truth score with a subjective-logic opinion `(b, d, u, a)` and keep `L(h)` as its projected-probability read-out.
2. **bkt-hte-stemma-dependence**: Build the source dependency graph and the `n_eff` discount, collapsing LLM-extracted claims that cite one underlying source.
3. **bkt-hte-detectability-table**: Build the per-period, per-medium, per-region detectability table and scale absence evidence by it.
4. **bkt-hte-gap-nodes**: Add the gap node type and the value-of-information-ranked active-learning queue.
5. **bkt-hte-open-world-slots**: Add an `OTHER` concept to every slot vocabulary with Dirichlet-process new-concept probability mass.
6. **bkt-hte-missing-mass**: Build Good-Turing and Chao1 estimators over repeated generation runs and evidence discovery, feeding the coverage interval.
7. **bkt-hte-surprise-and-robustness**: Build the unknown-unknown surprise-rate tracker and the multi-prior-profile robustness score.
8. **bkt-hte-self-accounting**: Add the unknown-unknown generator role, the preservation critic role, the per-run self-report, and the `model-prior` and founder evidence kinds with tracked reliability.
