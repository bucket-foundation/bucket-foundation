import sys
import numpy as np
from sentence_transformers import SentenceTransformer
from common import LANGS, VEC, words

MODEL = "sentence-transformers/LaBSE"


def main():
    m = SentenceTransformer(MODEL, device="cuda")
    for lang in ["en"] + LANGS:
        out = VEC / lang / "meaning.npy"
        if out.exists() and "--force" not in sys.argv:
            continue
        ws = words(lang)
        e = m.encode(ws, batch_size=1024, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
        np.save(out, e.astype(np.float16))
        print(lang, e.shape, flush=True)


if __name__ == "__main__":
    main()
