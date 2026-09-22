"""Text normalization and byte spans, the Python side of nfc-lf/1.

The TypeScript side is src/lib/research-os/evidence/text.ts. Both are held
to src/lib/research-os/evidence/normalization-fixtures.json: drop a leading
byte-order mark, turn CRLF and lone CR into LF, then Unicode NFC. A span is
a half-open [start, end) range of UTF-8 bytes, and an offset inside a
multibyte character is refused.
"""

from __future__ import annotations

import hashlib
import unicodedata

NORMALIZATION = "nfc-lf/1"


class OffsetError(ValueError):
    """A byte offset outside the text or inside a character."""


def normalize_text(raw: str) -> str:
    if raw.startswith("﻿"):
        raw = raw[1:]
    return unicodedata.normalize("NFC", raw.replace("\r\n", "\n").replace("\r", "\n"))


def sha256_hex(data: str | bytes) -> str:
    return hashlib.sha256(data.encode("utf-8") if isinstance(data, str) else data).hexdigest()


def on_boundary(data: bytes, offset: int) -> bool:
    if offset < 0 or offset > len(data):
        return False
    return offset == len(data) or (data[offset] & 0xC0) != 0x80


def byte_slice(text: str, start: int, end: int) -> str:
    data = text.encode("utf-8")
    if start < 0 or end > len(data) or start > end:
        raise OffsetError(f"span [{start}, {end}) is outside a text of {len(data)} bytes")
    if not on_boundary(data, start):
        raise OffsetError(f"start {start} falls inside a multibyte character")
    if not on_boundary(data, end):
        raise OffsetError(f"end {end} falls inside a multibyte character")
    return data[start:end].decode("utf-8")


def char_to_byte(text: str, char_offset: int) -> int:
    """The UTF-8 byte offset of a code point offset into `text`."""
    return len(text[:char_offset].encode("utf-8"))
