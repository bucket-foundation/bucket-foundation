from __future__ import annotations

import os

from .registry import model_entry, snapshot_dir, verify_model, verify_runtime

MAX_THREADS = 8

class ModelUnavailable(RuntimeError):
    pass

class Encoder:
    def __init__(self, model_id: str | None = None, threads: int = MAX_THREADS, device: str = "cpu"):
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        self.model_id, self.entry = model_entry(model_id)
        problems = verify_model(self.entry) + verify_runtime()
        if problems:
            raise ModelUnavailable("; ".join(problems))
        import torch
        from sentence_transformers import SentenceTransformer
        from tokenizers import Tokenizer

        torch.set_num_threads(max(1, min(threads, MAX_THREADS)))
        snap = snapshot_dir(self.entry)
        self.device = device
        self.model = SentenceTransformer(str(snap), device=device, trust_remote_code=False, local_files_only=True)
        self.tokenizer = Tokenizer.from_file(str(snap / "tokenizer.json"))
        self.tokenizer.no_truncation()
        self.tokenizer.no_padding()
        self.dimension = int(self.entry["dimension"])

    @property
    def revision(self) -> str:
        return self.entry["revision"]

    def encode(self, texts: list[str], batch_size: int = 16):
        import numpy as np

        vecs = self.model.encode(texts, batch_size=batch_size, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
        vecs = np.asarray(vecs, dtype="<f4")
        if vecs.shape != (len(texts), self.dimension):
            raise ModelUnavailable(f"the encoder returned shape {vecs.shape}, expected ({len(texts)}, {self.dimension})")
        return vecs

    def encode_query(self, query: str):
        return self.encode([query], batch_size=1)[0]
