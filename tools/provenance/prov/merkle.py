from __future__ import annotations

import hashlib

LEAF = b"\x00"
NODE = b"\x01"


def _h(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def _pad(level: list[bytes]) -> list[bytes]:
    return level + [level[-1]] if len(level) % 2 else level


def root_v1(file_hashes: list[str]) -> str:
    level = [bytes.fromhex(h) for h in file_hashes]
    if not level:
        raise ValueError("empty manifest")
    while len(level) > 1:
        level = _pad(level)
        level = [_h(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
    return level[0].hex()


def proof_v1(file_hashes: list[str], index: int) -> list[tuple[str, str]]:
    level = [bytes.fromhex(h) for h in file_hashes]
    path = []
    while len(level) > 1:
        level = _pad(level)
        sib = index ^ 1
        path.append(("L" if sib < index else "R", level[sib].hex()))
        level = [_h(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        index //= 2
    return path


def verify_v1(file_hash: str, path: list[tuple[str, str]], root: str) -> bool:
    node = bytes.fromhex(file_hash)
    for side, sib in path:
        s = bytes.fromhex(sib)
        node = _h(s + node) if side == "L" else _h(node + s)
    return node.hex() == root


def leaf_v2(canonical_row: bytes) -> bytes:
    return _h(LEAF + canonical_row)


def _levels_v2(leaves: list[bytes]) -> list[list[bytes]]:
    if not leaves:
        raise ValueError("empty manifest")
    levels = [leaves]
    while len(levels[-1]) > 1:
        cur = levels[-1]
        nxt = [_h(NODE + cur[i] + cur[i + 1]) for i in range(0, len(cur) - 1, 2)]
        if len(cur) % 2:
            nxt.append(cur[-1])
        levels.append(nxt)
    return levels


def root_v2(canonical_rows: list[bytes]) -> str:
    return _levels_v2([leaf_v2(r) for r in canonical_rows])[-1][0].hex()


def proof_v2(canonical_rows: list[bytes], index: int) -> list[tuple[str, str]]:
    levels = _levels_v2([leaf_v2(r) for r in canonical_rows])
    path = []
    for level in levels[:-1]:
        sib = index ^ 1
        if sib < len(level):
            path.append(("L" if sib < index else "R", level[sib].hex()))
        index //= 2
    return path


def verify_v2(canonical_row: bytes, path: list[tuple[str, str]], root: str) -> bool:
    node = leaf_v2(canonical_row)
    for side, sib in path:
        s = bytes.fromhex(sib)
        node = _h(NODE + s + node) if side == "L" else _h(NODE + node + s)
    return node.hex() == root
