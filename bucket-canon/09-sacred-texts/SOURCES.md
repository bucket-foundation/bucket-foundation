# Sacred Texts — Verified Source Index

Bead: `bkt-research-13`. Last verified: 2026-04-23.

Scope: digital editions of primary religious/philosophical texts with **confirmed** public-domain or permissive-license status. Discipline matches the rest of `bucket-canon/`: primary source, not truth claim. License verification is per-source; anything unverified is flagged `⚠️ license unclear — needs founder review`.

Legend — **P1** = fetch in first ingestion pass (clean license, canonical edition, bulk download available). **P2** = fetch second pass (license clean but source needs more handling). **P3** = defer (license flag, fragmentary, or better edition likely exists).

---

## 1. Hebrew Bible / Tanakh

### Westminster Leningrad Codex (WLC)
- **License**: Public Domain (text of Leningrad Codex itself is PD; the WLC digital edition is released without restriction by the Westminster Hebrew Institute / J. Alan Groves Center — explicit PD-equivalent "no restrictions" terms).
- **Primary source URL**: https://tanach.us/
- **API/bulk-download**: https://tanach.us/Pages/Technical.html (XML + plain text bulk downloads); mirror at https://github.com/openscriptures/morphhb (CC-BY 4.0 for the morphology overlay; base text PD)
- **Edition/translator**: Groves Center edition based on the Leningrad Codex (c. 1008 CE), current WLC v4.20+
- **Notes**: Definitive electronic Masoretic text. Consonantal + vowels + cantillation. Morphhb adds morphological tagging (CC-BY 4.0 — attribute if used).
- **Ingestion priority**: P1

### Sefaria (Tanakh + rabbinic corpus)
- **License**: **Mixed / per-text** — code is GPL-3.0; texts are individually licensed (PD, CC0, CC-BY, CC-BY-SA, or CC-BY-NC). Must check each text's license metadata via the API before reuse. ⚠️ do not assume blanket PD.
- **Primary source URL**: https://www.sefaria.org/
- **API/bulk-download**: https://developers.sefaria.org/ — REST API exposes `license` field per text; bulk dumps at https://github.com/Sefaria/Sefaria-Export
- **Edition/translator**: multiple, varies per tractate/book
- **Notes**: Best machine-readable access to the broader Jewish textual corpus (Mishnah, Talmud, Midrash, commentaries). License filter is mandatory at ingest time.
- **Ingestion priority**: P2 (needs license-filter logic in pipeline)

### Biblia Hebraica Stuttgartensia (BHS)
- **License**: ⚠️ **Not public domain.** Deutsche Bibelgesellschaft holds copyright on the BHS apparatus and typesetting. The underlying Leningrad text is PD, but the BHS critical apparatus is not.
- **Primary source URL**: https://www.scholarly-bibles.com/
- **Notes**: Use WLC instead for a PD-clean Leningrad text. BHS apparatus requires a commercial license.
- **Ingestion priority**: P3 (skip; use WLC)

---

## 2. Christian Bible

### King James Version (KJV, 1769 Blayney edition)
- **License**: Public Domain worldwide **except in the UK**, where the Crown holds a perpetual letters-patent monopoly (Cambridge, Oxford, HMSO). Treat as PD for all non-UK use.
- **Primary source URL**: https://www.gutenberg.org/ebooks/10 (Project Gutenberg)
- **API/bulk-download**: https://github.com/scrollmapper/bible_databases (multi-format SQL/JSON/XML)
- **Edition/translator**: 1769 Oxford standard (Blayney)
- **Notes**: Flag Crown-copyright caveat in metadata. 1611 first-edition PD unconditionally.
- **Ingestion priority**: P1

### American Standard Version (ASV, 1901)
- **License**: Public Domain (US, worldwide — copyright expired).
- **Primary source URL**: https://www.gutenberg.org/ebooks/8 ; https://ebible.org/asv/
- **API/bulk-download**: ebible.org USFM bundles
- **Edition/translator**: 1901 American revision committee
- **Notes**: Literal, useful for machine alignment.
- **Ingestion priority**: P1

### World English Bible (WEB)
- **License**: Public Domain (explicit dedication by Rainbow Missions, Inc.).
- **Primary source URL**: https://ebible.org/web/
- **API/bulk-download**: https://ebible.org/Scriptures/ (USFM, OSIS, plain text); https://github.com/TehShrike/world-english-bible
- **Edition/translator**: Rainbow Missions (rolling updates; pin a version hash).
- **Notes**: Best modern-English PD translation. Preferred default for modern-language ingestion.
- **Ingestion priority**: P1

### SBL Greek New Testament (SBLGNT)
- **License**: CC-BY 4.0 (SBL + Logos, 2010). Attribution required; cannot be sold on its own.
- **Primary source URL**: https://sblgnt.com/
- **API/bulk-download**: https://github.com/LogosBible/SBLGNT (XML + plain text)
- **Edition/translator**: Michael W. Holmes, 2010
- **Notes**: Best openly-licensed critical Greek NT. Attribution string required per license.
- **Ingestion priority**: P1

### NRSV / NRSVue, NIV, ESV, NASB
- **License**: ⚠️ **Not public domain.** NCC (NRSV), Biblica (NIV), Crossway (ESV), Lockman (NASB) all hold active copyright.
- **Notes**: Flag and exclude. Use KJV/ASV/WEB for English coverage.
- **Ingestion priority**: P3 (skip)

### Greek Septuagint (LXX — Rahlfs 1935)
- **License**: Public Domain (Rahlfs died 1935; edition published 1935; PD in most jurisdictions as of 2026). Rahlfs-Hanhart 2006 revision is **not** PD.
- **Primary source URL**: https://github.com/openscriptures/GreekResources ; https://www.academic-bible.com/ (Rahlfs-Hanhart — paywalled)
- **Edition/translator**: Alfred Rahlfs, 1935 (Septuaginta)
- **Notes**: Use 1935 edition only; do not conflate with Hanhart revision.
- **Ingestion priority**: P2

### Latin Vulgate (Clementine, 1592)
- **License**: Public Domain.
- **Primary source URL**: http://vulsearch.sourceforge.net/ ; https://www.gutenberg.org/ebooks/19635
- **Edition/translator**: Clementine Vulgate (1592); Stuttgart Vulgate (1969) **NOT** PD.
- **Ingestion priority**: P2

---

## 3. Quran

### Tanzil Arabic Quran
- **License**: CC-BY 3.0 (Tanzil Project). Verbatim copies only — modification prohibited by license. Attribution + link to tanzil.net required.
- **Primary source URL**: https://tanzil.net/
- **API/bulk-download**: https://tanzil.net/download/ (Uthmani, Simple, Simple-Enhanced, Simple-Minimal; XML/plain text)
- **Edition/translator**: Tanzil verified Uthmani text (Medina Mushaf), 1.1
- **Notes**: Gold standard digital Arabic Quran. The no-modification clause is stricter than standard CC-BY — flag for pipeline (store verbatim, transformations kept separate).
- **Ingestion priority**: P1

### Quran.com API
- **License**: ⚠️ **Unclear / mixed** — API terms at https://api-docs.quran.com/ reference Tanzil (CC-BY 3.0) for Arabic text and per-translator licenses for translations; not all translations are openly licensed. Verify per-translation.
- **Primary source URL**: https://quran.com/ ; https://api.quran.foundation/
- **Ingestion priority**: P2 (use Tanzil Arabic; cherry-pick PD/CC translations via quran.com metadata)

### Al-Quran Cloud API
- **License**: ⚠️ derivative of Tanzil (CC-BY 3.0 for Arabic); translations follow upstream licenses.
- **Primary source URL**: https://alquran.cloud/api
- **Ingestion priority**: P3 (redundant with Tanzil direct)

### English translations — Pickthall (1930), Yusuf Ali (1934)
- **License**: Pickthall PD (author d. 1936, >70y in most jurisdictions). Yusuf Ali PD in life+70 jurisdictions (d. 1953). Sahih International **NOT** PD.
- **Primary source URL**: https://www.gutenberg.org/ebooks/2800 (Pickthall); Tanzil distributes both.
- **Ingestion priority**: P1 (Pickthall), P1 (Yusuf Ali)

---

## 4. Buddhist Canon

### SuttaCentral (Pali canon, Sujato translations)
- **License**: **CC0** for Bhikkhu Sujato's English translations of the four main Nikāyas + early Khuddaka (2018–2021). Pali source text also freely licensed.
- **Primary source URL**: https://suttacentral.net/
- **API/bulk-download**: https://github.com/suttacentral/bilara-data (source-of-truth repo, CC0); https://suttacentral.net/api
- **Edition/translator**: Bhikkhu Sujato (English), Mahāsaṅgīti Tipiṭaka (Pali)
- **Notes**: CC0 is the strongest possible license; no attribution required (though courtesy).
- **Ingestion priority**: P1

### Access to Insight
- **License**: ⚠️ **Mixed per-translator** — most Thanissaro Bhikkhu translations are under a specific non-commercial-redistribution license (ATI "For free distribution only" terms); not CC0. Verify per file.
- **Primary source URL**: https://www.accesstoinsight.org/
- **API/bulk-download**: full offline archive at https://www.accesstoinsight.org/tech/download/bulk.html
- **Ingestion priority**: P2 (prefer SuttaCentral; use ATI only for suttas Sujato hasn't covered)

### BDK English Tripitaka (Chinese → English, Mahayana)
- **License**: ⚠️ **license unclear — needs founder review.** BDK America distributes free PDFs from https://www.bdkamerica.org/ but the downloadable PDFs carry a standard "all rights reserved, free distribution only" notice — not CC/PD. Not redistributable under an open license.
- **Primary source URL**: https://www.bdkamerica.org/tripitaka-list/
- **Notes**: Usable for reading/citation under fair use; cannot be mirrored into Bucket as open canon without BDK's explicit permission.
- **Ingestion priority**: P3 (link-out only; do not mirror)

### CBETA (Chinese Buddhist Electronic Texts)
- **License**: CC-BY-NC-SA (for the digital edition); underlying Taishō/Zokuzōkyō source texts are PD.
- **Primary source URL**: https://www.cbeta.org/
- **API/bulk-download**: https://github.com/cbeta-org
- **Ingestion priority**: P2 (non-commercial clause needs alignment with Bucket's license posture)

---

## 5. Hindu

### Rig Veda — Griffith translation (1896)
- **License**: Public Domain.
- **Primary source URL**: https://sacred-texts.com/hin/rigveda/ ; https://www.gutenberg.org/ebooks/16295
- **Edition/translator**: Ralph T.H. Griffith, 1896 (complete)
- **Notes**: Translator bias — Victorian, occasionally euphemistic. Flag but ingest.
- **Ingestion priority**: P1

### Upanishads — Max Müller (Sacred Books of the East, 1879–1884)
- **License**: Public Domain.
- **Primary source URL**: https://sacred-texts.com/hin/sbe01/ , /sbe15/ (SBE vols 1 & 15)
- **Edition/translator**: F. Max Müller, vols 1 & 15 of SBE
- **Notes**: Scholarly but dated philology; useful as primary citable edition.
- **Ingestion priority**: P1

### Bhagavad Gita — multiple PD translations
- **License**: Edwin Arnold (1885, *The Song Celestial*) PD; Kashinath Trimbak Telang (SBE vol 8, 1882) PD; Besant (1905) PD. ⚠️ Prabhupada's *As It Is* (1968) and Easwaran (1985) **NOT** PD.
- **Primary source URL**: https://sacred-texts.com/hin/gita/ (Arnold); https://sacred-texts.com/hin/sbe08/ (Telang)
- **Ingestion priority**: P1 (Arnold + Telang)

### Sacred Books of the East (full 50-volume series)
- **License**: Public Domain (all 50 vols, 1879–1910).
- **Primary source URL**: https://sacred-texts.com/sbe.htm
- **Notes**: Covers Hindu, Buddhist, Jain, Zoroastrian, Confucian, Taoist, Islamic primary texts under one PD umbrella. Highest-leverage single ingest.
- **Ingestion priority**: P1

---

## 6. Taoist

### Tao Te Ching — Legge (1891)
- **License**: Public Domain (SBE vol 39).
- **Primary source URL**: https://sacred-texts.com/tao/sbe39/
- **Edition/translator**: James Legge, 1891
- **Ingestion priority**: P1

### Tao Te Ching — Waley (1934)
- **License**: ⚠️ PD in life+70 jurisdictions (Waley d. 1966 → PD 2037 in EU/UK; PD in US if not renewed — needs check at https://exhibits.stanford.edu/copyrightrenewals). Flag as jurisdiction-dependent.
- **Primary source URL**: archive.org scans
- **Ingestion priority**: P3 (use Legge)

### Tao Te Ching — Mitchell (1988)
- **License**: ⚠️ **Not public domain** (Stephen Mitchell, copyright active). Do not mirror.
- **Ingestion priority**: P3 (skip)

### Zhuangzi — Legge (1891)
- **License**: Public Domain (SBE vols 39–40).
- **Primary source URL**: https://sacred-texts.com/tao/sbe39/ , /sbe40/
- **Ingestion priority**: P1

### I Ching — Legge (1899)
- **License**: Public Domain (SBE vol 16).
- **Primary source URL**: https://sacred-texts.com/ich/
- **Notes**: Wilhelm/Baynes (1950) **NOT** PD.
- **Ingestion priority**: P1

---

## 7. Zoroastrian

### Avesta — Darmesteter & Mills (1880–1887)
- **License**: Public Domain (SBE vols 4, 23, 31).
- **Primary source URL**: https://sacred-texts.com/zor/ ; https://www.avesta.org/
- **Edition/translator**: James Darmesteter (vols 4, 23) and L.H. Mills (vol 31)
- **Ingestion priority**: P1

### Pahlavi Texts — E.W. West (1880–1897)
- **License**: Public Domain (SBE vols 5, 18, 24, 37, 47).
- **Primary source URL**: https://sacred-texts.com/zor/
- **Ingestion priority**: P2

---

## 8. Gnostic / Nag Hammadi

### Nag Hammadi facsimile codices (Coptic)
- **License**: Public Domain (UNESCO/Brill facsimile edition completed 1977 — physical manuscripts released to PD at that point).
- **Primary source URL**: https://archive.org/details/FacsimileEditionOfTheNagHammadiCodices (scans)
- **Ingestion priority**: P2 (images, not text — OCR pipeline required)

### Nag Hammadi Library in English — Robinson (1977/1988 editions)
- **License**: ⚠️ **Not public domain.** James M. Robinson / E.J. Brill editorial translation copyright active.
- **Primary source URL**: https://archive.org/details/TheNagHammadiLibraryPartial (archive.org hosts scans under borrow-only terms; not an open license)
- **Notes**: Citable, not mirrorable. Use for reference; do not ingest as canon-owned text.
- **Ingestion priority**: P3 (link-out)

### Gospel of Thomas — PD translations
- **License**: Public Domain for older translations (e.g., Lambdin's early drafts are restricted; Grenfell-Hunt Oxyrhynchus Greek fragments in PD).
- **Primary source URL**: http://gnosis.org/naghamm/nhl.html (host's terms permit non-commercial reuse; not a clean open license — ⚠️ verify per file)
- **Ingestion priority**: P3 (needs per-document license review)

---

## 9. Egyptian

### Pyramid Texts — Mercer (1952)
- **License**: Public Domain (US — not renewed per standard 1923–1963 rule; verify via Stanford renewal DB).
- **Primary source URL**: https://sacred-texts.com/egy/pyt/
- **Edition/translator**: Samuel A.B. Mercer, 1952, 4 vols.
- **Notes**: Mercer is PD but scholarly consensus prefers Faulkner 1969 (not PD).
- **Ingestion priority**: P1 (Mercer) ; P3 (Faulkner — not PD)

### Coffin Texts — Faulkner (1973–1978)
- **License**: ⚠️ **Not public domain** (Faulkner/Aris & Phillips, active copyright).
- **Notes**: No clean PD English edition. Hieroglyphic source (De Buck, 1935–1961) partially out of copyright in some jurisdictions.
- **Ingestion priority**: P3 (skip English; consider De Buck hieroglyphic if needed)

### Book of the Dead — Budge (1895, *Papyrus of Ani*)
- **License**: Public Domain.
- **Primary source URL**: https://sacred-texts.com/egy/ebod/ ; https://www.gutenberg.org/ebooks/7145
- **Edition/translator**: E.A. Wallis Budge, 1895
- **Notes**: ⚠️ Budge's translations are famously criticized (outdated transliteration, Victorian philology, theological gloss). Mirror as primary source but flag "Budge issues" in metadata; cross-reference Faulkner 1972 edition (not PD) for scholarly use.
- **Ingestion priority**: P1 (with quality flag)

---

## 10. Mesopotamian

### Enuma Elish — L.W. King (1902, *Seven Tablets of Creation*)
- **License**: Public Domain.
- **Primary source URL**: https://sacred-texts.com/ane/stc/ ; https://www.gutenberg.org/ebooks/60810
- **Edition/translator**: Leonard W. King, 1902
- **Ingestion priority**: P1

### Enuma Elish — Heidel (1951, *Babylonian Genesis*)
- **License**: ⚠️ likely PD (US, 1951, check renewal). Flag for verification.
- **Ingestion priority**: P2

### Epic of Gilgamesh — R. Campbell Thompson (1928)
- **License**: Public Domain (US, pre-1929).
- **Primary source URL**: https://sacred-texts.com/ane/eog/ (variants); archive.org
- **Ingestion priority**: P1

### Epic of Gilgamesh — Andrew George (1999, Penguin; 2003 Oxford critical)
- **License**: ⚠️ **Not public domain.** Active copyright.
- **Ingestion priority**: P3 (skip)

### Sumerian literature — ETCSL (Oxford)
- **License**: Creative Commons-like permissive terms ("may be reproduced... for educational and research purposes") — ⚠️ not a named CC license; verify at https://etcsl.orinst.ox.ac.uk/edition2/credits.php
- **Primary source URL**: https://etcsl.orinst.ox.ac.uk/
- **Ingestion priority**: P2

---

## 11. Mesoamerican

### Popol Vuh — Goetz & Morley (1950, from Recinos Spanish)
- **License**: ⚠️ likely PD (US, 1950) if not renewed — verify via Stanford DB. Flag.
- **Primary source URL**: https://sacred-texts.com/nam/pvuheng.htm
- **Edition/translator**: Delia Goetz & Sylvanus G. Morley, from Adrián Recinos' Spanish
- **Ingestion priority**: P2 (pending renewal check)

### Popol Vuh — Brasseur de Bourbourg (1861, French + K'iche')
- **License**: Public Domain.
- **Primary source URL**: archive.org
- **Notes**: Earliest published K'iche' transcription; French translation. Use as primary K'iche'-source anchor.
- **Ingestion priority**: P1

### Chilam Balam, Annals of the Cakchiquels — Brinton (1885)
- **License**: Public Domain.
- **Primary source URL**: https://sacred-texts.com/nam/maya/
- **Ingestion priority**: P2

---

## 12. Presocratics & Confucian

### Presocratic fragments — Diels-Kranz (*Die Fragmente der Vorsokratiker*, 6th ed. 1952)
- **License**: ⚠️ DK6 (1952) **not** PD; 1st edition Diels 1903 IS PD.
- **Primary source URL (PD 1903)**: archive.org "Fragmente der Vorsokratiker Diels 1903"
- **Ingestion priority**: P2 (1903 Diels only)

### Presocratics — Kathleen Freeman, *Ancilla to the Pre-Socratic Philosophers* (1948, English of DK fragments B)
- **License**: ⚠️ Freeman d. 1959. PD in US if not renewed (needs Stanford check — widely treated as PD and hosted at https://archive.org/details/ancillatoprecocr0000kath and https://www.gutenberg.ca/). In life+70 jurisdictions PD as of 2030.
- **Primary source URL**: https://archive.org/details/ancillatoprecocr0000kath
- **Ingestion priority**: P2 (pending US renewal check; safe in Canada/PD-life+50)

### Confucian Four Books + Five Classics — Legge (1861–1885)
- **License**: Public Domain (SBE + Chinese Classics series).
- **Primary source URL**: https://sacred-texts.com/cfu/ ; https://ctext.org/
- **Edition/translator**: James Legge
- **Notes**: Chinese Text Project (ctext.org) hosts parallel Chinese + Legge English; permissive terms, verify per-text.
- **Ingestion priority**: P1

### Analects, Mencius, Doctrine of the Mean, Great Learning — Legge
- **License**: Public Domain (as above).
- **Primary source URL**: https://sacred-texts.com/cfu/
- **Ingestion priority**: P1

---

## Aggregator: sacred-texts.com (Internet Sacred Text Archive)
- **License**: Site policy (https://sacred-texts.com/cnote.htm): transcriptions of PD source texts are themselves PD / free-to-use; a small subset of site-generated content is © John Bruno Hare and flagged as such.
- **Notes**: Single largest PD corpus of comparative religion texts online. Most of the P1 entries above point into it. Transcription quality varies; treat as a source of PD text, then verify against canonical editions where possible.
- **Ingestion priority**: P1 as the **primary aggregator**; prefer upstream canonical editions (tanach.us, ebible.org, tanzil.net, suttacentral.net, gutenberg.org) where they exist.

---

## Summary flags

- **Hard-blocked (do not mirror)**: NRSV/NIV/ESV/NASB, Stephen Mitchell Tao Te Ching, Easwaran Gita, Prabhupada Gita *As It Is*, Andrew George Gilgamesh, Faulkner Pyramid & Coffin Texts, BHS apparatus, Rahlfs-Hanhart LXX (2006), BDK Tripitaka PDFs (free-to-read, not free-to-mirror), Robinson Nag Hammadi English.
- **License unclear — founder review**: Sefaria per-text licenses; Quran.com per-translation licenses; Access to Insight (Thanissaro) per-file terms; Heidel Enuma Elish renewal; Goetz-Morley Popol Vuh renewal; Freeman *Ancilla* US renewal; ETCSL license string; gnosis.org/naghamm per-document.
- **Strong CC0 / PD / CC-BY anchors**: Westminster Leningrad Codex, KJV/ASV/WEB, SBLGNT (CC-BY), Tanzil Quran (CC-BY 3.0, no-mod), SuttaCentral Sujato (CC0), Sacred Books of the East (entire 50 vols PD), Legge corpus, Budge *Book of the Dead*, Mercer *Pyramid Texts*, L.W. King *Enuma Elish*, Brasseur de Bourbourg *Popol Vuh*, Diels 1903 Vorsokratiker.
