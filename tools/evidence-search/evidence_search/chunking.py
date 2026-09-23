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
    if size <= overlap or overlap < 0:
        raise ValueError("size must exceed overlap, and overlap cannot be negative")
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
