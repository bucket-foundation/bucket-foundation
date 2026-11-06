# Polingual Word Embeddings

Four embeddings per word for English and 28 Polingual languages: script, phonetic, meaning and a joint 3-way vector, plus the score of every Wiktionary translation pair in the Polingual lexicon.

## Layout

```
manifest.json            version, build date, word counts, dims, model names and versions, joint weights
<lang>/words.txt         one word per line; row i of every array is line i
<lang>/script.npy        float16 [n, 64]   CNN over Noto renders of the word
<lang>/char.npy          float16 [n, 64]   hashed character 1 to 3 grams, Gaussian projection
<lang>/phonetic.npy      float16 [n, 96]   panphon features in 4 position bins; WikiPron IPA when present, grapheme model otherwise
<lang>/phonetic_has_ipa.npy  bool [n]      true when the phonetic row comes from Wiktionary IPA
<lang>/meaning.npy       float16 [n, 768]  LaBSE sentence embedding of the bare word
<lang>/joint.npy         float16 [n, 256]  learned linear projection of the four above
<lang>/pairs.parquet     one row per lexicon translation pair (absent for en)
models/script_cnn.pt     script CNN weights (apple/scripts/embed/script.py, class Net)
models/joint_proj.pt     joint projection weights (apple/scripts/embed/joint.py, class Proj)
reports/*.json           the evaluation numbers behind the paper
load_pgvector.py         loads everything into Postgres with pgvector
```

Every row is L2-normalized, so a dot product is the cosine similarity. Vectors in one modality share one space across languages: compare a Spanish `meaning` row with an English `meaning` row directly.

## pairs.parquet

| column | meaning |
|---|---|
| lang, key, word, english | the language, lexicon key, foreign word, English word |
| direction | `xx>en` for the foreign headword's English list, `en>xx` for the English headword's foreign list |
| freq_rank | position in the original list, ordered by English word frequency |
| cos_script, cos_char, cos_phonetic, cos_meaning, cos_joint | cosine per modality |
| weighted | logistic-regression weighted sum of the four single cosines (weights in manifest.json) |
| new_rank, kept | position after re-ranking; -1 and false when the pair was dropped |

## Load

```python
import numpy as np
root = "~/agfarms/data/polingual-embeddings/v1"
words = open(f"{root}/es/words.txt").read().split("\n")
meaning = np.load(f"{root}/es/meaning.npy").astype(np.float32)
en = np.load(f"{root}/en/meaning.npy").astype(np.float32)
en_words = open(f"{root}/en/words.txt").read().split("\n")
i = words.index("perro")
print([en_words[j] for j in np.argsort(-(en @ meaning[i]))[:5]])
```

Postgres: `python3 load_pgvector.py <this dir> postgresql://user@host:port/db` creates `polingual_embeddings` and `polingual_pairs` and HNSW indexes on `meaning` and `joint`.

Rebuild: `apple/scripts/embed/` in bucket-foundation, in the order vocab, meaning, phonetic, script, script_eval, joint, rerank, store.

## Licenses

Words, glosses, translation pairs and IPA come from Wiktionary through kaikki.org and WikiPron: CC BY-SA 4.0, and derived files here carry the same license. The Tatoeba evaluation sentences are CC BY 2.0 FR. Noto fonts are SIL OFL 1.1. LaBSE weights are Apache 2.0. panphon is MIT.
