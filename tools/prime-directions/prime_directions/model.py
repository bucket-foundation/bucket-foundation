from __future__ import annotations

from dataclasses import dataclass, field
from functools import cached_property

import numpy as np
import scipy.sparse as sp
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, CountVectorizer
from sklearn.utils.extmath import randomized_svd

from .corpora import Doc

TOKEN_PATTERN = r"(?u)\b[^\W\d_]\w+\b"


@dataclass
class TermStats:
    vocab: np.ndarray
    df: np.ndarray
    n_docs: int

    @cached_property
    def index(self) -> dict[str, int]:
        return {str(t): i for i, t in enumerate(self.vocab)}

    def rates(self, terms, alpha: float) -> np.ndarray:
        index = self.index
        counts = np.array([self.df[index[t]] if t in index else 0 for t in terms], dtype=float)
        return (counts + alpha) / (self.n_docs + 2 * alpha)


@dataclass
class PrimeResult:
    corpus: str
    doc_ids: list[str]
    titles: list[str]
    vocab: np.ndarray
    components: np.ndarray
    singular_values: np.ndarray
    variance_ratio: np.ndarray
    raw_scores: np.ndarray
    scores: np.ndarray
    shape: tuple[int, int]
    density: float
    orthogonality: float
    term_stats: TermStats
    params: dict = field(default_factory=dict)
    row_sq_norms: np.ndarray | None = None

    @property
    def k(self) -> int:
        return self.components.shape[0]

    def top_terms(self, component: int, n: int = 12, sign: int = 1) -> list[tuple[str, float]]:
        row = self.components[component] * sign
        order = np.argsort(-row)[:n]
        return [(str(self.vocab[i]), float(self.components[component, i])) for i in order]

    def residuals(self) -> np.ndarray:
        if self.row_sq_norms is None:
            raise ValueError("residuals need the row norms recorded at fit time")
        return np.clip(self.row_sq_norms - (self.raw_scores**2).sum(axis=1), 0, None)

    def term_weights(self) -> np.ndarray:
        w = np.sqrt(((self.singular_values[:, None] * self.components) ** 2).sum(axis=0))
        top = w.max()
        return w / top if top > 0 else w


def default_min_df(n_docs: int) -> int:
    return max(2, min(10, n_docs // 50))


def vectorize(
    texts: list[str],
    min_df: int,
    max_df: float,
    max_features: int,
) -> tuple[sp.csr_matrix, np.ndarray, TermStats]:
    cv = CountVectorizer(
        binary=True,
        lowercase=True,
        stop_words=list(ENGLISH_STOP_WORDS),
        token_pattern=TOKEN_PATTERN,
        dtype=np.float32,
    )
    full = cv.fit_transform(texts).tocsc()
    vocab = cv.get_feature_names_out()
    df = np.asarray(full.getnnz(axis=0)).ravel()
    stats = TermStats(vocab=vocab, df=df, n_docs=full.shape[0])
    keep = np.flatnonzero((df >= min_df) & (df <= max_df * full.shape[0]))
    if keep.size > max_features:
        order = np.lexsort((vocab[keep], -df[keep]))
        keep = np.sort(keep[order[:max_features]])
    return full[:, keep].tocsr(), vocab[keep], stats


def orthogonality_error(components: np.ndarray) -> float:
    gram = components @ components.T
    return float(np.abs(gram - np.eye(gram.shape[0])).max())


def _flip_signs(u: np.ndarray, vt: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    idx = np.argmax(np.abs(vt), axis=1)
    signs = np.sign(vt[np.arange(vt.shape[0]), idx])
    signs[signs == 0] = 1
    return u * signs, vt * signs[:, None]


def fit(
    corpus: str,
    docs: list[Doc],
    k: int = 12,
    min_df: int | None = None,
    max_df: float = 0.15,
    max_features: int = 30000,
    n_iter: int = 7,
    seed: int = 0,
) -> PrimeResult:
    if len(docs) <= k:
        raise ValueError(f"{corpus}: {len(docs)} documents is too few for {k} components")
    min_df = default_min_df(len(docs)) if min_df is None else min_df
    matrix, vocab, stats = vectorize([d.text for d in docs], min_df, max_df, max_features)
    params = {"min_df": min_df, "max_df": max_df, "max_features": max_features}
    return fit_matrix(corpus, matrix, vocab, [d.id for d in docs], [d.title for d in docs], stats, k, n_iter, seed, params)


def fit_matrix(
    corpus: str,
    matrix: sp.spmatrix,
    vocab: np.ndarray,
    doc_ids: list[str],
    titles: list[str],
    stats: TermStats,
    k: int = 12,
    n_iter: int = 7,
    seed: int = 0,
    params: dict | None = None,
) -> PrimeResult:
    matrix = sp.csr_matrix(matrix)
    if matrix.shape[0] <= k or matrix.shape[1] <= k:
        raise ValueError(f"{corpus}: a {matrix.shape[0]}x{matrix.shape[1]} matrix is too small for {k} components")
    u, s, vt = randomized_svd(matrix, n_components=k, n_iter=n_iter, random_state=seed)
    u, vt = _flip_signs(u, vt)
    raw = u * s
    col_mean = np.asarray(matrix.mean(axis=0)).ravel()
    col_sq_mean = np.asarray(matrix.multiply(matrix).mean(axis=0)).ravel()
    total_var = float((col_sq_mean - col_mean**2).sum())
    variance_ratio = raw.var(axis=0) / total_var if total_var > 0 else np.zeros(k)
    std = raw.std(axis=0)
    std[std == 0] = 1
    scores = (raw - raw.mean(axis=0)) / std
    row_sq = np.asarray(matrix.multiply(matrix).sum(axis=1)).ravel()
    return PrimeResult(
        corpus=corpus,
        doc_ids=list(doc_ids),
        titles=list(titles),
        vocab=vocab,
        components=vt,
        singular_values=s,
        variance_ratio=variance_ratio,
        raw_scores=raw,
        scores=scores,
        shape=(int(matrix.shape[0]), int(matrix.shape[1])),
        density=float(matrix.nnz / (matrix.shape[0] * matrix.shape[1])),
        orthogonality=orthogonality_error(vt),
        term_stats=stats,
        params={"k": k, "n_iter": n_iter, "seed": seed, **(params or {})},
        row_sq_norms=row_sq,
    )
