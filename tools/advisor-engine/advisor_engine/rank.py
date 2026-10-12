from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from dataclasses import dataclass, field

W_TOPIC = 1.0
W_SUBFIELD = 0.5
W_FIELD = 0.25
TEXT_TOPICS = 8
TEXT_COVER = 0.5
BODY_SHARE = 0.6
NAME_WEIGHT = 3.0
INSTITUTION_CAP = 3
CAP_WINDOW = 50
STOP = frozenset(
    "a an and are as at be by for from in into is it of on or that the their this to with i my we our study studies studying research "
    "want would like interested interest work working using use based new also various including related cluster paper papers cover covers "
    "aspect aspects topic topics focus focuses explore explores such well other between its role impact effect effects application".split()
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
    shared_subfields: list[str] = field(default_factory=list)
    shared_fields: list[str] = field(default_factory=list)


def idf(n: int, df: int) -> float:
    return math.log((n + 1) / (df + 1)) + 1


def part(shared, wanted, weights) -> float:
    total = sum(weights[x] for x in wanted)
    return sum(weights[x] for x in shared) / total if total else 0.0


class Index:
    def __init__(self, topics: dict[str, tuple[str, str]], advisors: list[Advisor], subfields: dict[str, str] | None = None, bodies: dict[str, str] | None = None):
        self.topics = topics
        self.advisors = advisors
        self.subfields = subfields or {}
        self.fields = sorted({f for _, f in topics.values() if f})
        n = len(advisors)
        tdf: Counter = Counter()
        sdf: Counter = Counter()
        fdf: Counter = Counter()
        for a in advisors:
            tdf.update(set(a.topics))
            sdf.update(self.subfields_of(a))
            fdf.update(self.fields_of(a))
        self.tidf = {t: idf(n, tdf[t]) for t in topics}
        self.sidf = {s: idf(n, sdf[s]) for s in set(self.subfields.values())}
        self.fidf = {f: idf(n, fdf[f]) for f in self.fields}
        self.name_tokens = {t: set(tokens(name)) for t, (name, _) in topics.items()}
        self.body_tokens = {t: set(tokens(b)) | self.name_tokens.get(t, set()) for t, b in (bodies or {}).items() if t in topics}
        wdf: Counter = Counter()
        for t in topics:
            wdf.update(self.body_tokens.get(t) or self.name_tokens[t])
        self.widf = {w: idf(len(topics), c) for w, c in wdf.items()}

    def fields_of(self, a: Advisor) -> set[str]:
        out = {self.topics[t][1] for t in a.topics if t in self.topics and self.topics[t][1]}
        if a.field:
            out.add(a.field)
        return out

    def subfields_of(self, a: Advisor) -> set[str]:
        return {self.subfields[t] for t in a.topics if t in self.subfields}

    def resolve_topic(self, wanted: str) -> list[str]:
        w = wanted.strip()
        if w in self.topics:
            return [w]
        low = w.lower()
        exact = [t for t, (name, _) in self.topics.items() if (name or "").lower() == low]
        return exact or self.text_topics(w, limit=3)

    def text_topics(self, text: str, limit: int = TEXT_TOPICS) -> list[str]:
        have = set(tokens(text))
        if self.body_tokens:
            scored = []
            for t, toks in self.body_tokens.items():
                shared = toks & have
                if shared:
                    names = self.name_tokens[t]
                    scored.append((sum(self.widf[w] * (NAME_WEIGHT if w in names else 1.0) for w in shared), t))
            if not scored:
                return []
            best = max(s for s, _ in scored)
            keep = sorted(((s, t) for s, t in scored if s >= BODY_SHARE * best), key=lambda x: (-x[0], x[1]))
            return [t for _, t in keep[:limit]]
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
        qs = {self.subfields[t] for t in q if t in self.subfields}
        qf = {self.topics[t][1] for t in q if self.topics[t][1]}
        ss = sorted(qs & self.subfields_of(a))
        sf = sorted(qf & self.fields_of(a))
        total = W_TOPIC * part(shared, q, self.tidf) + W_SUBFIELD * part(ss, qs, self.sidf) + W_FIELD * part(sf, qf, self.fidf)
        covered = {self.subfields.get(t) for t in shared}
        return Scored(a, total, shared, [s for s in ss if s not in covered], sf)


def tie(seed: str, rid: int) -> str:
    return hashlib.sha256(f"{seed}:{rid}".encode()).hexdigest()


def order(scored: list[Scored], seed: str) -> list[Scored]:
    ranked = sorted(scored, key=lambda s: (-s.score, tie(seed, s.advisor.rid)))
    head, held = [], []
    per: Counter = Counter()
    for s in ranked:
        inst = s.advisor.inst
        if len(head) < CAP_WINDOW and not (inst and per[inst] >= INSTITUTION_CAP):
            per[inst] += 1
            head.append(s)
        else:
            held.append(s)
    return head + held
