# Polingual Roots

A node names an idea in English. The same idea has a word in Hebrew, Arabic, Chinese, Sanskrit, Latin and thirty more languages, and each of those words means something in its own language and grew from a root that meant something before it. The node page shows them under "in other languages": the word in its script, its romanization, what it means there, its root and the root's meaning, verses of the Quran that carry an Arabic word, and verses of the Hebrew Bible that carry a Hebrew word's root.

Founder direction, 2026-09-22. Beads: "Polingual on the node: meanings in each language, roots, and root texts in their original languages" and "Medallion layers for Research OS data: bronze raw, silver parsed, gold graph" in `BEADS-PENDING.jsonl`.

## Layers

**Bronze.** `_intake/photons/kaikki-cache/*.jsonl`, the Wiktextract dumps from Kaikki.org for 35 languages, 18 GB. Wiktionary content under CC BY-SA 4.0.

**Silver.** `_intake/photons/roots.sqlite`, built by `scripts/photon/roots_extract.py` (stdlib, streaming, resumable by byte offset per file). Tables:

| Table | Rows | Holds |
|---|---|---|
| `word` | 7,473,519 | lang, word, pos, etymology number, first gloss, romanization, IPA, sense glosses |
| `etym` | 5,914,721 | each word's line of descent, nearest ancestor first, from inh/der/bor templates, the etymology tree inside `etymon`, affix templates, and form-of senses |
| `root` | 18,086 | a root and its meaning: Hebrew root pages, Sanskrit roots, Han components, and proto-language roots glossed in a template |
| `word_root` | 124,999 | word to root: Hebrew and Arabic triliteral roots, Sanskrit roots, Han components, and the deepest proto-language ancestor |
| `translation` | 3,497,115 | English word, sense, target language, word, romanization, from top-level and per-sense translation tables |
| `text_gloss` | 374,193 | a form and the gloss the etymology prose gives it, such as `*lewk-` "to shine" |

The other silver copies are `_intake/photons/index.sqlite` (209k photons) and the local `bucket-pgvector` table `photons_full` (6.5M rows with LaBSE vectors).

**Gold.** `graph.node_words` in the Research OS database, migration `supabase/migrations/20260922230000_research_os_node_words.sql`. One row per node and language: word, confidence, romanization, gloss, root language, root form, root gloss, the descent as `chain` jsonb, `root_texts` jsonb, the English term and sense it came through, and `source`, the CC BY-SA attribution. RLS reads it through the node's visibility; the service role reads it for the app.

## Matching

`scripts/research-os/node_words.py` takes each public concept, law and derivation node, reads a head term from its title (the whole phrase first, then the head noun, skipping generic words such as law and theorem, and skipping titles that are a person's name), and finds it in `translation` with at least three languages. It ranks the English senses by science topic, overlap with the node's title and summary, and how many languages translate the sense, then takes each language's first word in the best sense.

For each word it resolves the dictionary entry (diacritics and macrons stripped), walks the etymology across languages up to five hops, and picks the root: a Hebrew or Arabic triliteral root (it stays first in the descent when a glossed proto-Semitic root is chosen instead), a Sanskrit root, the deepest glossed proto-language root, the Han characters with their meanings, or the deepest ancestor in another language. For Arabic it strips the word to its consonantal skeleton and counts Quran verses in `_intake/sacred-history-corpus/work/tanzil-quran-simple.txt` that contain it after a clitic prefix (al-, wa-, fa-, bi-, li-) and, for skeletons of four letters or more, a pronoun or plural suffix, with up to three verses quoted verbatim from Tanzil. Homographs share a skeleton, so a count covers every word spelled that way. The ctext files hold structure only, so Chinese has no root-text lines yet.

## Confidence

Each row carries a confidence from 0 to 1, the lower of two scores. The sense score says how clear the English sense was: 1 for a single sense, 0.95 when the winning sense matches the node's branch and the runner-up does not, 0.85 or 0.7 by margin, 0.5 for a near tie, 0.3 when a sense matching the branch lost. A word taken from a lower-ranked sense keeps 0.8 of it. The entry score says which dictionary entry the word is: 1 when the headword has one etymology, 0.85 when the English term and sense words match one etymology's glosses and no other, 0.4 when two etymologies tie. Roots and descent come from the chosen etymology alone.

The page hides rows below 0.5 and marks rows from 0.5 to 0.75 "uncertain match". A hand check of 25 random rows per band on 2026-09-23 found 13 of 25 right below 0.5, 20 of 24 right from 0.5 to 0.75, and 24 of 25 right at 0.75 and above. Roots v2 reran the check with two models on the same bands; `ROOTS-V2.md` has the counts and gives roots their own `root_confidence`.

## Counts

Run of 2026-09-23 over the local graph: 670 public idea nodes, 564 linked, 10,239 rows across 35 languages. 6,026 rows at 0.75 or above, 3,234 uncertain, 979 hidden; 560 nodes show at least one word outside English. Of the shown rows, 6,135 have a root, 5,513 the root's meaning, and 33 Arabic words carry Quran verses. Proto-language roots with a gloss in silver: 15,710.

## Hebrew Bible Verses

bkt-jlz2. The text is `openscriptures/morphhb` at commit `3d15126fb1ef74867fc1434be1942e837932691f`: `wlc/*.xml`, 39 books and 23,213 verses, with its `LICENSE.md`, in `_intake/oshb/wlc/`, which `.gitignore` covers. `python3 scripts/research-os/oshb_verses.py` fetches that commit when the folder is empty (`--fetch` forces it) and writes the `verse` and `lemma_verse` tables into `_intake/oshb/oshb.sqlite`.

Each `<w>` in the main text carries a lemma such as `b/7225` or `1254 a`; the prefixes and the letter drop, leaving a Strong's number, 8,632 in all. Readings in notes are left out. In the LexicalIndex every entry has a Strong's number and an `etym` chain up to its root, so a root gathers the numbers of every entry under it: 1,763 roots gather at least one. A Hebrew row whose root shows, at 0.5 or above for both the word and the root, gets the count of verses holding the root and up to 3 of them: first those holding the word's own entry, then the shortest, then canonical order, shown in canonical order. The text keeps the WLC letters, vowel points and maqaf, drops cantillation and morphhb's `/` separators, and the reference reads "Genesis 1:3". A row between 0.5 and 0.75 shows its verses under "verses for an uncertain root", since the root beside them carries the same mark and the verses are exact lemma matches. `graph.nsm_exponents` takes a `root_texts` column for the NSM page (migration `20260924050000`).

The credit is morphhb's own sentence: "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb", under CC BY 4.0, and the Westminster Leningrad Codex it rests on is in the public domain. Both pages show it for roots and verses.

Run of 2026-09-23 on the local stack. Of 356 shown Hebrew rows, 166 gain verses, 46.6%, against a go line of 20%: 41 at 0.75 or above (node_words 21, nsm_exponents 20) and 125 between 0.5 and 0.75 (91 and 34). Classical Chinese waits for a text source; the ctext files hold structure only, and bkt-61kn covers it.

## Arabic Root Meanings

bkt-61kn. The Kaikki Arabic dump has 3 root pages, so Arabic triliteral roots showed no meaning. Its verbs name their root (`ar-rootbox`, or `etymon` with `:root`) and their form (`ar-verb`), and `python3 scripts/photon/roots_extract.py --ar-root-gloss` reads them into `ar_root_gloss` in `roots.sqlite`: 1,218 roots, 911 with a Form I verb (Form Iq for quadriliteral roots). Each root takes its Form I verb, else its lowest derived form. The first gloss that does not open with "form", "verbal noun of", "alternative form" or a participle label loses its parentheticals, cuts at the first semicolon, keeps two comma items and caps at 60 characters: ك ت ب reads "to mark on a surface, to write". Hamza seats fold to one letter for matching. A root with no gloss, or with the placeholder "?", takes it.

The root keeps its own confidence. A Form I gloss takes the root's confidence. A derived-form gloss enters at `min(root_confidence, 0.7)` and shows on the row as "meaning from Form II" (or its form). "Uncertain root" keeps its one meaning, doubt about the root. `root_gloss_form` and `root_gloss_confidence` sit on `graph.node_words` and `graph.nsm_exponents` (migration `20260924070000`). A gloss below 0.5 is withheld while its root stays. Lane's Lexicon waits for a digitization with published terms. The Quranic Arabic Corpus is GPL v3 and carries no root meanings, so it is left out. Credit is the Wiktionary via Kaikki.org line already on the page.

Run of 2026-09-23 on the local stack. Of 317 shown Arabic rows (node_words 233, nsm_exponents 84), 76 gain a root meaning, 24.0%, against a go line of 20%: 62 from Form I (42 and 20) and 14 from derived forms (4 and 10). Form I alone would reach 19.6%, a no-go. Sonnet and Opus judged 30 glosses drawn with seed `arabic-root-gloss`, 10 of them from derived forms: both called 27 a fit, 20 of 20 from Form I and 7 of 10 from derived forms (`learning/research-os/arabic-gloss-labels.csv`; `scripts/research-os/arabic_gloss_sample.py`). The founder's check of the same 30 is still to come. Chinese root texts wait for a text source, since the ctext files hold structure only, and stay on the bead.

## Rerun

```bash
python3 scripts/photon/roots_extract.py                      # bronze to silver, resumes where it stopped
python3 scripts/photon/roots_extract.py --counts             # print per-language counts
python3 scripts/research-os/oshb_verses.py                   # fetch the pinned morphhb text if missing, write verse silver
python3 scripts/photon/roots_extract.py --ar-root-gloss      # Arabic root meanings from verbs
python3 scripts/research-os/node_words.py --dry-run          # match and report, no writes
python3 scripts/research-os/node_words.py                    # replace this source's rows in graph.node_words
npm run test:polingual-roots
```

`node_words.py` reads the database URL from `NODE_WORDS_DB_URL`, default the local stack on port 54322, and writes through `psql`. Apply the migration alone with `psql "$DB_URL" -1 -f supabase/migrations/20260922230000_research_os_node_words.sql`.

UI: `src/app/research-os/(app)/n/WordsSection.tsx`, fed by `GET /api/research-os/words?id=<node id>`, which authorizes the node for view and reads `graph.node_words` through `pagedRead`.
