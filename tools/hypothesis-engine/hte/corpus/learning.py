from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from . import Corpus, RetrievalEnvelope
from .learning_extract import LLM_WORKERS, Extraction, ExtractionReport, Record, extract

_REPO_ROOT = Path(__file__).resolve().parents[4]

WORKS_PATHS: tuple[str, ...] = (
    "learning/corpus/works.jsonl",
    "learning/research/language/sla/works.jsonl",
    "learning/research/language/multilingual/works.jsonl",
    "learning/research/polymath/works.jsonl",
)
CLAIMS_PATH = "learning/corpus/claims.jsonl"
MECHANISMS_PATH = "learning/corpus/mechanisms.jsonl"
TALK_CLAIMS_PATH = "learning/research/language/talks/CLAIMS.md"

TIER_BY_STUDY_TYPE: dict[str, Tier] = {
    "meta-analysis": Tier.T1, "systematic-review": Tier.T1,
    "rct": Tier.T2, "field-experiment": Tier.T2, "replication": Tier.T2,
    "experiment": Tier.T3, "quasi-experiment": Tier.T3, "longitudinal": Tier.T3,
    "correlational": Tier.T4, "observational": Tier.T4, "cross-sectional": Tier.T4,
    "pre-post": Tier.T4, "corpus": Tier.T4, "psychometric": Tier.T4, "survey": Tier.T4,
    "case-study": Tier.T5, "qualitative": Tier.T5, "review": Tier.T5,
}
DEFAULT_WORK_TIER = Tier.T6
TALK_TIER = Tier.T6
DEFAULT_EXTRACT_CACHE = Path(__file__).resolve().parents[1] / "data" / "llm-cache-learning"

MECHANISMS: dict[str, tuple[str, ...]] = {
    "lexical_proximity": (r"cognate", r"lexical similarit", r"related[- ]language", r"typolog", r"linguistic distance", r"mutual(ly)? intelligib", r"language distance", r"romance language"),
    "comprehensible_input": (r"comprehensible input", r"input hypothesis", r"\binput\b", r"extensive reading", r"extensive listening", r"reading[- ]while[- ]listening", r"exposure"),
    "output_practice": (r"output hypothesis", r"\boutput\b", r"speaking practice", r"shadowing", r"interaction hypothesis"),
    "explicit_instruction": (r"explicit instruction", r"form[- ]focused", r"focus on form", r"grammar instruction", r"explicit knowledge"),
    "corrective_feedback": (r"corrective feedback", r"recast", r"\bfeedback\b"),
    "spacing": (r"spac(ed|ing)", r"distributed practice", r"successive relearning", r"\bsrs\b", r"lag effect"),
    "retrieval_practice": (r"retrieval practice", r"testing effect", r"practice test", r"self-test", r"\bquizz"),
    "interleaving": (r"interleav",),
    "deliberate_practice": (r"deliberate practice", r"practice hours", r"hours of practice", r"10,000"),
    "cognitive_training": (r"working[- ]memory training", r"brain training", r"cognitive training", r"chess", r"music(al)? training"),
    "aptitude": (r"aptitude", r"\bmlat\b", r"working[- ]memory capacity", r"\biq\b", r"general intelligence", r"talent"),
    "age_of_onset": (r"age of onset", r"age of acquisition", r"critical period", r"sensitive period", r"early start", r"late learner"),
    "motivation": (r"motivat", r"grit", r"interest", r"self-determination"),
    "anxiety": (r"anxiety", r"affective filter", r"\bstress\b"),
    "vocabulary_coverage": (r"word famil", r"lexical coverage", r"known tokens", r"vocabulary size", r"high-frequency words"),
    "mastery_learning": (r"mastery learning", r"\bmastery\b"),
    "tutoring": (r"tutor",),
    "worked_examples": (r"worked example", r"cognitive load"),
    "elaboration": (r"elaborat", r"self-explanation", r"generation effect"),
    "metacognition": (r"metacogni", r"self-regulat", r"calibration of", r"judgments? of learning"),
    "multilingual_transfer": (r"cross-linguistic influence", r"\bl3\b", r"third language", r"bilingual advantage", r"multilingual", r"transfer from"),
    "breadth_of_domains": (r"polymath", r"breadth", r"generalist", r"multiple domains", r"diverse experience", r"sampling period"),
}

OUTCOMES: dict[str, tuple[str, ...]] = {
    "time_to_proficiency": (r"hours", r"time to", r"class weeks", r"\bfsi\b", r"rate of acquisition", r"learning rate", r"faster", r"speed"),
    "comprehension": (r"comprehen", r"intelligib", r"reading", r"listening"),
    "proficiency": (r"proficien", r"fluen", r"nativelike", r"native-like", r"attainment", r"grammar", r"accuracy"),
    "vocabulary_gain": (r"vocabular", r"word learning", r"lexical"),
    "retention": (r"retention", r"recall", r"remember", r"forget", r"long-term memory", r"retain"),
    "transfer": (r"\btransfer\b", r"far transfer", r"generaliz"),
    "achievement": (r"achievement", r"test scores?", r"exam", r"grades?", r"\d?σ", r"effect size", r"\bg\s?[≈=]", r"\bd\s?[≈=]"),
    "expert_performance": (r"expert", r"elite", r"performance", r"creativ", r"innovation", r"nobel", r"eminen"),
    "persistence": (r"persist", r"dropout", r"engagement", r"streak", r"adherence"),
}

TOPIC_OUTCOME_FALLBACK: dict[str, str] = {
    "memory": "retention", "transfer": "transfer", "motivation": "persistence",
    "language": "proficiency", "mastery": "achievement", "practice": "expert_performance",
    "feedback": "achievement", "metacognition": "achievement", "assessment": "achievement",
}

NEGATION_RE = re.compile(
    r"\b(no (significant |reliable |measurable |clear )?(effect|difference|advantage|benefit|evidence|gain)s?"
    r"|did not|does not|do not|failed to|null result|no better|unrelated|not predict|not improve|little evidence"
    r"|almost no|contradicts?|null|rarely|no convincing|not convincing|shrinks?|vanish(es|ed)?|did not replicate"
    r"|no (far |near )?transfer|little or no|not supported)\b",
    re.IGNORECASE,
)

_MECH_RES = {k: [re.compile(p, re.IGNORECASE) for p in v] for k, v in MECHANISMS.items()}
_OUT_RES = {k: [re.compile(p, re.IGNORECASE) for p in v] for k, v in OUTCOMES.items()}

TALK_VERDICTS = ("CONFIRMS", "CONTRADICTS", "MIXED", "UNTESTED")

def resolve_root(root: str | Path | None = None) -> Path:
    if root is not None:
        return Path(root)
    env = os.environ.get("HTE_LEARNING_ROOT")
    return Path(env) if env else _REPO_ROOT

def tag_mechanisms(text: str) -> list[str]:
    return [k for k, res in _MECH_RES.items() if any(r.search(text) for r in res)]

def tag_outcomes(text: str, topics: Iterable[str] = ()) -> list[str]:
    found = [k for k, res in _OUT_RES.items() if any(r.search(text) for r in res)]
    if found:
        return found
    for topic in topics:
        if topic in TOPIC_OUTCOME_FALLBACK:
            return [TOPIC_OUTCOME_FALLBACK[topic]]
    return []

def text_stance(text: str) -> Stance:
    return Stance.NEGATIVE if NEGATION_RE.search(text) else Stance.POSITIVE

def work_tier(study_type: str | None) -> Tier:
    if not study_type:
        return DEFAULT_WORK_TIER
    return TIER_BY_STUDY_TYPE.get(study_type.strip().lower(), DEFAULT_WORK_TIER)

@dataclass(frozen=True)
class TalkClaim:
    number: int
    claim: str
    source: str
    research: str
    verdict: str

@dataclass
class LearningCorpus:
    corpus: Corpus
    works: dict[str, dict] = field(default_factory=dict)
    claims: list[dict] = field(default_factory=list)
    mechanisms: list[dict] = field(default_factory=list)
    talk_claims: list[TalkClaim] = field(default_factory=list)
    skipped: dict[str, int] = field(default_factory=dict)
    effects: dict[str, str] = field(default_factory=dict)
    extraction: ExtractionReport | None = None
    records: int = 0

def read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}:{lineno}: invalid JSON: {exc}") from exc
    return rows

def parse_talk_claims(text: str) -> list[TalkClaim]:
    out: list[TalkClaim] = []
    for line in text.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 4 or not cells[0].isdigit():
            continue
        research = cells[3]
        head = research.split(".")[0].upper()
        verdict = next((v for v in TALK_VERDICTS if head.startswith(v)), "UNTESTED")
        out.append(TalkClaim(number=int(cells[0]), claim=cells[1], source=cells[2], research=research, verdict=verdict))
    return out

def _span(doc_id: str, locator: str, quote: str) -> EvidenceSpan:
    quote = quote[:400]
    return EvidenceSpan(doc_id=doc_id, locator=locator, quote=quote, char_start=0, char_end=len(quote), doc_length=len(quote))

def _flip(stance: Stance) -> Stance:
    return Stance.NEGATIVE if stance is Stance.POSITIVE else Stance.POSITIVE

def _items(
    *, base_id: str, kind: EvidenceKind, tier: Tier, source_id: str, locator: str, quote: str,
    provenance: str, extractions: list[Extraction], flip: bool, effects: dict[str, str],
) -> list[EvidenceItem]:
    share = 1.0 / len(extractions) if extractions else 0.0
    out: list[EvidenceItem] = []
    for x in extractions:
        stance = Stance.NEGATIVE if x.opposes else Stance.POSITIVE
        if flip:
            stance = _flip(stance)
        eid = f"{base_id}#{x.mechanism}>{x.outcome}:{x.direction}"
        if x.effect_size:
            effects[eid] = x.effect_size
        out.append(EvidenceItem(
            id=eid, kind=kind, tier=tier, source_id=source_id, span=_span(source_id, locator, quote),
            provenance=provenance, views={"pair_share": share}, mechanism=x.mechanism, object=x.outcome, stance=stance,
        ))
    return out

def _work_text(w: dict) -> str:
    return " ".join(filter(None, [w.get("title"), w.get("finding")]))

def _claim_text(c: dict) -> str:
    return " ".join(filter(None, [c.get("name"), c.get("statement")]))

def load(
    root: str | Path | None = None, *, include_talks: bool = True, mode: str | None = "fake",
    cache_dir: str | Path | None = None, replay_only: bool = False,
) -> LearningCorpus:
    base = resolve_root(root)
    works: dict[str, dict] = {}
    found_paths: list[str] = []
    for rel in WORKS_PATHS:
        path = base / rel
        if not path.is_file():
            continue
        found_paths.append(rel)
        for w in read_jsonl(path):
            works.setdefault(w["id"], {**w, "_path": rel})
    claims_file = base / CLAIMS_PATH
    if not claims_file.is_file() and not found_paths:
        raise FileNotFoundError(f"no learning corpus under {base}: expected {CLAIMS_PATH} or one of {WORKS_PATHS}")
    claims = read_jsonl(claims_file) if claims_file.is_file() else []
    mech_file = base / MECHANISMS_PATH
    mechanisms = read_jsonl(mech_file) if mech_file.is_file() else []
    talk_file = base / TALK_CLAIMS_PATH
    talk_claims = parse_talk_claims(talk_file.read_text(encoding="utf-8")) if include_talks and talk_file.is_file() else []

    live_works = {wid: w for wid, w in works.items() if not w.get("withdrawn")}
    records = [Record(f"work:{wid}", _work_text(w)) for wid, w in live_works.items() if w.get("finding")]
    records += [Record(f"claim:{c['id']}", _claim_text(c)) for c in claims]
    records += [Record(f"talk:{t.number}", t.claim) for t in talk_claims]
    report = extract(records, mode=mode, cache_dir=cache_dir or DEFAULT_EXTRACT_CACHE, replay_only=replay_only)

    corpus = Corpus()
    effects: dict[str, str] = {}
    skipped = {
        "withdrawn": len(works) - len(live_works), "no_finding": 0, "untagged_work": 0, "untagged_claim": 0,
        "dangling_work_ref": 0, "untagged_talk": 0, "untested_talk": 0,
    }
    fetched_at = datetime.now(timezone.utc).isoformat()

    for wid, w in live_works.items():
        corpus.sources[wid] = Source(
            id=wid, kind=EvidenceKind.TEXTUAL, date=str(w["year"]) if w.get("year") else None,
            authors=list(w.get("authors") or []), method=w.get("study_type"),
        )
        corpus.provenance.append(RetrievalEnvelope(
            retrieval_run_id="learning-corpus", doc_id=wid, source_path=w["_path"], fetched_at=fetched_at, fixture=False,
        ))
        if not w.get("finding"):
            skipped["no_finding"] += 1
            continue
        exts = report.by_id.get(f"work:{wid}", [])
        if not exts:
            skipped["untagged_work"] += 1
            continue
        corpus.evidence.extend(_items(
            base_id=f"work:{wid}", kind=EvidenceKind.TEXTUAL, tier=work_tier(w.get("study_type")), source_id=wid,
            locator=w["_path"], quote=w["finding"], provenance=f"works.jsonl:{wid}", extractions=exts, flip=False,
            effects=effects,
        ))

    for c in claims:
        exts = report.by_id.get(f"claim:{c['id']}", [])
        if not exts:
            skipped["untagged_claim"] += 1
            continue
        for flip, refs in ((False, c.get("supports") or []), (True, c.get("contradicted_by") or [])):
            for wid in refs:
                if wid not in corpus.sources:
                    skipped["dangling_work_ref"] += 1
                    continue
                corpus.evidence.extend(_items(
                    base_id=f"claim:{c['id']}@{wid}", kind=EvidenceKind.TEXTUAL,
                    tier=work_tier(works.get(wid, {}).get("study_type")), source_id=wid, locator=CLAIMS_PATH,
                    quote=c.get("statement") or "", provenance=f"claims.jsonl:{c['id']}", extractions=exts,
                    flip=flip, effects=effects,
                ))

    for t in talk_claims:
        sid = f"talk:{t.number}"
        exts = report.by_id.get(sid, [])
        if not exts:
            skipped["untagged_talk"] += 1
            continue
        flips = {"CONFIRMS": [False], "CONTRADICTS": [True], "MIXED": [False, True]}.get(t.verdict, [])
        if not flips:
            skipped["untested_talk"] += 1
            continue
        corpus.sources[sid] = Source(id=sid, kind=EvidenceKind.MODEL_PRIOR, method="practitioner-talk")
        for flip in flips:
            corpus.evidence.extend(_items(
                base_id=f"{sid}:{'contra' if flip else 'pro'}", kind=EvidenceKind.MODEL_PRIOR, tier=TALK_TIER,
                source_id=sid, locator=f"{TALK_CLAIMS_PATH}#{t.number}", quote=f"{t.claim} {t.research}",
                provenance=f"CLAIMS.md:{t.number}", extractions=exts, flip=flip, effects=effects,
            ))

    return LearningCorpus(
        corpus=corpus, works=works, claims=claims, mechanisms=mechanisms, talk_claims=talk_claims, skipped=skipped,
        effects=effects, extraction=report, records=len(records),
    )

def load_corpus(root: str | Path | None = None, **kwargs) -> Corpus:
    return load(root, **kwargs).corpus

__all__ = [
    "LearningCorpus", "TalkClaim", "load", "load_corpus", "parse_talk_claims", "read_jsonl", "resolve_root",
    "tag_mechanisms", "tag_outcomes", "text_stance", "work_tier", "MECHANISMS", "OUTCOMES",
]
