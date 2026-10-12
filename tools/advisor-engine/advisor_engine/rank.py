from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from dataclasses import dataclass, field

W_TOPIC = 1.0
W_FIELD = 0.25
TEXT_TOPICS = 12
TEXT_COVER = 0.6
INSTITUTION_CAP = 3
CAP_WINDOW = 50
STOP = frozenset(
    "a an and are as at be by for from in into is it of on or that the their this to with i my we our study studies studying research "
    "want would like interested interest work working using use based new".split()
)


def tokens(text: str) -> list[str]:
    out = []
    for t in re.findall(r"[a-z0-9]+", (text or "").lower()):
        if t in STOP or len(t) < 2:
            continue
        out.append(t[:-1] if len(t) > 3 and t.endswith("s") and not t.endswith("ss") else t)
    return out


@dataclass
class Advisor:
    rid: int
    tier: str
    cluster: int
    country: str | None
    field: str | None
    topics: tuple[str, ...]
    inst: str | None
    students: int
    sources: tuple[str, ...]
    grant_count: int | None
    first_year: int | None
    last_year: int | None


@dataclass
class Scored:
    advisor: Advisor
    score: float
    shared_topics: list[str] = field(default_factory=list)
    shared_fields: list[str] = field(default_factory=list)


class Index:
    def __init__(self, topics: dict[str, tuple[str, str]], advisors: list[Advisor]):
        self.topics = topics
        self.advisors = advisors
        self.fields = sorted({f for _, f in topics.values() if f})
        n = len(advisors) or 1
        tdf: Counter = Counter()
        fdf: Counter = Counter()
        for a in advisors:
            tdf.update(set(a.topics))
            fdf.update(self.fields_of(a))
        self.tidf = {t: math.log((n + 1) / (tdf[t] + 1)) + 1 for t in topics}
        self.fidf = {f: math.log((n + 1) / (fdf[f] + 1)) + 1 for f in self.fields}
        self.name_tokens = {t: set(tokens(name)) for t, (name, _) in topics.items()}
        wdf: Counter = Counter()
        for toks in self.name_tokens.values():
            wdf.update(toks)
        m = len(topics) or 1
        self.widf = {w: math.log((m + 1) / (c + 1)) + 1 for w, c in wdf.items()}

    def fields_of(self, a: Advisor) -> set[str]:
        out = {self.topics[t][1] for t in a.topics if t in self.topics and self.topics[t][1]}
        if a.field:
            out.add(a.field)
        return out

    def resolve_topic(self, wanted: str) -> list[str]:
        w = wanted.strip()
        if w in self.topics:
            return [w]
        low = w.lower()
        exact = [t for t, (name, _) in self.topics.items() if (name or "").lower() == low]
        if exact:
            return exact
        return self.text_topics(w, limit=3)

    def text_topics(self, text: str, limit: int = TEXT_TOPICS) -> list[str]:
        have = set(tokens(text))
        scored = []
        for t, toks in self.name_tokens.items():
            if not toks:
                continue
            total = sum(self.widf[w] for w in toks)
            hit = sum(self.widf[w] for w in toks & have)
            if hit / total >= TEXT_COVER:
                scored.append((hit / total, hit, t))
        scored.sort(key=lambda s: (-s[0], -s[1], s[2]))
        return [t for _, _, t in scored[:limit]]

    def score(self, query_topics: list[str], a: Advisor) -> Scored:
        q = [t for t in dict.fromkeys(query_topics) if t in self.topics]
        if not q:
            return Scored(a, 0.0)
        shared = [t for t in q if t in a.topics]
        qf = {self.topics[t][1] for t in q if self.topics[t][1]}
        sf = sorted(qf & self.fields_of(a))
        topic_part = sum(self.tidf[t] for t in shared) / sum(self.tidf[t] for t in q)
        field_part = sum(self.fidf[f] for f in sf) / sum(self.fidf[f] for f in qf) if qf else 0.0
        return Scored(a, W_TOPIC * topic_part + W_FIELD * field_part, shared, sf)


def tie(seed: str, rid: int) -> str:
    return hashlib.sha256(f"{seed}:{rid}".encode()).hexdigest()


def order(scored: list[Scored], seed: str) -> list[Scored]:
    ranked = sorted(scored, key=lambda s: (-s.score, tie(seed, s.advisor.rid)))
    head, held = [], []
    per: Counter = Counter()
    for s in ranked:
        inst = s.advisor.inst
        if len(head) < CAP_WINDOW and inst and per[inst] >= INSTITUTION_CAP:
            held.append(s)
            continue
        if len(head) < CAP_WINDOW:
            per[inst] += 1
            head.append(s)
        else:
            held.append(s)
    return head + sorted(held, key=lambda s: (-s.score, tie(seed, s.advisor.rid)))
