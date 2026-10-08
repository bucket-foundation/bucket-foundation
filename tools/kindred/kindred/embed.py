import sys
from pathlib import Path

ATLAS_DIR = Path(__file__).resolve().parents[2] / "solvability-atlas"


class Encoder:
    def __init__(self, cache_dir):
        sys.path.insert(0, str(ATLAS_DIR))
        import atlas
        from sentence_transformers import SentenceTransformer

        self.atlas = atlas
        self.cache_dir = Path(cache_dir)
        self.model = SentenceTransformer(atlas.MODEL, revision=atlas.MODEL_REVISION)

    def __call__(self, texts):
        vecs, _ = self.atlas.cached_encode(self.model, list(texts), cache=self.cache_dir)
        return vecs
