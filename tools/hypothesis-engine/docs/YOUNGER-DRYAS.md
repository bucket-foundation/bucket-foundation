# Younger Dryas Contested-Science Corpus

`hte.corpus.younger_dryas` (`--corpus younger-dryas`), the engine's first
contested-science campaign corpus: 47 open-metadata, DOI-verified papers
on the Younger Dryas boundary (12.9-11.7 ka BP) and the impact-hypothesis
debate, built with no paid access, abstracts only where Crossref's own
metadata carries one. Every number below comes from a fake-mode run
(`HTE_LLM_MODE=fake`, no `claude -p` call anywhere in the path).

## DOI verification

Every card's `doi`, `title`, `authors`, `year`, and `venue` field was
checked against `https://api.crossref.org/works/<doi>` (public, no key)
on 2026-09-11; the check and Crossref's own `is-referenced-by-count` at
check time are recorded verbatim in that card's own `doi_check`
frontmatter field. 46 candidate DOIs came from domain knowledge of the
literature, guessed rather than looked up; a 47th (Brakenridge 2011)
came from a targeted bibliographic search instead, resolving on that
first search. 31 of the 46 guesses resolved to the intended
paper on the first try. 15 did not: 6 (`moore-2017-platinum`,
`sweatman-2021-review`, `moore-2020-abu-hureyra`, `pinter-2011`,
`haile-2009`, `waters-stafford-2007`) 404'd outright; 9
(`kinzie-2014`, `napier-2010`, `holliday-meltzer-2010`, `daulton-2010`,
`scott-2010`, `tarasov-peltier-2005`, `carlson-2010`, `fiedel-2011`,
plus a second, later-caught wrong DOI on `haynes-2008`) resolved to a
real, unrelated paper at a DOI adjacent to the intended one, the more
dangerous failure mode since the record reads as valid until the
returned title is compared against the intended one. Every one of the
15 was corrected by a `query.bibliographic` search against the same
API. All 47 final DOIs resolve as of the check date; every card carries
its own resolution note.

## Corpus composition

47 cards, `side` x `kind`:

| | astronomical | geological | material | genetic | model_prior | textual | total |
|---|---|---|---|---|---|---|---|
| proponent | 6 | 6 | 1 | 0 | 0 | 1 | 14 |
| critic | 5 | 3 | 1 | 3 | 0 | 4 | 16 |
| alternative | 2 | 1 | 0 | 0 | 5 | 2 | 10 |
| neutral | 1 | 3 | 2 | 0 | 0 | 1 | 7 |
| **total** | **14** | **13** | **4** | **3** | **5** | **8** | **47** |

No card reads as `linguistic`, `oral_tradition`, or `iconographic`: none
of those three evidence modalities has a form a Younger Dryas
boundary-geology paper could take (no card here is a text corpus, an
oral record, or an image or artifact-decoration study), so this corpus's
own kind distribution covers the six kinds the domain offers rather than
every kind `hte.evidence.EvidenceKind` names.

Both sides of the founding debate are represented at comparable
weight (14 proponent, 16 critic), plus the mainstream meltwater-routing
alternative (10 cards: Broecker 1989's original proposal, Tarasov and
Peltier 2005's Arctic-routing revision, Murton and colleagues 2010's
physical confirmation of that revision, Condron and Winsor 2012's
ocean-model refinement, Liu and colleagues 2009's deglacial-warming
simulation, Renssen and colleagues 2015's multiple-causes synthesis,
Carlson 2010's review, Broecker 2006's own later self-critique, plus two
minority astrophysical alternatives, Napier 2010's Taurid-complex swarm
and Brakenridge 2011's supernova proposal) and 7 neutral ice-core and
radiocarbon chronology papers neither side disputes.

Stemma: 30 `rebuts` edges, 39 `replicates` edges, every one an explicit
curator-read edge (the card's own `rebuts:`/`replicates:` frontmatter
list), never a text-matched guess. Two multi-generation rebuttal chains
worth naming directly: nanodiamonds (Kennett and colleagues 2009 to
proponent, rebutted by Daulton and colleagues 2010 to critic, rebutted
back by Kinzie and colleagues 2014 to proponent, rebutted again by
Daulton and colleagues 2017 to critic and separately by van Hoesel and
colleagues 2014 to critic) and microspherules (Firestone and colleagues
2007 to proponent, rebutted by Surovell and colleagues 2009 to critic,
rebutted back by LeCompte and colleagues 2012 to proponent, rebutted
again by Pigati and colleagues 2012 to critic).

## Ground truth

18 `GroundTruthEvent`s, none of them a verdict on whether the impact
happened, since that is exactly the question the corpus's two sides
disagree on:

- **2 chronology anchors**: the onset (12.9 ka, Rasmussen and colleagues
  2006's own ice-core timescale) and the termination (11.7 ka,
  Steffensen and colleagues 2008's own direct dating of the
  transition's abruptness), the one fact neither side of the corpus
  disputes.
- **16 cross-card corroboration events**: two or more cards from
  independent first authors naming the same `(mechanism, object)`
  reading, with every card that is itself a rebuttal target anywhere
  else in the corpus excluded first. This tightening past `hte.corpus.
  literature`'s own method 3 is load-bearing here: without it,
  Firestone and colleagues 2007 and Kennett and colleagues 2009's own
  nanodiamond claim would both read as "independently corroborated"
  despite each still carrying an unresolved rebuttal in this same
  corpus. Surviving groups: meltglass (Bunch 2012, Moore 2020), the
  Greenland-ice-core-to-terrestrial-sediment platinum anomaly (Petaev
  2013, Moore 2017, Sweatman 2021), Paleoindian population continuity
  (Holliday and Meltzer 2010, Buchanan 2008), three independent AMOC-
  routing corroborations (Broecker 2006/Condron and Winsor 2012 on
  St. Lawrence routing, Tarasov and Peltier 2005/Murton 2010 on Arctic
  routing, Carlson 2010/Liu 2009 on AMOC shutdown generally), and the
  ice-core chronology itself (Alley 2000, Steffensen 2008, Rasmussen
  2006, Waters and Stafford 2007, Fiedel 2011).

**Known gap, carried over from `hte.corpus.literature`**: "independent
first author" is a first-author-surname check, the same simple,
false-positive-prone proxy that module's own documented "two Kuliks"
gap already accepts. This corpus's own proponent-side authors overlap
heavily (Bunch, Moore, Wittke, Kennett, and LeCompte co-author one
another's papers routinely): the meltglass corroboration this rule
credits (Bunch 2012, Moore 2020) passes the surname check while still
drawing on a shared collaborator network. A live run adding a real
coauthorship graph to this check is item 4 on the "what a live run
should test" list below.

Every `GroundTruthEvent.id` names a real `EvidenceItem.id` (`hte.
calibrate.run_holdout`'s own `ev_by_id.get(g.id)` lookup requires this;
an id with no matching evidence item holds out nothing a discovery-date
holdout could ever cover, the bug this corpus's first fake-mode run
caught before the fix landed here).

## Fake-mode numbers

`HTE_LLM_MODE=fake hte campaign run --corpus younger-dryas --seeds 2`:

| Metric | Value |
|---|---|
| Sources | 47 |
| Evidence items | 48 |
| Hypotheses generated | 2,476 |
| Survivors (critic filter) | 9 |
| Coverage (Chao1 estimate) | 2,490.4, observed 2,456 (missing mass 0.083) |
| Robustness stable fraction | 1.0 |
| Surprise rate | 0.542 |
| Target-blind rate | 0.75 (steady) |
| Calibration Brier score | 0.188 |

`HTE_LLM_MODE=fake hte calibrate --diagnose --corpus younger-dryas`
(discovery-date mode, auto-selected: 18 of 18 ground-truth events carry
a `discovery_year` distinct from their own `year`, a real discovery lag,
unlike `quantum-history`/`education-atlas`/`fixtures`, which collapse
the two):

| Metric | Value |
|---|---|
| Cutoff year | 2010 (median discovery year) |
| Held-out events | 10 |
| Covered | 3 (coverage of truth 0.300) |
| Brier score | 0.188 |
| Uncovered, slot mismatch | 7 |
| Uncovered, no placement / dropped by cap / interval mismatch | 0 each |

**Pre-existing bug found while running this**: `hte.calibrate.
_low_coverage_note`'s own explanatory paragraph is hardcoded to
`quantum-history`'s own corpus shape (its own "IBM Quantum, Feynman and
Deutsch, Peter Shor" example names and its own "16 cards" count print
verbatim into `younger-dryas`'s own `CALIBRATION.md`). Filed as a
follow-up; out of scope for this corpus's own package (`hte/calibrate.py`
is shared code this task's own brief does not touch).

## Prior-profile robustness: the impact hypothesis versus meltwater routing

`hte.unknowns.prior_profiles`/`robustness` over the top 10 survivors by
tournament elo, fake mode, `--seeds 2`. The two actors the brief asks
about, side by side:

| Actor | Consensus status | Elo (best) | Consensus floor | Skeptic floor | Fringe ceiling | Uniform |
|---|---|---|---|---|---|---|
| `meltwater-pulse` | consensus | 2,580 | 0.941 | 0.941 | 0.941 | 0.751 |
| `cosmic-impact` | contested | 1,625 | 0.562 | 0.562 | 0.751 | 0.751 |
| `taurid-complex-swarm` | fringe | 1,513 | 0.504 | 0.502 | 1.000 | 0.751 |
| `supernova-event` | fringe | 1,504 | 0.503 | 0.502 | 1.000 | 0.751 |

The pattern the vocabulary was built to produce shows up directly in
these numbers. `meltwater-pulse`'s own credence floor stays at 0.941
under both the consensus and the skeptic profile (a `CONSENSUS` concept
never moves under either shift) and ranks first by elo. `cosmic-impact`'s
own floor sits lower, at 0.562, under both profiles too, exactly the
reading `ConsensusStatus.CONTESTED` is built to carry, a real contender
science still takes seriously (`hte.unknowns._shift`'s own skeptic branch
clamps a contested value at its own ceiling of `0.0` log-odds rather
than pushing it further negative the way it pushes a fringe value down
by 2.0). The two fringe actors, `taurid-complex-swarm` and
`supernova-event`, sit at the same low floor (about 0.50) under
consensus and skeptic, then swing to a fringe-profile ceiling of near
1.0, a 0.50-point swing `cosmic-impact` never shows (its own fringe
projection tops out at 0.751, the same value `uniform` gives it,
because a contested concept's own fringe shift, `v + 1.0`, lands `-1.0`
back at exactly `0.0` log-odds for this corpus's own chosen prior). That
gap, a real contender's credence staying inside a narrow band across
every profile a skeptic or a true believer might hold, against an
exotic actor's credence swinging from a coin flip to near-certainty
depending on which profile scores it, is this corpus's own quantitative
answer to "distinguishable from the exotic ones."

**What a live run (a real `claude -p` pass, fake mode turned off) should
test**, in order:
1. Whether `meltwater-pulse`'s consensus/skeptic floor and `cosmic-
   impact`'s own lower floor hold at this same rough gap once a real
   generator proposes hypotheses from the corpus's own 48 evidence
   items, rather than fake mode's own scripted proposals.
2. Whether the two fringe actors' own consensus/skeptic floor and
   fringe-profile ceiling hold at comparable magnitude, confirming the
   vocabulary's own contested-versus-fringe separation survives a real
   pass.
3. Coverage of truth under discovery-date holdout past this corpus's
   own fake-mode 0.300: a real generator's own richer hypothesis
   population might place more of the 7 slot-mismatched events, or
   might not, which is itself the finding worth having.
4. The coauthorship-network gap above, on the meltglass and platinum-
   anomaly corroboration groups, the two most likely to flip if a
   coauthorship-aware independence check replaces the surname proxy.

## Reproduce

```bash
cd tools/hypothesis-engine
HTE_LLM_MODE=fake python3 -m hte.cli campaign run --corpus younger-dryas --seeds 2 --out runs
HTE_LLM_MODE=fake python3 -m hte.cli calibrate --diagnose --corpus younger-dryas --out runs/_calibration
```
