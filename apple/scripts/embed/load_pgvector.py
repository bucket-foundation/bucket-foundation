import io, json, sys
from pathlib import Path
import numpy as np
import psycopg
import pyarrow.parquet as pq

DIMS = {"script": 64, "char": 64, "phonetic": 96, "meaning": 768, "joint": 256}


def vec(a):
    return "[" + ",".join(f"{x:.5f}" for x in a) + "]"


def main(root, dsn):
    root = Path(root)
    manifest = json.load(open(root / "manifest.json"))
    with psycopg.connect(dsn) as con:
        con.execute("create extension if not exists vector")
        cols = ", ".join(f"{m} vector({d})" for m, d in DIMS.items())
        con.execute(f"create table if not exists polingual_embeddings (version text, lang text, word text, has_ipa boolean, {cols}, primary key (version, lang, word))")
        con.execute("create table if not exists polingual_pairs (version text, lang text, key text, word text, english text, direction text, freq_rank int, new_rank int, kept boolean, cos_script real, cos_char real, cos_phonetic real, cos_meaning real, cos_joint real, weighted real)")
        for lang in manifest["words"]:
            d = root / lang
            words = (d / "words.txt").read_text(encoding="utf-8").split("\n")
            arrs = {m: np.load(d / f"{m}.npy") for m in DIMS}
            has = np.load(d / "phonetic_has_ipa.npy") if (d / "phonetic_has_ipa.npy").exists() else np.zeros(len(words), bool)
            con.execute("delete from polingual_embeddings where version = %s and lang = %s", (manifest["version"], lang))
            with con.cursor().copy(f"copy polingual_embeddings (version, lang, word, has_ipa, {', '.join(DIMS)}) from stdin") as cp:
                for i, w in enumerate(words):
                    cp.write_row([manifest["version"], lang, w, bool(has[i])] + [vec(arrs[m][i]) for m in DIMS])
            if (d / "pairs.parquet").exists():
                t = pq.read_table(d / "pairs.parquet").to_pydict()
                con.execute("delete from polingual_pairs where version = %s and lang = %s", (manifest["version"], lang))
                names = ["lang", "key", "word", "english", "direction", "freq_rank", "new_rank", "kept", "cos_script", "cos_char", "cos_phonetic", "cos_meaning", "cos_joint", "weighted"]
                with con.cursor().copy(f"copy polingual_pairs (version, {', '.join(names)}) from stdin") as cp:
                    for row in zip(*[t[n] for n in names]):
                        cp.write_row([manifest["version"], *row])
            con.commit()
            print(lang, len(words), flush=True)
        for m in ("meaning", "joint"):
            con.execute(f"create index if not exists polingual_embeddings_{m}_hnsw on polingual_embeddings using hnsw ({m} vector_cosine_ops)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
