from __future__ import annotations

import re
import unicodedata

from .paths import EngineError

LOCAL = r"(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}"
LABEL = r"[A-Za-z0-9-]{1,63}"
AT = r"\s*(?:@|\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|<\s*at\s*>)\s*"
DOT = r"\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|<\s*dot\s*>)\s*"
SPOKEN = rf"{LOCAL}\s+at\s+{LABEL}(?:\s+dot\s+{LABEL})+"
ADDRESS = re.compile(rf"{LOCAL}{AT}{LABEL}(?:{DOT}{LABEL})+|{SPOKEN}", re.I)


class AddressFound(EngineError):
    pass


def has_address(text: str) -> bool:
    return bool(ADDRESS.search(unicodedata.normalize("NFKC", text)))


def assert_clean(text: str) -> str:
    if has_address(text):
        raise AddressFound("the output held an address, so nothing was written")
    return text
