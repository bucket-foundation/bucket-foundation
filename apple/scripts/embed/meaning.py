import sys
import numpy as np
from sentence_transformers import SentenceTransformer
from common import LANGS, VEC, words

MODEL = "sentence-transformers/LaBSE"
REVISION = "836121a0533e5664b21c7aacc5d22951f2b8b25b"


def device():
    import torch
    return "cuda" if torch.cuda.is_available() else "cpu"


def model():
    return SentenceTransformer(MODEL, revision=REVISION, device=device())


def main():
    m = model()
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
