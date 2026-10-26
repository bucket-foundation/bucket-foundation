# Polingual Core Vocabulary Sources

Each language has 1,000 ranked words in `../top1000/<lang>.json` and up to 300 phrases in `../phrases/<lang>.json`. Licenses and attribution for every file: `../NOTICE.md`.

## Word Frequency

| Language | Source | License |
|---|---|---|
| zh | wordfreq zh list, glosses from CC-CEDICT | CC-BY-SA 4.0 |
| th | FrequencyWords 2018, OpenSubtitles, Hermit Dave (`th_opensubtitles.tsv`) | CC-BY-SA 4.0 |
| la | Dickinson College Commentaries Latin Core Vocabulary (`la_dcc_core.tsv`) | CC-BY-SA |
| sa | Digital Corpus of Sanskrit, Oliver Hellwig, lemma counts (`sa_dcs_lemmas.tsv`) | CC-BY 4.0 |
| pa | Punjabi Wikipedia dump, Gurmukhi token counts (`pa_wikipedia.tsv`) | CC-BY-SA 4.0 |
| others | wordfreq, Robyn Speer | CC-BY-SA 4.0 |

Glosses, parts of speech and IPA come from Wiktionary via Kaikki (CC-BY-SA 4.0) and the photon index. For th, sa and pa a frequency entry enters the list only when Wiktionary has a headword for it, which drops subtitle noise, names and inflected forms. Sanskrit lemmas are matched to Devanagari headwords through the Wiktionary romanization.

## Phrases

Tatoeba sentence pairs with an English translation (CC-BY 2.0 FR). Each phrase keeps its sentence URL and author, and the English side keeps its own. Sentences with no owner in the Tatoeba export are dropped. Where Tatoeba has fewer than 600 candidates (sa, ta, pa) Wiktionary usage examples fill in, each linked to its Wiktionary page. A phrase is 2 to 8 words, or 2 to 16 characters in zh, ja and th.

## Frequency Bands

Each word and phrase has a `band` field holding A1, A2 or B1. These are frequency bands named after the CEFR levels they target; no CEFR assessment or CEFR word list stands behind them, since no openly licensed CEFR list covers these languages.

- Words: rank 1 to 400 is A1, 401 to 750 is A2, 751 to 1000 is B1.
- Phrases: the level follows the rarest word in the phrase, by its rank in the frequency list above. Rank up to 500 is A1, up to 1,500 is A2, up to 4,000 is B1. Sanskrit and Latin phrases rank against their own corpus. When a language has fewer than 300 phrases inside rank 4,000, B1 extends to rank 50,000.

## Rebuild

```
python3 scripts/polingual/build_sources.py --th th_50k.txt --la latin-core-list1.html --sa sanskrit/dcs/data/conllu/files --pa pawiki-latest-pages-articles.xml.bz2
python3 scripts/polingual/top_words.py --kaikki <kaikki dir> --cedict cedict_1_0_ts_utf-8_mdbg.txt
python3 scripts/polingual/phrases.py --tatoeba <tatoeba dir> --kaikki <kaikki dir>
```
