"""Chunks of a source body for the encoder, as byte spans.

IMPLEMENTATION.md, "Source identities": 192 word pieces per chunk with 32
of overlap, counted by the model's own tokenizer. A chunk is recorded as a
half-open byte span of the normalized body, so the server can hydrate its
text from the corpus and a chunk never carries text of its own.
"""

from __future__ import annotations

from dataclasses import dataclass

from .normalize import char_to_byte

CHUNK_TOKENS = 192
CHUNK_OVERLAP = 32


@dataclass(frozen=True)
class Chunk:
    start: int
    end: int
    tokens: int


def chunk_spans(text: str, tokenizer, size: int = CHUNK_TOKENS, overlap: int = CHUNK_OVERLAP) -> list[Chunk]:
    """Windows over `text`'s word pieces. `tokenizer` is a `tokenizers.Tokenizer`."""
    if size <= overlap or overlap < 0:
        raise ValueError("size must exceed overlap, and overlap cannot be negative")
    # A tokenizer file can carry the model's truncation length, and encode
    # would then return only the first window, dropping the rest of the body.
    if getattr(tokenizer, "truncation", None):
        raise ValueError("the tokenizer truncates; call no_truncation() before chunking")
    enc = tokenizer.encode(text, add_special_tokens=False)
    offsets = [(a, b) for (a, b) in enc.offsets if b > a]
    if not offsets:
        return []
    step = size - overlap
    chunks: list[Chunk] = []
    i = 0
    while True:
        window = offsets[i : i + size]
        start = char_to_byte(text, window[0][0])
        end = char_to_byte(text, window[-1][1])
        chunks.append(Chunk(start, end, len(window)))
        if i + size >= len(offsets):
            break
        i += step
    return chunks
