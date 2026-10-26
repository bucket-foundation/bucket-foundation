# Placement Standards

Research for bead bkt-dnou9. Polingual placement today walks corpus tiers with multiple-choice word recognition and, after one pass, marks every lower-tier word as known. The sources below set the bar a placement test has to meet.

## CEFR Levels

The Common European Framework of Reference defines six levels, A1 to C2, through can-do descriptors. The 2020 Companion Volume adds mediation scales, a Pre-A1 band and plus levels such as A2+ and B1+.

- Global scale, Table 1: https://www.coe.int/en/web/common-european-framework-reference-languages/table-1-cefr-3.3-common-reference-levels-global-scale
- Companion Volume, 2020: https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4
- Self-assessment grid: https://rm.coe.int/CoERMPublicCommonSearchServices/DisplayDCTMContent?documentId=090000168045bb52

What placement takes from the framework:

| Level | Can-do summary from the global scale | What a test item has to show |
|---|---|---|
| A1 | Understands and uses familiar everyday expressions and basic phrases | Recognize and produce high-frequency words and set phrases |
| A2 | Understands sentences and frequent expressions on immediate needs | Fill a word into a short sentence, read a short sentence, basic grammar forms |
| B1 | Understands the main points of clear standard input on familiar matters | Produce words without options, past-tense forms, read longer sentences |
| B2 | Understands the main ideas of complex text, interacts with fluency | Produce low-frequency words, read sentences with rare words, handle grammar without options |

The descriptors cover skills: listening, reading, spoken interaction, spoken production, writing. A level is a profile across skills. A test that only checks word recognition measures one slice of reading.

## Level Exams

| Exam | Language | How it places | Pass rule |
|---|---|---|---|
| DELE | Spanish | One exam per level, A1 to C2. Candidate picks the level | Two groups of skills, 30 of 50 points needed in each group. https://examenes.cervantes.es/en/dele/que-es |
| Goethe-Zertifikat | German | One exam per level. Free online Einstufungstest suggests a level first | 60 percent per module on the modular exams. https://www.goethe.de/en/spr/prf.html and https://www.goethe.de/en/spr/kup/tsd.html |
| DELF and DALF | French | One exam per level, four skills scored out of 25 each | 50 of 100 overall with at least 5 of 25 in every skill. https://www.france-education-international.fr/en/delf-dalf |
| Duolingo English Test | English | Computer-adaptive, mixed item types: read and select, fill in the blanks, listen and type, read aloud, writing and speaking samples | Scores 10 to 160 with a published CEFR concordance. https://englishtest.duolingo.com/research and the technical manual https://duolingo-papers.s3.amazonaws.com/other/det-technical-manual-current.pdf |

Common rules across the four:

1. A level is earned per level. Passing B1 says nothing on its own about C1, and a B1 exam includes A-level content by design.
2. Every skill is checked, and the pass rule sets a floor per skill or skill group. Strength in one skill does not cover a gap in another.
3. Pass marks sit at 50 to 60 percent of a long test, around 40 to 60 items or tasks per skill group. A short adaptive test needs a higher per-item bar to reach the same confidence.
4. The Duolingo English Test mixes receptive and productive items in one adaptive session. Its C-test "fill in the blanks" and "listen and type" items carry most of the vocabulary and listening signal.

## Adaptive Stop Rules

A placement is a classification problem: is this learner at or above level X. Computerized classification testing has two standard stop rules.

- **SPRT**, Wald's sequential probability ratio test, applied to mastery testing by Reckase (1983) and Spray and Reckase (1996): keep asking until the likelihood ratio between "above the cut" and "below the cut" crosses a bound set by the allowed error rates. https://doi.org/10.3102/10769986021004405
- **Eggen (1999)** combines SPRT with item selection at the cut score. https://doi.org/10.1177/01466219922031365
- **Confidence-interval rule** under IRT: stop when the ability estimate's interval sits wholly above or below the cut (Kingsbury and Weiss, 1983). Overview in Thompson, "A Practitioner's Guide for Variable-length Computerized Classification Testing", PARE 12(1), 2007: https://doi.org/10.7275/fq3r-zz60

Without calibrated item parameters, an IRT model has nothing to estimate from. A binomial SPRT works with an assumed pass rate per band: p0 = 0.5 (guessing on four options plus partial knowledge) against p1 = 0.85 (a learner at the level). With alpha = beta = 0.1, each right answer adds ln(0.85/0.5) = 0.53 to the log ratio and each wrong one adds ln(0.15/0.5) = -1.20, against bounds of plus or minus 2.20. Five straight right passes and two straight wrong fails. Polingual items have no calibration data yet, so the build uses a fixed-cap form of the same rule: 6 right before 3 wrong, at most 8 items per band. 6 right with 2 wrong gives a log ratio of 0.78, short of the bound, so the cap trades some certainty for a test that ends in at most 32 items. The typed-recall requirement per band and the two-band rule for skipping words cover that gap.

## Vocabulary Size Tests

| Test | What it measures | Link |
|---|---|---|
| Nation and Beglar Vocabulary Size Test | Meaning recognition sampled from 1,000-word frequency bands; score times 100 estimates word families known | https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/vocabulary-tests |
| LexTALE | 60-item lexical decision, words versus pseudowords; English, Dutch, German versions | https://doi.org/10.3758/s13428-011-0146-0 and https://www.lextale.com |
| X-Lex and Y-Lex | Yes/no checklists over 5,000 frequency-ranked words with pseudoword controls | Meara and Milton, 2003 |

Published CEFR mappings:

- LexTALE: 80 to 100 percent matches upper and lower advanced (C1 and C2), 60 to 80 percent upper intermediate (B2), below 59 percent lower intermediate and below. Lemhöfer and Broersma (2012), table 4.
- Milton (2010) with X-Lex for French and Greek: A1 under 1,500 words, A2 1,500 to 2,500, B1 2,750 to 3,250, B2 3,250 to 3,750, C1 3,750 to 4,500, C2 4,500 to 5,000. https://eurosla.org/monographs/EM01/211-232Milton.pdf
- CEFR-tagged word lists exist for some languages: English Vocabulary Profile (https://www.englishprofile.org/wordlists) and the Kelly lists for nine languages including Italian, Swedish, Russian, Polish, Greek, Arabic and Chinese (https://doi.org/10.1007/s10579-013-9251-2).

Two lessons. Frequency bands are the input both tests sample from. A recognition yes or no checks breadth, and recall tests run 20 to 40 percent lower than recognition scores for the same learner (Laufer and Goldstein, 2004, https://doi.org/10.1111/j.0023-8333.2004.00260.x), so a placement that only uses recognition places learners too high.

## What This Means For Polingual

The Polingual corpus holds 244 word atoms in category tiers 0 to 10, phrases on tiers 1 to 8, gender and conjugation items, and 8,695 pool sentences tagged with a length and frequency level 1 to 3. By Milton's numbers, 244 words sit well inside A1 vocabulary size. No item carries a CEFR tag.

Consequences for the build:

- The corpus can check A1 and A2 content with some confidence. B1 and B2 bands can only be proxies built from the hardest tiers, past-tense grammar and level 2 and 3 sentences. The test reports them as proxy levels, and the doc marks every band mapping as unvalidated.
- Each band uses mixed items: recognition, typed recall, listening, cloze, a grammar form, a short reading item. Recall and listening carry most of the weight, as in the Duolingo English Test.
- A band passes on 6 right before 3 wrong, out of at most 8 items, with at least one typed recall right. A band the corpus cannot fill with 8 items for a language stops the test, and the level above it reports as unknown.
- Cards are placed only for words the learner answered right. Words skip the new-word queue only when the learner passed two bands above them.

## Unknown CEFR Mappings

| Item | Status |
|---|---|
| Corpus tier to CEFR band | Proxy. Tiers order categories by frequency. No CEFR source tags them |
| Pool sentence level to CEFR | Proxy. Level comes from token count and a frequency-rank cut, `learning/app/build-lang-layers.mjs` `levelOf` |
| Latin, Ancient Greek, Sanskrit | No CEFR exams exist. Bands report but carry no CEFR claim |
| Languages with fewer than 8 usable items in a band | The band is skipped and the level above it reports as unknown |
| C1 and C2 | Out of reach of this corpus. Not offered |

Follow-up data work that would replace proxies with sourced mappings: import the Kelly lists for it, sv, ru, pl, el, ar, zh and the English Vocabulary Profile, then tag `lang-core` atoms with a CEFR level per language.
