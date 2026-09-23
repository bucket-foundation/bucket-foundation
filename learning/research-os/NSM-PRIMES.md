# NSM Semantic Primes

The Natural Semantic Metalanguage program lists 65 meanings that every language studied can express and that resist definition in simpler words. `/research-os/nsm` shows each of them by category with its exponents in the 35 Polingual languages: the word in its script, its romanization, the Wiktionary sense it was taken from, its root and the root's meaning. Science primes (`PRIMES.md`) link to this layer in ros-nsm 2.

Bead: "ros-nsm 1: NSM semantic primes as the cross-lingual bottom layer" in `BEADS-PENDING.jsonl`, founder 2026-09-22.

## Layers

**Seed.** `supabase/seed/nsm-primes.json`: the 65 primes of Goddard and Wierzbicka 2014, *Words and Meanings*, Table 2.1, with their 16 categories, the English exponents and allolexes, and for each prime the Wiktionary lookup: an English word, a part of speech and a pattern for the sense. The list is the 2014 one, so possession reads BE (SOMEONE)'S and TOUCH sits with actions, events and movement. Later charts replaced BE (SOMEONE)'S with (IS) MINE and moved TOUCH to space; the seed records both changes. The book's table sits behind a paywall and was not read for this build. The list was checked against the NSM English chart v20 of May 2022, the reproduction in Mateo Mendaza 2020 (*Journal of English Studies* 18), and the account of the 2014 change of HAVE to BE SOMEONE'S in Wierzbicka 2021 (*Russian Journal of Linguistics*).

**Silver.** `_intake/photons/roots.sqlite` from ros-polingual-roots, table `translation` (3,497,115 rows).

**Gold.** `graph.nsm_primes` and `graph.nsm_exponents`, migration `supabase/migrations/20260923010000_research_os_nsm_primes.sql`. RLS is on with a select policy for anon and authenticated and no write policy, so only the service-role loader writes. The `graph` schema stays outside PostgREST, and the app reads through the service role.

## Matching

`scripts/research-os/nsm_exponents.py` reads the `translation` rows for each prime's English word and part of speech, groups them by sense text (the dump uses -1 as a sense index sentinel, so the index is ignored), and takes the sense whose text matches the seed's pattern, the widest such sense when several match. With no match it takes the sense most languages translate and marks it `sense_match = false`. Each language keeps its first two words in that sense, and roots come from node_words' resolver.

Every row carries a `confidence`: 0.6 when the pattern matched, 0.4 on a fallback sense or a stand-in lookup, 0.2 on a fallback sense fewer than 10 languages translate. The API and the page show rows at `MIN_CONFIDENCE` (0.5, `src/lib/research-os/nsm.ts`) or above. `?unconfirmed=1` adds the rest, and the page labels each of them unconfirmed.

Two primes use a stand-in lookup and load at 0.4: BE (SOMEONE)'S reads the translations of the pronoun *mine*, and FOR SOME TIME reads the noun *while*. Three primes have no Wiktionary entry to read and no exponents: DON'T WANT, A LONG TIME and A SHORT TIME.

## Counts

Run of 2026-09-23 on the local stack: 65 primes, 62 with exponents, 2,663 rows across 35 languages, 2,592 at 0.6 and 71 at 0.4, 1,997 with a root and 1,542 with the root's meaning. Each of the 62 seed patterns found its sense.

## Spot-check

`scripts/research-os/nsm_spotcheck.py` compares the first exponent per prime with a published chart, counting a match when the word equals the chart's exponent or an allolex after case, parentheses, and a leading article or trailing preposition are set aside. Charts are transcribed in `supabase/seed/nsm-chart-exponents.json`. Charts later than 2014 map BE (SOMEONE)'S to their possession prime.

| Language | Chart | n | Match | No exponent | Miss |
|---|---|---|---|---|---|
| French | Junker and Goddard, v.2, March 2015 | 65 | 51 | 3 | 11 |
| Italian | Farese 2015 | 65 | 52 | 3 | 10 |
| Czech | Pavlásková, v1, October 2022 | 65 | 43 | 7 | 15 |

Misses by category, French: quantifiers 2 (*quelque*, *tous les*), evaluators 2 (*bon*, *mauvais* for BIEN, MAL), speech 1 (*mot* for MOTS), relational substantives 1 (*genre* for TYPE), actions 1 (*se mouvoir* for BOUGER), location and possession 2, time 1, space 1. Italian: quantifiers 3 (*molti*, *poco*, *alcuno*), speech 1 (*parola* for PAROLE), location and possession 2, time 2 (*seguente* for DOPO, *periodo*), space 1 (*lato*), augmentor 1 (*più* for (DI~IN) PIÙ). Czech: substantives 1 (*lid*), relational substantives 1, determiners 1 (*tentýž*), mental predicates 1 (*přemýšlet*), speech 1 (*pravdivý*), location and possession 1, life and death 1 (*umírat*, the imperfective), time 2, space 3 (*daleký*, *blízký*, *strana*), logical concepts 3 (*ne-*, *asi*, *moci*). Several misses differ from the chart by inflection or aspect only (*mot*, *parola*, *umírat*, *moci*), and the table counts them as misses.

Spanish, Russian, Mandarin and Polish were not checked: `nsm-approach.net/resources` listed no chart for them on 2026-09-23, and the 2014 book is paywalled. No claim is made for any language outside the three in the table.

## Limits

Roots come from node_words' resolver unchanged, and its phrase split can pick a wrong root for a multiword exponent: French *le mien* resolves through *mien* to Latin *meum*, glossed as a plant. The words come from English Wiktionary translation tables, so an exponent is the translators' word for an English sense and can differ from the word an NSM chart chose.

## Rerun

```bash
psql "$DB_URL" -1 -f supabase/migrations/20260923010000_research_os_nsm_primes.sql
python3 scripts/research-os/nsm_exponents.py            # dry run, prints counts
python3 scripts/research-os/nsm_exponents.py --apply    # replaces each prime's rows in its own transaction
python3 scripts/research-os/nsm_spotcheck.py
npm run test:nsm-exponents
```

The loader reads the database URL from `NODE_WORDS_DB_URL`, default the local stack on port 54322. API: `GET /api/research-os/nsm`, optional `?lang=` and `?unconfirmed=1`.
