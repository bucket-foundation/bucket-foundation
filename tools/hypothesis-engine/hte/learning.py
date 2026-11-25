from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

from . import llm, meta, unknowns
from .belief import Opinion, fuse
from .corpus import learning as learning_corpus
from .evidence import TIER_WEIGHT, EvidenceItem, Stance

DOMAIN = "learning"
IGNORANCE_W = 2.0
BASE_RATE = 0.5
JUDGE_WEIGHT = 2.0
DEFAULT_JUDGE_TOP = 12
GAP_U_THRESHOLD = 0.5
CONFLICT_FLAG = 0.4
THIN_FLAG = 0.5
SETTLED_P = 0.8
DEFAULT_CACHE_DIR = Path(__file__).resolve().parent / "data" / "llm-cache-learning"

SEED_TARGETS: tuple[tuple[str, str], ...] = (
    ("lexical_proximity", "time_to_proficiency"),
    ("lexical_proximity", "comprehension"),
    ("comprehensible_input", "proficiency"),
    ("vocabulary_coverage", "comprehension"),
    ("spacing", "retention"),
    ("retrieval_practice", "retention"),
    ("age_of_onset", "proficiency"),
    ("aptitude", "time_to_proficiency"),
    ("deliberate_practice", "expert_performance"),
    ("breadth_of_domains", "expert_performance"),
    ("multilingual_transfer", "time_to_proficiency"),
)

JUDGE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["verdict", "confidence", "rationale"],
    "properties": {
        "verdict": {"type": "string", "enum": ["supports", "refutes", "mixed", "insufficient"]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "rationale": {"type": "string"},
    },
}

@dataclass
class LearningHypothesis:
    mechanism: str
    outcome: str
    supports: list[str] = field(default_factory=list)
    refutes: list[str] = field(default_factory=list)
    seeded: bool = False
    opinion: Opinion | None = None
    judge: dict[str, Any] | None = None
    effects: list[str] = field(default_factory=list)
    meta: meta.MetaResult | None = None
    q_bh: float | None = None

    @property
    def conflict(self) -> float:
        o = self.opinion
        if o is None or o.b + o.d == 0:
            return 0.0
        return 1.0 - abs(o.b - o.d) / (o.b + o.d)

    @property
    def flags(self) -> list[str]:
        o = self.opinion
        out = []
        if self.supports and self.refutes and self.conflict >= CONFLICT_FLAG:
            out.append("conflict")
        if o is not None and o.u >= THIN_FLAG:
            out.append("thin")
        if o is not None and o.project() >= SETTLED_P and o.u < THIN_FLAG and self.conflict < CONFLICT_FLAG:
            out.append("settled")
        return out

    @property
    def surprise(self) -> float:
        o = self.opinion
        if o is None or not (self.supports or self.refutes):
            return 0.0
        return max(self.conflict, o.u) * (1.0 - abs(o.project() - 0.5))

    @property
    def id(self) -> str:
        return f"{self.mechanism}>{self.outcome}"

    @property
    def address(self) -> int:
        return int(hashlib.sha256(self.id.encode()).hexdigest()[:12], 16)

    @property
    def statement(self) -> str:
        return f"{self.mechanism.replace('_', ' ')} predicts {self.outcome.replace('_', ' ')}"

    def to_dict(self) -> dict[str, Any]:
        o = self.opinion
        return {
            "id": self.id, "address": self.address, "mechanism": self.mechanism, "outcome": self.outcome,
            "statement": self.statement, "seeded": self.seeded,
            "supports": list(self.supports), "refutes": list(self.refutes),
            "opinion": o.to_dict() if o else None, "P": o.project() if o else None, "judge": self.judge,
            "effects": list(self.effects), "meta": self.meta.to_dict() if self.meta else None, "q_bh": self.q_bh, "conflict": self.conflict, "surprise": self.surprise, "flags": self.flags,
        }

def _side_weight(items: Sequence[EvidenceItem]) -> float:
    best: dict[str, float] = {}
    for item in items:
        w = TIER_WEIGHT[item.tier] * item.views.get("pair_share", 1.0)
        best[item.source_id] = max(best.get(item.source_id, 0.0), w)
    return sum(best.values())

def grade(pos: Sequence[EvidenceItem], neg: Sequence[EvidenceItem]) -> Opinion:
    return Opinion.from_evidence(_side_weight(pos), _side_weight(neg), IGNORANCE_W, BASE_RATE)

def build_hypotheses(evidence: Sequence[EvidenceItem], seeds: Sequence[tuple[str, str]] = SEED_TARGETS) -> list[LearningHypothesis]:
    by_key: dict[tuple[str, str], LearningHypothesis] = {}
    groups: dict[tuple[str, str], tuple[list[EvidenceItem], list[EvidenceItem]]] = {}
    for m, o in seeds:
        by_key[(m, o)] = LearningHypothesis(mechanism=m, outcome=o, seeded=True)
        groups[(m, o)] = ([], [])
    for item in evidence:
        if item.mechanism is None or item.object is None:
            continue
        key = (item.mechanism, item.object)
        h = by_key.setdefault(key, LearningHypothesis(mechanism=key[0], outcome=key[1]))
        pos, neg = groups.setdefault(key, ([], []))
        if item.stance is Stance.NEGATIVE:
            neg.append(item)
            h.refutes.append(item.id)
        else:
            pos.append(item)
            h.supports.append(item.id)
    for key, h in by_key.items():
        h.opinion = grade(*groups[key])
    return list(by_key.values())

def rank(hypotheses: Sequence[LearningHypothesis]) -> list[LearningHypothesis]:
    return sorted(hypotheses, key=lambda h: (-(h.opinion.project() if h.opinion else 0.0), h.opinion.u if h.opinion else 1.0, h.id))

BUCKET_MEASURES: dict[str, tuple[str, str]] = {
    "spacing": ("review interval in days before an attempt, from the FSRS schedule", "mixed-effects logistic regression of recall on interval arm with a learner random intercept"),
    "retrieval_practice": ("quiz attempts versus lesson rereads per atom", "two-sample t-test on delayed recall, retrieval vs reread arm"),
    "interleaving": ("share of a session drawn from more than one deck", "two-sample t-test on delayed test score, interleaved vs blocked sessions"),
    "mastery_learning": ("advancing on mastery threshold versus on schedule", "two-sample t-test on unit test score"),
    "corrective_feedback": ("feedback shown after a wrong answer", "two-sample t-test on next-attempt accuracy, feedback vs no-feedback arm"),
    "tutoring": ("Socratic tutor sessions per learner", "two-sample t-test on assessment score, tutor vs no-tutor arm"),
    "ai_assistance": ("AI tutor use during practice", "two-sample t-test on unassisted delayed test score"),
    "worked_examples": ("worked example shown before practice items", "two-sample t-test on practice accuracy"),
    "elaboration": ("self-explanation prompt after an answer", "two-sample t-test on delayed recall"),
    "lexical_proximity": ("cognate share of a Polingual deck against the learner's known languages", "linear regression of hours to the proficiency threshold on cognate share, learner random intercept"),
    "comprehensible_input": ("minutes of graded reading or listening", "linear regression of comprehension score on input minutes"),
}
DEFAULT_PLANNING_D = 0.2

def bucket_proposals(hypotheses: Sequence[LearningHypothesis]) -> list[dict[str, Any]]:
    out = []
    for h in hypotheses:
        if h.mechanism not in BUCKET_MEASURES or not (h.supports or h.refutes):
            continue
        measure, test = BUCKET_MEASURES[h.mechanism]
        pooled = h.meta is not None and abs(h.meta.pooled) >= 0.05
        d = abs(h.meta.pooled) if pooled else DEFAULT_PLANNING_D
        mech, outc = h.mechanism.replace("_", " "), h.outcome.replace("_", " ")
        out.append({
            "hypothesis": h.id, "statement": h.statement,
            "H0": f"In Bucket learner data, {mech} ({measure}) has no effect on {outc}.",
            "H1": f"{mech} changes {outc}, standardized effect of at least d={d:.2f}.",
            "test": test, "planning_d": round(d, 3), "planning_d_source": "pooled" if pooled else "default",
            "alpha": meta.ALPHA, "power": meta.POWER, "n_per_group": meta.n_per_group(d),
        })
    return out

def attach_meta(lc: learning_corpus.LearningCorpus, hypotheses: Sequence[LearningHypothesis]) -> None:
    by_id = {e.id: e for e in lc.corpus.evidence}
    for h in hypotheses:
        per_source: dict[str, meta.Effect] = {}
        for eid in h.supports + h.refutes:
            text = lc.effects.get(eid)
            if not text:
                continue
            e = by_id[eid]
            eff = meta.parse_effect(f"{text} {e.span.quote}", e.source_id)
            if eff is None:
                continue
            if eid.endswith(":negative") and eff.d > 0:
                eff = meta.Effect(-eff.d, eff.se, eff.imputed_se, eff.source_id)
            per_source.setdefault(e.source_id, eff)
        h.meta = meta.random_effects(list(per_source.values()))
    qs = meta.benjamini_hochberg([h.meta.p if h.meta else None for h in hypotheses])
    for h, q in zip(hypotheses, qs):
        h.q_bh = q

def rank_by_surprise(hypotheses: Sequence[LearningHypothesis]) -> list[LearningHypothesis]:
    return sorted((h for h in hypotheses if "settled" not in h.flags and h.surprise > 0), key=lambda h: (-h.surprise, h.id))

def judge_prompt(h: LearningHypothesis, evidence_by_id: dict[str, EvidenceItem]) -> str:
    lines = [
        "You grade a learning-science hypothesis against cited evidence.",
        f"Hypothesis: {h.statement}.",
        f"positive={len(h.supports)} negative={len(h.refutes)}",
        "Evidence:",
    ]
    for eid in (h.supports + h.refutes)[:20]:
        e = evidence_by_id[eid]
        lines.append(f"- [{e.stance.value}] [{e.tier.value}] {e.source_id}: {e.span.quote[:240]}")
    lines.append("Return verdict supports, refutes, mixed or insufficient, a confidence in [0,1], and a one-sentence rationale.")
    return "\n".join(lines)

def judge_opinion(verdict: dict[str, Any]) -> Opinion | None:
    c = float(verdict.get("confidence", 0.0)) * JUDGE_WEIGHT
    r, s = {"supports": (c, 0.0), "refutes": (0.0, c), "mixed": (c / 2, c / 2)}.get(verdict.get("verdict"), (0.0, 0.0))
    if r == 0.0 and s == 0.0:
        return None
    return Opinion.from_evidence(r, s, IGNORANCE_W, BASE_RATE)

def gap_nodes(lc: learning_corpus.LearningCorpus, hypotheses: Sequence[LearningHypothesis]) -> list[dict[str, Any]]:
    by_id = {h.id: h for h in hypotheses}
    opinions = {h.address: h.opinion for h in hypotheses if h.opinion}
    nodes: list[unknowns.GapNode] = []
    for h in hypotheses:
        if h.opinion and h.opinion.u > GAP_U_THRESHOLD:
            nodes.append(unknowns.GapNode(
                id=f"gap-thin:{h.id}", kind="thin-evidence",
                description=f"{h.statement}: u={h.opinion.u:.2f}, {len(h.supports)}+/{len(h.refutes)}- items",
                would_move=[h.address],
            ))
    for t in lc.talk_claims:
        if t.verdict not in ("UNTESTED", "MIXED"):
            continue
        exts = lc.extraction.by_id.get(f"talk:{t.number}", []) if lc.extraction else []
        moved = sorted({by_id[f"{x.mechanism}>{x.outcome}"].address for x in exts if f"{x.mechanism}>{x.outcome}" in by_id})
        nodes.append(unknowns.GapNode(
            id=f"gap-talk:{t.number}", kind=f"talk-{t.verdict.lower()}", description=t.claim, would_move=moved,
        ))
    scored = sorted(
        ((n, unknowns.value_of_information(n, hypotheses, opinions) / n.cost) for n in nodes),
        key=lambda p: (-p[1], p[0].id),
    )
    return [
        {"id": n.id, "kind": n.kind, "description": n.description, "would_move": n.would_move, "value_of_information": v}
        for n, v in scored
    ]

def run_campaign(
    *, root: str | Path | None = None, mode: str = "fake", judge_top: int = DEFAULT_JUDGE_TOP,
    cache_dir: str | Path = DEFAULT_CACHE_DIR, replay_only: bool = False,
) -> dict[str, Any]:
    if mode not in ("fake", "claude"):
        raise ValueError(f"mode must be 'fake' or 'claude', got {mode!r}")
    lc = learning_corpus.load(root, mode=mode, cache_dir=cache_dir, replay_only=replay_only)
    evidence_by_id = {e.id: e for e in lc.corpus.evidence}
    hypotheses = rank(build_hypotheses(lc.corpus.evidence))
    judged = [h for h in hypotheses if h.supports or h.refutes][:judge_top]
    if judged:
        verdicts = llm.complete_many(
            [judge_prompt(h, evidence_by_id) for h in judged], role="learning_judge", schema=JUDGE_SCHEMA,
            cache_dir=cache_dir, replay_only=replay_only, mode=mode, workers=learning_corpus.LLM_WORKERS,
        )
        for h, v in zip(judged, verdicts):
            h.judge = v
            jo = judge_opinion(v)
            if jo is not None and h.opinion is not None:
                h.opinion = fuse(h.opinion, jo)
    hypotheses = rank(hypotheses)
    for h in hypotheses:
        h.effects = sorted({lc.effects[i] for i in h.supports + h.refutes if i in lc.effects})
    attach_meta(lc, hypotheses)
    gaps = gap_nodes(lc, hypotheses)
    rep = lc.extraction
    return {
        "domain": DOMAIN, "mode": mode,
        "counts": {
            "works": len(lc.works), "claims": len(lc.claims), "mechanism_records": len(lc.mechanisms),
            "talk_claims": len(lc.talk_claims), "sources": len(lc.corpus.sources),
            "evidence": len(lc.corpus.evidence), "hypotheses": len(hypotheses), "judged": len(judged),
            "gap_nodes": len(gaps), "skipped": dict(lc.skipped), "records": lc.records,
            "extracted_records": len(rep.by_id) if rep else 0, "extract_prompts": rep.prompts if rep else 0,
            "escalated_records": rep.escalated_records if rep else 0, "empty_extract_responses": rep.empty_responses if rep else 0,
        },
        "hypotheses": [h.to_dict() for h in hypotheses],
        "targets": [h.to_dict() for h in rank_by_surprise(hypotheses)],
        "gap_nodes": gaps,
        "bucket_proposals": bucket_proposals(rank_by_surprise(hypotheses)),
    }

def _fmt_ids(ids: Sequence[str], limit: int = 6) -> str:
    shown = sorted({i.split("#")[0] for i in ids})
    extra = len(shown) - limit
    text = ", ".join(f"`{i}`" for i in shown[:limit])
    return text + (f", and {extra} more" if extra > 0 else "") if shown else "none"

def render_markdown(result: dict[str, Any], *, top: int = 25, gaps: int = 10, targets: int = 20) -> str:
    c = result["counts"]
    out = [
        "# Ranked Learning Hypotheses",
        "",
        f"Mode `{result['mode']}`. {c['extracted_records']} of {c['records']} records mapped by the extraction ensemble. {c['sources']} sources, {c['evidence']} evidence items, {c['hypotheses']} mechanism-to-outcome hypotheses, {c['judged']} judged.",
        "P is the projected subjective-logic belief b + a·u with base rate 0.5. Evidence ids name the work, claim or talk row behind each item.",
        "",
        "## Research Targets",
        "",
        "Ranked by surprise: max of conflict and uncertainty u, scaled by how far P sits from a coin flip toward 0.5. Hypotheses flagged settled are left out.",
        "",
        "| # | Hypothesis | Surprise | Flags | P | Conflict | u | For | Against | Effect sizes |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for i, h in enumerate(result["targets"][:targets], start=1):
        eff = "; ".join(h["effects"][:3]).replace("|", "/") or "none"
        out.append(
            f"| {i} | {h['statement']} | {h['surprise']:.3f} | {', '.join(h['flags']) or 'none'} | {h['P']:.3f} | "
            f"{h['conflict']:.2f} | {h['opinion']['u']:.2f} | {_fmt_ids(h['supports'], 4)} | {_fmt_ids(h['refutes'], 4)} | {eff} |"
        )
    out += [
        "",
        "## Belief Ranking",
        "",
        "| # | Hypothesis | P | b | d | u | Flags | Judge | Supporting evidence | Refuting evidence |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for i, h in enumerate(result["hypotheses"][:top], start=1):
        o = h["opinion"]
        j = h["judge"]["verdict"] if h.get("judge") else "none"
        out.append(
            f"| {i} | {h['statement']} | {h['P']:.3f} | {o['b']:.2f} | {o['d']:.2f} | {o['u']:.2f} | {', '.join(h['flags']) or 'none'} | {j} | "
            f"{_fmt_ids(h['supports'])} | {_fmt_ids(h['refutes'])} |"
        )
    metas = [h for h in result["hypotheses"] if h.get("meta")]
    out += [
        "", "## Meta-Analysis", "",
        "DerSimonian-Laird random effects over one standardized effect per source. r and odds ratios convert to d; SE comes from a stated CI or n, else 0.15 imputed and counted. q is the Benjamini-Hochberg adjusted p across every hypothesis with a pooled effect. Egger needs three or more studies with distinct SEs.",
        "",
        "| Hypothesis | k | Imputed SE | Pooled d | 95% CI | p | q | I² | Egger p | P |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for h in sorted(metas, key=lambda h: h["q_bh"] if h["q_bh"] is not None else 1.0):
        m = h["meta"]
        eg = f"{m['egger_p']:.3f}" if m["egger_p"] is not None else "n/a"
        out.append(
            f"| {h['statement']} | {m['k']} | {m['k_imputed_se']} | {m['pooled']:.2f} | {m['ci_low']:.2f} to {m['ci_high']:.2f} | "
            f"{m['p']:.3g} | {h['q_bh']:.3g} | {m['i2']:.2f} | {eg} | {h['P']:.3f} |"
        )
    out += ["", "## Tests On Bucket Data", "",
            "Two-sided alpha 0.05, power 0.8. Planning d is the absolute pooled effect when one exists, else 0.2.", "",
            "| Hypothesis | H0 | H1 | Test | d | n per group |", "|---|---|---|---|---|---|"]
    for pr in result.get("bucket_proposals", [])[:15]:
        out.append(f"| {pr['statement']} | {pr['H0']} | {pr['H1']} | {pr['test']} | {pr['planning_d']:.2f} | {pr['n_per_group']} |")
    out += ["", "## Gap Queue", "", "Ordered by value of information, the summed u² of the hypotheses each gap would move.", "",
            "| Gap | Kind | VoI | Description |", "|---|---|---|---|"]
    for g in result["gap_nodes"][:gaps]:
        desc = g["description"].replace("|", "/")
        out.append(f"| `{g['id']}` | {g['kind']} | {g['value_of_information']:.3f} | {desc} |")
    return "\n".join(out) + "\n"

def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="hte-learning")
    p.add_argument("--root", default=None)
    p.add_argument("--mode", choices=["fake", "claude"], default=os.environ.get("HTE_LLM_MODE", "fake"))
    p.add_argument("--judge-top", type=int, default=DEFAULT_JUDGE_TOP)
    p.add_argument("--json-out", default=None)
    p.add_argument("--md-out", default=None)
    args = p.parse_args(argv)
    result = run_campaign(root=args.root, mode=args.mode, judge_top=args.judge_top)
    if args.json_out:
        Path(args.json_out).write_text(json.dumps(result, indent=2))
    md = render_markdown(result)
    if args.md_out:
        Path(args.md_out).write_text(md)
    else:
        sys.stdout.write(md)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
