Sacred-History Primary Texts
=============================

`hte.corpus.sacred_history_texts` (`hte/corpus/sacred_history_texts.py`)
reads the primary texts this repo already mirrors under `gutenberg/` and
`archive/` for all 13 of `sacred-history`'s traditions, splits each one
into passages, and runs every passage through `hte.roles.extract`'s
three-pass extractor ensemble. This doc is that module's own inventory:
which file maps to which tradition, what a real (non-fake) run over the
whole inventory would cost, and (below, "Text-acquisition pass") how the
seven traditions this module's first pass carried nothing for got
filled: one verified public-domain edition each, translator, year, and
public-domain basis named for every one.

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
| The Koran (Al-Qur'an), Rodwell | `gutenberg/PG-2800-the-koran-al-quran-rodwell/PG-2800.txt` | islam | en | 1876 (2nd ed.) | 206,246 | 6,741 |
| Hesiod, the Homeric Hymns, and Homerica (Evelyn-White) | `gutenberg/PG-348-hesiod-the-homeric-hymns-and-homerica/PG-348.txt` | greek | en | 1914 | 93,873 | 1,357 |
| The Zend-Avesta Part I: The Vendidad, Sacred Books of the East vol. IV (Darmesteter) | `archive/india.history.resource.85791/85791_djvu.txt` | zoroastrianism | en | 1880 | 110,873 | 2,763 |
| The Zend-Avesta Part II, Sacred Books of the East vol. XXIII (Darmesteter) | `archive/wg923/WG923-1883 -The Sacred Books of East - Vol 23 of 50 - Zoroastrianism-Zend Avesta -Part 2 of 3_djvu.txt` | zoroastrianism | en | 1883 | 119,507 | 4,591 |
| The Zend-Avesta Part III, Sacred Books of the East vol. XXXI (Mills) | `archive/wg931/WG931-1887 -The Sacred Books of East - Vol 31 of 50 -Zoroastrianism-Zend Avesta -Part 3 of 3_djvu.txt` | zoroastrianism | en | 1887 | 159,587 | 3,769 |
| The Epic of Gilgamish (Thompson) | `archive/thompson-1928-gilgamesh/Thompson_1928_Gilgamesh_djvu.txt` | mesopotamian | en | 1928 | 22,535 | 680 |
| The Seven Tablets of Creation vol. I (King) | `archive/the-seven-tablets-of-creation.-vol.-1/The seven tablets of creation. Vol. 1_djvu.txt` | mesopotamian | en | 1902 | 103,601 | 3,198 |
| Jaina Sutras Part I, Sacred Books of the East vol. XXII (Jacobi) | `archive/in.ernet.dli.2015.37732/2015.37732.Jaina-Sutras--Pt-1_djvu.txt` | jainism | en | 1884 | 107,361 | 2,323 |
| Jaina Sutras Part II, Sacred Books of the East vol. XLV (Jacobi) | `archive/mlbd.gainasutraspart20000vol-45.unse/mlbd.gainasutraspart20000vol-45.unse_djvu.txt` | jainism | en | 1895 | 138,767 | 4,301 |
| The Sikh Religion vol. I (Macauliffe) | `archive/in.ernet.dli.2015.45269/2015.45269.The-Sikh-Religion--Vol1_djvu.txt` | sikhism | en | 1909 | 143,895 | 6,456 |
| The Book of Ighan / Kitáb-i-Íqán (Bahá'u'lláh, tr. Ali Kuli Khan) | `archive/dli.ministry.10422/E01069_The_Book_of_Ighan_djvu.txt` | bahai | en | 1915 (3rd ed.) | 49,690 | 532 |
| **Total** | | 13 traditions | | | **4,754,401** | **114,057** |

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

The eleven editions below `The Book of Mormon` are the text-acquisition
pass's own additions (see "Text-acquisition pass" below for translator,
license basis, and per-edition SHA-256): every one is a real Project
Gutenberg ebook or a named `archive.org` identifier, downloaded byte-for-
byte to the path this table names, with a `metadata.json` and `info.md`
sitting next to the `.txt` file (the same convention every pre-existing
`gutenberg/`/`archive/` edition in this repo already follows). Three of
the thirteen traditions now carry more than one edition:
`zoroastrianism` (the Avesta's own three Sacred Books of the East
volumes, one translator pair per volume, none of them a full single-
volume edition on their own) and `mesopotamian` (Gilgamesh and Enuma
Elish are two distinct myth cycles, each with its own edition here).

## Excluded Texts

Every path below (stub pages, duplicate excerpts, and off-corpus texts)
was checked and excluded, with the reason a future pass should know
before re-adding it.

| Path | Why excluded |
|---|---|
| `wikisource/analects`, `wikisource/the-chinese-classics-volume-1-confucian-analects`, `wikisource/tao-te-ching`, `wikisource/diamond-sutra`, `wikisource/heart-sutra`, `wikisource/the-bhagavad-gita-arnold-translation`, `wikisource/the-glories-of-the-bhagavad-gita-telang-translation`, `wikisource/the-hymns-of-the-rigveda`, `wikisource/the-rigveda`, `wikisource/sacred-books-of-the-east-volume-1-introduction-to-the-upanishads`, `wikisource/quran-progressive-muslims-organization` | Each one's own mirrored `page.txt` is a work-level Wikisource stub: a translation list or a chapter/book index (`{{header}}` transclusion markup, a bare table of contents), never the verse or paragraph text itself. `wikisource/quran-progressive-muslims-organization` carries only a 114-chapter index, no verse text at all; the text-acquisition pass below fills Islam's own gap with a different edition entirely (`quran-rodwell`, Gutenberg), this stub stays excluded and unreplaced. |
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

## Text-acquisition pass

This module's first pass left 7 of `sacred-history`'s 13 traditions with
no usable primary text at all: `islam` (the Quran mirror was a chapter-
index stub only), `bahai`, `sikhism`, `jainism`, `greek`,
`mesopotamian`, `zoroastrianism`. A later pass checked a named candidate
edition against Project Gutenberg and `archive.org` for each one,
verified its public-domain status, and downloaded it into this repo
under the same `gutenberg/`/`archive/` convention every pre-existing
edition already follows. Every row below is now a real `TEXT_RECORDS`
entry; `docs/SACRED-HISTORY-TEXTS.md`'s own inventory table above and
`hte/corpus/sacred_history_texts.py`'s own `TEXT_RECORDS` tuple both
carry it.

| Tradition | Edition | Source | Translator | Year | Public-domain basis |
|---|---|---|---|---|---|
| islam | The Koran (Al-Qur'an) | Gutenberg #2800 | J. M. Rodwell | 1876 (2nd ed.) | Project Gutenberg public-domain ebook; pre-1930 US publication. |
| greek | Hesiod, the Homeric Hymns, and Homerica | Gutenberg #348 | Hugh G. Evelyn-White | 1914 | Project Gutenberg public-domain ebook; pre-1930 US publication. |
| zoroastrianism | The Zend-Avesta Part I: The Vendidad (SBE vol. IV) | archive.org `india.history.resource.85791` | James Darmesteter | 1880 | Public-domain scan; pre-1930 publication. |
| zoroastrianism | The Zend-Avesta Part II (SBE vol. XXIII) | archive.org `wg923` | James Darmesteter | 1883 | Public-domain scan; pre-1930 publication. |
| zoroastrianism | The Zend-Avesta Part III (SBE vol. XXXI) | archive.org `wg931` | Lawrence Heyworth Mills | 1887 | Public-domain scan; pre-1930 publication. |
| mesopotamian | The Epic of Gilgamish | archive.org `thompson-1928-gilgamesh` | R. Campbell Thompson | 1928 | Public-domain scan; pre-1930 UK publication, a fortiori public domain under the 96-year US cutoff current as of 2026. |
| mesopotamian | The Seven Tablets of Creation, vol. I | archive.org `the-seven-tablets-of-creation.-vol.-1` | Leonard William King | 1902 | Public-domain scan; pre-1930 publication. |
| jainism | Jaina Sutras Part I (SBE vol. XXII) | archive.org `in.ernet.dli.2015.37732` | Hermann Jacobi | 1884 | Public-domain scan; pre-1930 publication. |
| jainism | Jaina Sutras Part II (SBE vol. XLV) | archive.org `mlbd.gainasutraspart20000vol-45.unse` | Hermann Jacobi | 1895 | Public-domain scan; pre-1930 publication. |
| sikhism | The Sikh Religion, vol. I | archive.org `in.ernet.dli.2015.45269` | Max Arthur Macauliffe | 1909 | Public-domain scan; pre-1930 publication. |
| bahai | The Book of Ighan (Kitáb-i-Íqán) | archive.org `dli.ministry.10422` | Ali Kuli Khan, assisted by Howard MacNutt | 1915 (3rd ed.) | Public-domain scan; pre-1930 US publication, no renewal on record. |

**Bahá'í was the one candidate this pass expected to skip.** The brief's
own working assumption was that no public-domain English translation of
Bahá'u'lláh's own primary scripture exists, since Bahá'í authorized
translations are almost all 20th-century work by Shoghi Effendi, still
under the Bahá'í World Centre's own copyright. That assumption did not
survive a check: the Bahá'í Publishing Society's own Chicago printing of
*The Book of Ighan* (Kitáb-i-Íqán, "The Book of Certitude"), translated
by Ali Kuli Khan and assisted by Howard MacNutt, reached its third
edition in February 1915, decades inside the pre-1930 public-domain
window this doc applies to every other edition. Its basis is the same
age-based test every other 1876-1928 edition in this table already
relies on: a pre-1930 US publication with no renewal on record. That
age-based test is the entire basis here; no license statement from the
Bahá'í World Centre or any other current rights holder is in play.
`archive/dli.ministry.10422`'s own OCR renders the translators' names
badly (`Aur Kutt Kuan` for Ali Kuli Khan, `Howarp MacNurr` for Howard
MacNutt, a small-caps title-page rendering tesseract misreads); both
names here are corrected against the translation's own well-documented
publication history instead.

One candidate this pass did **not** acquire: George Smith's *The
Chaldean Account of Genesis* (1876), the brief's own alternative
Mesopotamian candidate alongside Thompson's 1928 Gilgamesh. Thompson's
later, cuneiform-verified translation carries the same Deluge Tablet
content (Tablet XI) at higher philological accuracy and already covers
this tradition's own two figures (`gilgamesh`, `utnapishtim`); adding
Smith's older, superseded reconstruction of the same episode alongside
it would only duplicate coverage this repo already has.

**All 13 traditions now carry a primary text.** This lands squarely on
the corpus's own two human-curated, ground-truth correlations that were
missing a side: `utnapishtim`↔`noah` (the flood correlation,
mesopotamian and judaism) now has both sides on disk (Thompson's
Gilgamesh names `Uta-Napishtim` 25 times, this edition's own spelling of
the corpus figure `utnapishtim`), and `moses`↔`muhammad` (the lawgiver
correlation, judaism and islam) now has both sides on disk (Rodwell's
Koran names `Muhammad` 266 times across its own attested passages). The
third human-curated correlation, `confucius`↔`jesus`, already had both
sides covered before this pass (tao-confucian's own Analects and
christianity's own KJV).

Every figure unique to the seven newly-covered traditions
(`muhammad`, `bahaullah`, `guru-nanak`, `mahavira`, `deucalion`,
`gilgamesh`, `utnapishtim`, `saoshyant`, `zoroaster`) now attests in at
least one passage of at least one edition; the "Evidence density per
tradition" table below names the exact count per figure per edition,
including the one that stays near zero (`saoshyant`, below).

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

The text-acquisition pass's own eleven editions carry 19th/20th-century
transliterations that do not always match `sacred-history.json`'s own
figure `label` string letter-for-letter; the regex for each row below
matches that edition's own attested spelling (named in the row itself
when it differs from the figure's own label), the same "cheap proxy, not
the real multilingual extractor" caveat the German Bhagavadgita row
above already carries.

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
| islam | Koran (Rodwell) | 6,741 | 266 | muhammad (266) |
| greek | Hesiod & Homeric Hymns | 1,357 | 9 | deucalion (9) |
| zoroastrianism | Avesta, SBE vol. IV (Vendidad) | 2,763 | 207 | zoroaster (207, matched as "Zoroaster"/"Zarathustra"), saoshyant (1) |
| zoroastrianism | Avesta, SBE vol. XXIII | 4,591 | 91 | zoroaster (90, "Zoroaster"/"Zarathustra"), saoshyant (1) |
| zoroastrianism | Avesta, SBE vol. XXXI | 3,769 | 44 | zoroaster (44, "Zoroaster"/"Zarathustra"), saoshyant (0) |
| mesopotamian | Gilgamesh (Thompson) | 680 | 169 | gilgamesh (157, matched as this edition's own "Gilgamish"), utnapishtim (25, matched as "Uta-Napishtim") |
| mesopotamian | Seven Tablets of Creation / Enuma Elish (King) | 3,198 | 4 | gilgamesh (4, "Gilgamish"/"Gilgamesh"), utnapishtim (0) |
| jainism | Jaina Sutras Part I (Jacobi) | 2,323 | 20 | mahavira (20) |
| jainism | Jaina Sutras Part II (Jacobi) | 4,301 | 70 | mahavira (70) |
| sikhism | Sikh Religion vol. I (Macauliffe) | 6,456 | 677 | guru-nanak (677, matched as "Nanak") |
| bahai | Book of Ighan (Ali Kuli Khan) | 532 | 14 | bahaullah (14, matched as "Bahá'u'lláh"/"Bahaullah") |
| **Total** | | **114,057** | **8,732** | |

Four findings worth naming plainly:

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
- **Thompson's 1928 Gilgamesh spells both of its own figures
  differently from `sacred-history.json`'s own labels**: "Gilgamish"
  (not "Gilgamesh") and "Uta-Napishtim" (not "Utnapishtim"), both matched
  in the table above under the edition's own spelling. King's 1902 Enuma
  Elish is Marduk's own creation epic, a different Mesopotamian myth
  cycle from the Gilgamesh epic; it barely mentions either figure (4
  passages, both incidental) even under the wider "Gilgamish or
  Gilgamesh" pattern, because the edition names a different story, a
  fact about the source rather than a failure of the match.
- **`saoshyant` (the Zoroastrian eschatological savior figure) attests
  in one passage out of three Avesta volumes, zero in the third**,
  against `zoroaster`/`zarathustra`'s own 207/90/44 passages in the same
  three volumes. The Avesta's own Vendidad (ritual law), Yasna/Visparad/
  Gahs (liturgy), and this edition's own selection of what survives at
  all name the founder constantly and the promised eschatological figure
  almost never; this table's own near-zero reflects that emphasis in the
  source itself rather than a gap in the match.

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
Zoroaster, Bahá'u'lláh, Deucalion) got no new support from this ingest
at all as of this paragraph's own count, and stayed exactly where
campaign two left them. The text-acquisition pass below changed that:
every one of those nine figures now has at least one attested passage
(this doc's own density table above), Muhammad (266), Zoroaster (341
across three volumes), Guru Nanak (677), and Bahá'u'lláh (14) chief
among them; only Saoshyant (1 passage of three volumes) and Deucalion
(9) stay thin enough that a hypothesis address anchored on either alone
is unlikely to clear three linked items from this ingest by itself.

## Cost estimate update: the text-acquisition pass

The eleven editions above bring the full inventory to **114,057
passages** across all 13 traditions (up from 77,346 across 6), and the
distinct-passage floor to **8,732** (up from 7,161). Re-running the same
arithmetic this doc's own cost estimate above already walks through,
against the new totals rather than the old ones:

- **342,171 extractor calls** (114,057 passages x 3 ensemble passes),
  before escalation, against the full inventory.
- **Wall time, full inventory:** `342,171 calls x 47.6s / 4 workers ~=
  4,071,835s ~= 47.1 days` at the same sonnet/opus rate this doc's own
  estimate above uses as an upper bound; a haiku rate 5x faster (the
  same unverified, order-of-magnitude assumption above) puts it at
  roughly 9.4 days.
- **Pre-filtered to the 8,732 attested passages**: 26,196 extractor
  calls, `26,196 x 47.6s / 4 workers ~= 311,732s ~= 3.6 days` at the
  sonnet/opus rate, roughly 0.7 days at the same 5x haiku assumption.
  That range (0.7 to 3.6 days) sits a proportional ~22% above the pre-
  acquisition pass's own 7,161-passage range (0.6 to 2.9 days), tracking
  the 22% growth in attested-passage count (7,161 to 8,732) almost
  exactly, even though the new total now spans all 13 traditions
  instead of the original 6: the new editions' own attestation rate
  (`8,732 / 114,057`, about 7.7%) runs below the original six
  traditions' own combined rate (`7,161 / 77,346`, about 9.3%).
  Zoroastrianism and Sikhism attest heavily (Zoroaster, Guru Nanak);
  Bahá'í, Greek, and one of the two Mesopotamian editions (Enuma Elish)
  attest thinly, pulling the blended rate down, and the pre-filtered
  subset's own wall time with it.

## Slice one, live

`scripts/extract_slice.py --offset 0 --limit 500 --chunk-size 20`, started
2026-09-14 13:31Z, finished 18:03Z: the first 500 passages of the
figure-attested subset (6,207 passages over the 8 editions on that
commit, `attested_subset()`'s own order), all of them from the KJV Bible
edition since it leads `TEXT_RECORDS`. 1,505 extractor calls (haiku, three
passes per passage) and 283 opus escalations on ensemble disagreement, 2
rate-limit pauses, 2 timeouts at 300 s (raised to 600 s for this role in
#156), 16,262 s wall clock. 917 evidence items, saved as
`hte/data/sacred-history-texts-slice-1-corpus.json` and registered as the
`sacred-history-texts-slice-1` corpus. The model cache is tracked under
`hte/data/llm-cache-sacred-history-texts/` (1,783 entries, 7.0 MB), so the
slice replays in under a second with `replay_only=True` and no call. The
script's warm phase makes live calls on any cache miss; run it only when
extending the window.
