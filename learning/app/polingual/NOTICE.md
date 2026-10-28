# Polingual Data Notice

The code in this repository is MIT. The data files under `learning/app/polingual/` are not; each carries the license of its source, and redistribution must keep the attribution and, for CC-BY-SA material, the same license.

| Files | Source | License | Attribution |
|---|---|---|---|
| `subset.json`, glosses, IPA and examples in `top1000/` and `phrases/` | Wiktionary via Kaikki, https://kaikki.org | CC-BY-SA 4.0 | Wiktionary contributors; Tatu Ylonen, Wiktextract |
| `top1000/*.json` ranks, all languages except th, la, sa, pa | wordfreq, Robyn Speer, https://github.com/rspeer/wordfreq | CC-BY-SA 4.0 | Robyn Speer and contributors |
| `top1000/zh.json` glosses and pinyin | CC-CEDICT, https://www.mdbg.net/chinese/dictionary?page=cc-cedict | CC-BY-SA 4.0 | MDBG and CC-CEDICT contributors |
| `sources/th_opensubtitles.tsv`, `top1000/th.json` ranks | FrequencyWords, Hermit Dave, https://github.com/hermitdave/FrequencyWords | CC-BY-SA 4.0 | Hermit Dave; OpenSubtitles.org |
| `sources/la_dcc_core.tsv`, `top1000/la.json` | Dickinson College Commentaries Latin Core Vocabulary, https://dcc.dickinson.edu/latin-core-list1 | CC-BY-SA | Dickinson College Commentaries, Christopher Francese |
| `sources/sa_dcs_lemmas.tsv`, `top1000/sa.json` ranks | Digital Corpus of Sanskrit, https://github.com/OliverHellwig/sanskrit | CC-BY 4.0 | Oliver Hellwig, The Digital Corpus of Sanskrit, 2010-2024 |
| `sources/pa_wikipedia.tsv`, `top1000/pa.json` ranks | Punjabi Wikipedia dump, https://dumps.wikimedia.org/pawiki/ | CC-BY-SA 4.0 | Wikipedia contributors |
| `phrases/*.json` rows with `"source": "tatoeba"` | Tatoeba, https://tatoeba.org | CC-BY 2.0 FR | Per row: `author` and `url` for the sentence, `english_author` and `english_url` for its translation |
| `phrases/*.json` rows with `"source": "wiktionary"` | Wiktionary usage examples via Kaikki | CC-BY-SA 4.0 | Wiktionary contributors, page in `url` |

The derived files (`top1000/`, `phrases/`, `sources/`) are shared under CC-BY-SA 4.0, the license of their share-alike inputs.
