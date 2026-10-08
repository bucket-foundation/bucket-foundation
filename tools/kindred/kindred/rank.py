import numpy as np

from .corpus import spans


def unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def top_sources(claim_vecs, source_vecs, k=5):
    sims = unit(np.asarray(claim_vecs)) @ unit(np.asarray(source_vecs)).T
    order = np.argsort(-sims, axis=1, kind="stable")[:, :k]
    return [[(int(j), float(sims[i, j])) for j in order[i]] for i in range(sims.shape[0])]


def best_span(claim_vec, text, encode):
    options = spans(text)
    if not options:
        return text.strip(), 0.0
    vecs = unit(np.asarray(encode(options)))
    sims = vecs @ unit(np.asarray(claim_vec))
    i = int(np.argmax(sims))
    return options[i], float(sims[i])


def pca2(matrix):
    x = np.asarray(matrix, dtype=float)
    centered = x - x.mean(axis=0)
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    return centered @ vt[:2].T


def verdict(best, tau):
    ratio = best / tau
    if ratio >= 1.0:
        return "near existing work"
    if ratio >= 0.9:
        return "close to existing work"
    if ratio >= 0.8:
        return "partly covered"
    return "unusual"
