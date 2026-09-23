# NSM Semantic Primes

The Natural Semantic Metalanguage program lists 65 meanings that every language studied can express and that resist definition in simpler words. `/research-os/nsm` shows each of them by category with its exponents in the 35 Polingual languages: the word in its script, its romanization, the Wiktionary sense it was taken from, its root and the root's meaning. Science primes (`PRIMES.md`) link to this layer in ros-nsm 2.

Bead: "ros-nsm 1: NSM semantic primes as the cross-lingual bottom layer" in `BEADS-PENDING.jsonl`, founder 2026-09-22.

## Layers

**Seed.** `supabase/seed/nsm-primes.json`: the 65 primes of Goddard and Wierzbicka 2014, *Words and Meanings*, Table 2.1, with their 16 categories, the English exponents and allolexes, and for each prime the Wiktionary lookup: an English word, a part of speech and a pattern for the sense. The list is the 2014 one, so possession reads BE (SOMEONE)'S and TOUCH sits with actions, events and movement. Later charts replaced BE (SOMEONE)'S with (IS) MINE and moved TOUCH to space; the seed records both changes. The book's table sits behind a paywall and was not read for this build. The list was checked against the NSM English chart v20 of May 2022, the reproduction in Mateo Mendaza 2020 (*Journal of English Studies* 18), and the account of the 2014 change of HAVE to BE SOMEONE'S in Wierzbicka 2021 (*Russian Journal of Linguistics*).

**Silver.** `_intake/photons/roots.sqlite` from ros-polingual-roots, table `translation` (3,497,115 rows).

**Gold.** `graph.nsm_primes` and `graph.nsm_exponents`, migration `supabase/migrations/20260923010000_research_os_nsm_primes.sql`. RLS is on with a select policy for anon and authenticated and no write policy, so only the service-role loader writes. The `graph` schema stays outside PostgREST, and the app reads through the service role.

## Matching

`scripts/research-os/nsm_exponents.py` reads the `translation` rows for each prime's English word and part of speech, groups them by sense text (the dump uses -1 as a sense index sentinel, so the index is ignored), and takes the sense whose text matches the seed's pattern, the widest such sense when several match. With no match it takes the sense most languages translate and marks it `sense_match = false`. Each language keeps its first two words in that sense, and roots come from node_words' resolver under the rules in Roots.

Every row carries a `confidence`, the sense score capped by node_words' score for the word's dictionary entry and etymology: 0.9 when the pattern matched, 0.6 for a stand-in lookup, 0.4 on a fallback sense, 0.2 on a fallback sense fewer than 10 languages translate. The API and the page use node_words' thresholds from `src/lib/research-os/node-words.ts`: rows below `HIDE_BELOW` (0.5) stay hidden, and rows below `UNCERTAIN_BELOW` (0.75) are marked uncertain. `?hidden=1` adds the hidden rows, and the page marks each of them unconfirmed.

Two primes use a stand-in lookup and load at 0.6, shown as uncertain: BE (SOMEONE)'S reads the translations of the pronoun *mine*, and FOR SOME TIME reads the noun *while*. Three primes have no Wiktionary entry to read and no exponents: DON'T WANT, A LONG TIME and A SHORT TIME.

## Counts

Run of 2026-09-23 on the local stack: 65 primes, 62 with exponents, 2,663 rows across 35 languages: 2,243 at 0.9, 259 at 0.85, 70 at 0.6 and 91 at 0.4 (hidden, all from a low entry score). 1,887 rows store a root, and 1,758 show one at `root_confidence` 0.5 or above, 57 of them marked uncertain. Each of the 62 seed patterns found its sense.

## Spot-check

`scripts/research-os/nsm_spotcheck.py` compares the first exponent per prime, hidden or shown, with a published chart, counting a match when the word equals the chart's exponent or an allolex after case, parentheses, and a leading article or trailing preposition are set aside. Charts are transcribed in `supabase/seed/nsm-chart-exponents.json`. Charts later than 2014 map BE (SOMEONE)'S to their possession prime.

| Language | Chart | n | Match | No exponent | Miss |
|---|---|---|---|---|---|
| French | Junker and Goddard, v.2, March 2015 | 65 | 51 | 3 | 11 |
| Italian | Farese 2015 | 65 | 52 | 3 | 10 |
| Czech | Pavlásková, v1, October 2022 | 65 | 43 | 7 | 15 |

Misses by category, French: quantifiers 2 (*quelque*, *tous les*), evaluators 2 (*bon*, *mauvais* for BIEN, MAL), speech 1 (*mot* for MOTS), relational substantives 1 (*genre* for TYPE), actions 1 (*se mouvoir* for BOUGER), location and possession 2, time 1, space 1. Italian: quantifiers 3 (*molti*, *poco*, *alcuno*), speech 1 (*parola* for PAROLE), location and possession 2, time 2 (*seguente* for DOPO, *periodo*), space 1 (*lato*), augmentor 1 (*più* for (DI~IN) PIÙ). Czech: substantives 1 (*lid*), relational substantives 1, determiners 1 (*tentýž*), mental predicates 1 (*přemýšlet*), speech 1 (*pravdivý*), location and possession 1, life and death 1 (*umírat*, the imperfective), time 2, space 3 (*daleký*, *blízký*, *strana*), logical concepts 3 (*ne-*, *asi*, *moci*). Several misses differ from the chart by inflection or aspect only (*mot*, *parola*, *umírat*, *moci*), and the table counts them as misses.

Spanish, Russian, Mandarin and Polish were not checked: `nsm-approach.net/resources` listed no chart for them on 2026-09-23, and the 2014 book is paywalled. No claim is made for any language outside the three in the table.

## Roots

node_words' resolver splits a phrase on spaces and joins the roots of its parts, and it keeps reflexives, clitics and articles as parts. For NSM exponents this failed across the board: 167 of the 2,663 exponents are phrases (*stać się*, *tous les*, *ὁ αὐτός*), and the resolver glossed the closed-class part as if it carried the meaning. The first load stored a root on 131 of 167 multiword rows and showed 122 of them at 0.85 or 0.9 with no mark, among them Polish *się* as "to get married" under HAPPEN and MOVE, Swedish *sig* as "this", French *tous les* through *toz* "dust", and Greek *ὁ αὐτός* as "again, away from".

Each row now carries a `root_confidence` apart from `confidence`, and the API and page gate the root on it with the same `HIDE_BELOW` and `UNCERTAIN_BELOW`; below `HIDE_BELOW` the API withholds the root form, language and gloss. A single-word exponent takes the resolver's score for its entry and etymology. A single word that is itself a closed-class form (*je*, *si*, *un*) is capped at 0.6 and shown as uncertain. A phrase gets a root only from its one content word after reflexives, clitics, articles and prepositions are dropped (`CLOSED_CLASS` in the loader), capped at 0.45 and hidden; a phrase with two content words gets none. After the fix 59 multiword rows store a root, and none shows by default.

## Colexification

CLICS 4 (v1.0, Tjuka, Forkel, Rzymski and List 2026, doi:10.5281/zenodo.16900179, CC BY 4.0) records which concepts a language names with one word. `scripts/research-os/clics_extract.py` reads the CLDF release unpacked under `_intake/clics4/` (kept out of git), maps 55 primes to Concepticon ids through `supabase/seed/nsm-concepticon.json` (ten have no CLICS concept), maps a variety to one of 28 of our languages through its ISO 639-3 code, and writes `_intake/clics4/nsm-clics.sqlite` and `graph.nsm_colex`. A pair counts when CLICS finds it in at least 3 language families. When the CLICS word matches the exponent shown for both primes, each of those exponents drops to 0.7, below `UNCERTAIN_BELOW`, keeps its old score in `confidence_before`, and names the other prime in `colex_with`. The page marks the word "one word with" the other prime and lists every counted merge under the prime, including those where CLICS has a word other than ours.

Run of 2026-09-23: 25 prime pairs in our languages, 18 distinct, 15 languages, all 25 with a shared CLICS form.

| Families at least | Pairs counted | Language cells counted | Pairs matching our words | Exponents made uncertain |
|---|---|---|---|---|
| 2 | 13 | 20 | 2 | 4 |
| 3 | 13 | 20 | 2 | 4 |
| 4 | 9 | 16 | 1 | 2 |

The four at 3 are Portuguese *saber* for CAN and KNOW and Finnish *koska* for BECAUSE and WHEN. The 5 pairs below 2 families are single-family merges such as English HEAR with HERE and Dutch TRUE with WHERE (*waar*), sound alike more than shared sense, and no pair in our languages has exactly 2 families. 3 is the lowest threshold that drops the single-family pairs; 4 would also drop four pairs attested in 3 families, among them Finnish BECAUSE with WHEN, which Finnish *koska* covers. Most counted merges touch a word other than the one shown, so they change no score: Japanese, Chinese and Vietnamese merge FEEL and TOUCH, and our FEEL words there are other verbs.

Rerun after `nsm_exponents.py --apply`, which rewrites the rows: `python3 scripts/research-os/clics_extract.py --apply`. A rerun restores `confidence_before` first, so it converges.

## Limits

The words come from English Wiktionary translation tables, so an exponent is the translators' word for an English sense and can differ from the word an NSM chart chose. Single-word roots still carry the resolver's homograph errors: Old English *ne* shows *\*neh₂w-* "the deceased, corpse", marked uncertain as a closed-class word. `CLOSED_CLASS` is a hand list for the 35 languages and misses forms outside it.

## Rerun

```bash
psql "$DB_URL" -1 -f supabase/migrations/20260923010000_research_os_nsm_primes.sql
python3 scripts/research-os/nsm_exponents.py            # dry run, prints counts
python3 scripts/research-os/nsm_exponents.py --apply    # replaces each prime's rows in its own transaction
python3 scripts/research-os/nsm_spotcheck.py
npm run test:nsm-exponents
```

The loader reads the database URL from `NODE_WORDS_DB_URL`, default the local stack on port 54322. API: `GET /api/research-os/nsm`, optional `?lang=` and `?hidden=1`.
