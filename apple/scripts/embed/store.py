import json, shutil, sys, datetime
from pathlib import Path
import numpy as np
from common import LANGS, VEC

DIMS = {"script": 64, "char": 64, "phonetic": 96, "meaning": 768, "joint": 256}


def main(dest):
    dest = Path(dest).expanduser()
    dest.mkdir(parents=True, exist_ok=True)
    counts = {}
    for lang in ["en"] + LANGS:
        d = dest / lang
        d.mkdir(exist_ok=True)
        for f in ["words.txt", "phonetic_has_ipa.npy", "pairs.parquet"] + [f"{m}.npy" for m in DIMS]:
            if (VEC / lang / f).exists():
                shutil.copy2(VEC / lang / f, d / f)
        counts[lang] = len((VEC / lang / "words.txt").read_text(encoding="utf-8").split("\n"))
    (dest / "models").mkdir(exist_ok=True)
    (dest / "reports").mkdir(exist_ok=True)
    for f in ["script_cnn.pt", "joint_proj.pt"]:
        shutil.copy2(VEC / f, dest / "models" / f)
    for f in ["script_report.json", "phonetic_report.json", "joint_report.json", "rerank_report.json"]:
        if (VEC / f).exists():
            shutil.copy2(VEC / f, dest / "reports" / f)
    shutil.copy2(Path(__file__).with_name("load_pgvector.py"), dest / "load_pgvector.py")
    import torch, sentence_transformers, panphon
    manifest = {
        "version": dest.name, "built": datetime.date.today().isoformat(), "words": counts,
        "dims": DIMS, "dtype": "float16, rows L2-normalized, row i matches line i of words.txt",
        "models": {"meaning": "sentence-transformers/LaBSE", "sentence_transformers": sentence_transformers.__version__, "torch": torch.__version__,
                   "phonetic": f"panphon {getattr(panphon, '__version__', 'unknown')} features, WikiPron IPA, EmbeddingBag grapheme model",
                   "script": "64-d CNN on 32x128 Noto renders, contrastive over font weights", "char": "hashed char 1-3 grams, Gaussian projection to 64-d",
                   "joint": "linear projection of the four, InfoNCE on Wiktionary translation pairs"},
        "weights": json.load(open(VEC / "joint_report.json"))["weights"],
    }
    json.dump(manifest, open(dest / "manifest.json", "w"), indent=1)
    shutil.copy2(Path(__file__).with_name("DATASET.md"), dest / "README.md")
    print(dest, sum(counts.values()))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "~/agfarms/data/polingual-embeddings/v1")
