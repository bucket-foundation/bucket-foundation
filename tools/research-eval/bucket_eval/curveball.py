from __future__ import annotations

from typing import Callable, Hashable, Sequence

M32 = 0xFFFFFFFF

def _imul(a: int, b: int) -> int:
    return (a * b) & M32

def seeded_random(seed: str) -> Callable[[], float]:
    h = (1779033703 ^ (len(seed.encode("utf-16-le")) // 2)) & M32
    units = seed.encode("utf-16-le")
    codes = [int.from_bytes(units[k : k + 2], "little") for k in range(0, len(units), 2)]
    for code in codes:
        h = _imul(h ^ code, 3432918353)
        h = ((h << 13) | (h >> 19)) & M32
    state = [h]

    def draw() -> float:
        state[0] = (state[0] + 0x6D2B79F5) & M32
        t = state[0]
        t = _imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + _imul(t ^ (t >> 7), t | 61)) & M32)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296

    return draw

def curveball_trade(rows: list[list[int]], rand: Callable[[], float]) -> None:
    n = len(rows)
    if n < 2:
        return
    i = int(rand() * n)
    j = int(rand() * (n - 1))
    if j >= i:
        j += 1
    a = set(rows[i])
    b = set(rows[j])
    only_a = [x for x in rows[i] if x not in b]
    only_b = [x for x in rows[j] if x not in a]
    if not only_a or not only_b:
        return
    pool = only_a + only_b
    for k in range(len(pool) - 1, 0, -1):
        r = int(rand() * (k + 1))
        pool[k], pool[r] = pool[r], pool[k]
    shared = [x for x in rows[i] if x in b]
    rows[i] = shared + pool[: len(only_a)]
    rows[j] = shared + pool[len(only_a) :]

def scramble(rows: Sequence[Sequence[int]], seed: str, burn_in: int | None = None) -> list[list[int]]:
    out = [list(r) for r in rows]
    rand = seeded_random(seed)
    for _ in range(5 * len(out) if burn_in is None else burn_in):
        curveball_trade(out, rand)
    return out

def scramble_within(rows: Sequence[Sequence[int]], strata: Sequence[Hashable], seed: str) -> list[list[int]]:
    out = [list(r) for r in rows]
    groups: dict[Hashable, list[int]] = {}
    for idx, s in enumerate(strata):
        groups.setdefault(s, []).append(idx)
    for key in sorted(groups, key=str):
        members = groups[key]
        mixed = scramble([out[k] for k in members], f"{seed}:{key}")
        for k, row in zip(members, mixed):
            out[k] = row
    return out
