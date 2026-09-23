from __future__ import annotations

import hashlib
import unicodedata

NORMALIZATION = "nfc-lf/1"

class OffsetError(ValueError):
    pass

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
    return len(text[:char_offset].encode("utf-8"))
