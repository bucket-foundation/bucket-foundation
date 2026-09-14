Sacred-History Primary Texts
=============================

`hte.corpus.sacred_history_texts` (`hte/corpus/sacred_history_texts.py`)
reads the primary texts this repo already mirrors under `gutenberg/` and
`archive/` for 6 of `sacred-history`'s 13 traditions, splits each one into
passages, and runs every passage through `hte.roles.extract`'s
three-pass extractor ensemble. This doc is that module's own inventory:
which file maps to which tradition, what the mirror carries nothing for,
and what a real (non-fake) run over the whole inventory would cost.

## Inventory

Every row below is a real `.txt` file on disk carrying body prose, one
`TEXT_RECORDS` entry each (`hte/corpus/sacred_history_texts.py`). Word
count is `wc -w` on the raw file (Project Gutenberg's own license
boilerplate included, negligible against every file's own length here);
passage count is `split_passages()` run against the real file, its own
paragraph-block splitting rule (below).

| Text | Path | Tradition | Language | Edition | Words | Passages |
|---|---|---|---|---|---|---|
| The Bible: King James Version | `gutenberg/PG-10-the-king-james-version-of-the-bible/PG-10.txt` | christianity | en | 1611 | 824,543 | 24,485 |
| Legends of Old Testament Characters, from the Talmud and Other Sources (Baring-Gould) | `gutenberg/PG-72268-legends-of-old-testament-characters-from-the-talmud-and-other-sources/PG-72268.txt` | judaism | en | 1871 | 153,248 | 2,855 |
| The Analects, The Chinese Classics vol. 1 (Legge) | `gutenberg/PG-3330-the-analects-of-confucius-from-the-chinese-classics/PG-3330.txt` | tao-confucian | en | 1861/1893 | 32,368 | 221 |
| The Dhammapada, Sacred Books of the East vol. 10 (Müller) | `gutenberg/PG-2017-dhammapada-a-collection-of-verses-being-one-of-the-canonical-books-of-/PG-2017.txt` | buddhism | en | 1881 | 15,247 | 418 |
| Bhagavadgita: Des Erhabenen Sang (von Schroeder) | `gutenberg/PG-33186-bhagavadgita-des-erhabenen-sang-religi-se-stimmen-der-v-lker-die-relig/PG-33186.txt` | hinduism | de | 1912 | 29,912 | 281 |
| Ramayana (Buck retelling) | `archive/Ramayana_201808/Ramayana_djvu.txt` | hinduism | en | 1976 | 142,774 | 3,215 |
| The Complete Mahabharata | `archive/the-complete-mahabharata/The Complete Mahabharata _djvu.txt` | hinduism | en | edition year not recorded | 2,021,534 | 39,284 |
| The Book of Mormon | `gutenberg/PG-17-the-book-of-mormon-b-an-account-written-by-the-hand-of-mormon-upon-pla/PG-17.txt` | lds | en | 1830 | 278,840 | 6,587 |
| **Total** | | 6 traditions | | | **3,498,466** | **77,346** |

The KJV Bible carries both the Tanakh's own books (Genesis through
Malachi) and the New Testament in one file; this inventory maps the
whole edition to `christianity` (the edition itself is a Christian
translation) rather than splitting it book-by-book onto `judaism` and
`christianity` separately. Judaism's own coverage comes from the Talmud
legends instead, a real, separate commentary text naming the same
figures (Noah, Abraham, Moses). A future pass that wants Judaism's own
Torah content tagged apart from the KJV's New Testament books would need
a per-book tradition override this module does not build.

The Mahabharata edition (`archive/the-complete-mahabharata`, credited to
"Swamijii" in this repo's own mirrored metadata) carries no edition year
in that metadata; `TEXT_RECORDS`' own `edition_year` reads `None` for it
rather than a guessed date.

## Excluded Texts

Every path below (stub pages, duplicate excerpts, and off-corpus texts)
was checked and excluded, with the reason a future pass should know
before re-adding it.

| Path | Why excluded |
|---|---|
| `wikisource/analects`, `wikisource/the-chinese-classics-volume-1-confucian-analects`, `wikisource/tao-te-ching`, `wikisource/diamond-sutra`, `wikisource/heart-sutra`, `wikisource/the-bhagavad-gita-arnold-translation`, `wikisource/the-glories-of-the-bhagavad-gita-telang-translation`, `wikisource/the-hymns-of-the-rigveda`, `wikisource/the-rigveda`, `wikisource/sacred-books-of-the-east-volume-1-introduction-to-the-upanishads`, `wikisource/quran-progressive-muslims-organization` | Each one's own mirrored `page.txt` is a work-level Wikisource stub: a translation list or a chapter/book index (`{{header}}` transclusion markup, a bare table of contents), never the verse or paragraph text itself. `wikisource/quran-progressive-muslims-organization` is this list's own most consequential entry: despite the directory name, its `page.txt` carries only a 114-chapter index, no verse text at all, so Islam has no usable primary text in this repo's own mirror. |
| `wikisource/bible-king-james-obadiah` | Real KJV verse text (21 verses), but a single-book excerpt of the same edition `gutenberg/PG-10` already carries in full; not double-counted here. |
| `wikisource/a-chinese-biographical-dictionary-f-ng-tao` | A Herbert Giles biographical-dictionary entry on a 10th-century Chinese chancellor named Fêng Tao, no relation to Taoism or Laozi beyond the surface string "tao." |
| `wikisource/kama-sutra-burton-part-2-chapter-4`, `wikisource/smokey-the-bear-sutra` | Off-corpus: a treatise unconnected to any figure or motif this corpus's entity model tracks, and a US Forest Service parody respectively. |
| `archive/thus-spoke-zarathustra` | Nietzsche's philosophical work. It borrows Zoroaster's name as a literary device; it carries no Avesta or Gathas content, so it is not a Zoroastrian primary text. |
| `archive/taotehking_1003_librivox`, `archive/diamond_sutra_and_heart_sutra_2301_librivox` | Audio-only LibriVox mirrors (`files.json`/`info.md`/`metadata.json`, no `.txt`). |
| `archive/The_Absolute_Truth_About_Muhammad_in_the_Bible_With_Arabic_Subtitles` | A video/polemic mirror with no extracted text file. |
| `archive/the-grand-bible-3rd-edition-2021` | A modern, self-published 20-million-word "encyclopaedic compilation" PDF (Lord Henfield, 2021), 250 MB, with no extracted plain-text file on disk and no scholarly critical apparatus of its own. |
| `archive/TheVoynichManuscript` | Undeciphered; no readable text of any kind. |
| `museum/met/*` | The Met's own object metadata (paintings, sculpture, decorative art), including several depicting biblical or Buddhist scenes; no body prose to split into passages. |
| `polingual/` | A Next.js app (the Polingual language surface); it carries no ingestible text corpus. |

## Traditions with no primary text on disk

7 of `sacred-history`'s 13 traditions carry no usable primary text in
this repo's own mirror as of this pass: `islam` (the Quran mirror is a
chapter-index stub only, above), `bahai`, `sikhism`, `jainism`, `greek`,
`mesopotamian`, `zoroastrianism`. None of the six figures unique to these
traditions (`muhammad`, `bahaullah`, `guru-nanak`, `mahavira`,
`deucalion`, `gilgamesh`, `utnapishtim`, `saoshyant`, `zoroaster`) gains
any new evidence from this ingest.

This lands hardest on the corpus's own two human-curated, ground-truth
correlations that touch these traditions: `utnapishtim`↔`noah` (the flood
correlation, mesopotamian and judaism) gains nothing on the mesopotamian
side, and `moses`↔`muhammad` (the lawgiver correlation, judaism and
islam) gains nothing on the muhammad side. The third human-curated
correlation, `confucius`↔`jesus`, is the one pair with both sides
covered (tao-confucian's own Analects and christianity's own KJV both on
disk).

## Evidence density per tradition

The task's own target: one evidence item per motif attestation, under
the passage-level span rule (`split_passages()`'s own paragraph-block
splitting, `hte.roles.extract` reading each passage as one document).
Every count here comes from a real, deterministic regex pass over each
tradition's own figures already in `src/data/sacred-history.json`: how
many of that text's own `split_passages()` blocks
name that figure by a plain-text regex match (`\bfigure name\b`, case-
insensitive), the same unit `hte.roles.extract` would read as one
document to extract from. A live extraction pass could produce more or
fewer than one item per attested passage (a passage naming two figures
in the same sentence could yield two items; a passage the ensemble reads
as making no dated claim at all could yield zero), so this floor-
estimates how many passages carry at least one motif attestation; the
eventual evidence-item count from a live pass could run higher or lower.

| Tradition | Text | Passages | Distinct passages attesting a corpus figure | Figures attested |
|---|---|---|---|---|
| christianity | KJV Bible | 24,485 | 2,661 | jesus (872), david (839), moses (746), abraham (216), noah (46) |
| judaism | Talmud legends | 2,855 | 740 | abraham (300), moses (275), david (111), noah (87) |
| tao-confucian | Analects | 221 | 188 | confucius (188) |
| buddhism | Dhammapada | 418 | 15 | buddha (15) |
| hinduism | Bhagavadgita (German) | 281 | 0 | none (German-language figure names not matched by this pass's own English regex) |
| hinduism | Ramayana | 3,215 | 930 | rama (930) |
| hinduism | Mahabharata | 39,284 | 2,624 | krishna (2,106), rama (426), manu (139) |
| lds | Book of Mormon | 6,587 | 3 | joseph-smith (3) |
| **Total** | | **77,346** | **7,161** | |

Two findings worth naming plainly:

- **The Book of Mormon's own figure, `joseph-smith`, attests almost
  nowhere in its own text (3 of 6,587 passages).** The book's own
  narrative names Nephi, Mormon, Alma, and other figures outside
  `sacred-history.json`'s 22-figure vocabulary; Joseph Smith himself
  appears only in the book's own preface and testimony pages. A live
  extraction over this text would mostly produce OTHER-actor evidence
  (real, but not directly strengthening the `joseph-smith` figure's own
  addresses) rather than `joseph-smith`-attested items.
- **The German Bhagavadgita attests zero corpus figures** under this
  pass's own English-only regex; `krishna`/`rama`/etc. read as German
  case-inflected forms this simple check does not match. The real
  extractor ensemble (multilingual) would not carry this gap; this
  table's own zero is a limit of the cheap proxy check used to build it,
  not a claim that the German text names no relevant figure.

## Cost estimate for a live extraction

`hte.roles.extract` runs three ensemble passes per passage (`hte.roles.
EXTRACT_ENSEMBLE_SIZE`), plus one escalation call for any passage whose
three passes disagree below `EXTRACT_AGREEMENT_THRESHOLD` (0.5). At
77,346 passages, that is:

- **232,038 extractor calls** (haiku, `hte/data/model-policy.json`), before escalation.
- **Escalation calls: unknown.** Every fake-mode run of this ingest sees
  100% agreement by construction (the three ensemble passes read the
  identical passage text back regardless of pass angle, `hte.corpus.
  sacred_history_texts`'s own top docstring, "Fake mode and this
  module's own fixture"); a live run's own real agreement rate on this
  domain has never been measured, so this estimate carries no escalation
  count. Campaign two's own `run.log` (`docs/BUILD-HISTORY.md`) reports
  one `ModelTruncation` in 299 preservation-critique calls (haiku's own
  truncation/refusal rate on this domain is likewise unmeasured);
  neither number bounds the extractor's own disagreement rate.

**Wall time.** Campaign two's own documented per-call rate (`docs/
BUILD-HISTORY.md`, "This run's own numbers"): 18,476 cumulative call-
seconds across 388 calls (generator, critic, preservation critic, judge,
all sonnet or opus), 47.6s/call on average, at `HTE_LLM_WORKERS=4`. Using
that rate as an upper-bound working assumption for the extractor's own
232,038 calls:

```
232,038 calls x 47.6s / 4 workers = 2,760,253s ~= 31.9 days
```

That number overstates the real cost: campaign two's own 47.6s/call
average is a **sonnet/opus** rate (generator, critic, preservation
critic, and judge all run sonnet; only the ensemble-disagreement
escalation path runs opus), and the extractor role itself runs **haiku**,
the model-policy's own fastest, cheapest tier, with a materially shorter
prompt (one passage of a few hundred characters, against a preservation
critique's own full hypothesis-plus-evidence context). No haiku call
against this domain has run in this repo, so no measured haiku rate
exists to cite; a conservative 5x speedup over the sonnet/opus average
(an order-of-magnitude judgment call, unverified against any real haiku
call on this domain) puts the same 232,038 calls at roughly 6.4 days at
4 workers. Either
figure argues for running this extraction over a bounded, pre-filtered
subset rather than the full 77,346-passage inventory: a passage already
known to attest a corpus figure (this doc's own 7,161-passage table
above) cuts the call count by 91%, to roughly 21,483 extractor calls
(64,449 calls with the three-pass ensemble), landing the same estimate
range at 0.6 to 2.9 days.

**Projected evidence density against the u <= 0.5 requirement.** Campaign
two's own numbers: 70 evidence items over roughly 5,000 hypothesis
addresses, a density of 0.014 items per address, and a hypothesis needs
about three linked tier-2 items before its own `u` drops under 0.5. This
ingest's own 7,161 attested passages (this doc's own table above), each
producing at least one evidence item under a live extraction, is a
40-100x jump in raw evidence volume over the current 70 (allowing for
some passages yielding more than one item, and a real-world haircut for
`hte.link.link_evidence`'s own linking threshold, which campaign one
linked only 66% of its own 64 items at). Averaged flat over 5,000
addresses that is roughly 1.0 to 1.4 linked items per address, still
short of the "three linked items" a single hypothesis needs on its own.

The average is the wrong number to read this against: `docs/BUILD-
HISTORY.md`'s own meta-review already found this frontier's evidence
concentrated on a handful of figure pairs (Manu-Confucius, Manu-
Deucalion) rather than spread evenly, and this ingest's own attestation
table above concentrates the same way, by construction (krishna 2,106,
rama 1,356, moses 1,021, jesus 872, david 950, abraham 516, confucius
188, buddha 15, manu 139, joseph-smith 3, noah 133). Hypothesis addresses
anchored on the well-attested figures this ingest covers (Krishna, Rama,
Moses, Jesus, David, Abraham, Confucius, Noah, Manu) stand a real chance
of accumulating three or more linked items each once a live extraction
runs; addresses anchored on the seven uncovered traditions' own figures
(Muhammad, Gilgamesh, Utnapishtim, Guru Nanak, Mahavira, Saoshyant,
Zoroaster, Bahá'u'lláh, Deucalion) get no new support from this ingest
at all, and stay exactly where campaign two left them.
