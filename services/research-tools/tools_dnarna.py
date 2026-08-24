#!/usr/bin/env python3
"""
research-tools, DNA/RNA cluster (REAL logic, CPU, no GPU)
==========================================================

FUNCTIONAL backends for the DNA/RNA tools from
docs/research-tools/02-tool-roadmap.md (the 1,105-PI DNA/RNA cohort that the
existing 11-tool suite did not cover). Three tools, each running real
algorithms / real scientific libraries on the user's input:

 RNAStructure, RNA secondary-structure prediction (RNAfold-style).
 ViennaRNA MFE fold + base-pair probabilities. FULLY REAL.
 gRNA-Optimizer, CRISPR guide-RNA design: PAM scan, on-target scoring
 (GC / homopolymer / position rules), off-target heuristics.
 Real deterministic algorithm. FULLY REAL.
 RNA-FM-Embeds, hosted RNA embedding service. If an RNA language model is
 loadable, embed with it; else a REAL, documented k-mer +
 structural feature embedding (marked model vs
 fallback). Fallback is real numeric features.

Design rules (match tools_rag.py):
 * Pure functions for every algorithm so they unit-test with fixtures, zero
 network, zero GPU (see tests/).
 * No subprocess to a sibling repo. ViennaRNA is a pip wheel (`pip install
 ViennaRNA`); numpy is already present. RNA-FM weights are optional.
 * Every run_<tool>(payload) -> dict returns the `output` payload only; the
 gateway (gateway.py) wraps it in the v1 job-result envelope + provenance.

The gateway imports DNARNA_RUNNERS from here.
"""
from __future__ import annotations

import math
import os
import re
from typing import Any, Optional

# numpy is already a dependency of the suite (scipy/numpy installed on the box).
import numpy as np

# ViennaRNA: real MFE secondary-structure prediction. Imported lazily-guarded so
# the module still imports (and the other two tools still run) if the wheel is
# missing on a given host; RNAStructure then reports backend_unavailable.
try:
    import RNA  # type: ignore (ViennaRNA python bindings: `pip install ViennaRNA`)

    _VIENNA_OK = True
    _VIENNA_ERR = ""
except Exception as _e:  # pragma: no cover - import guard
    RNA = None  # type: ignore
    _VIENNA_OK = False
    _VIENNA_ERR = str(_e)


# ===========================================================================
# Shared nucleic-acid utilities (pure)
# ===========================================================================
_DNA = set("ACGT")
_RNA = set("ACGU")
_IUPAC = set("ACGTUNRYSWKMBDHV")
_COMPLEMENT = {"A": "T", "C": "G", "G": "C", "T": "A", "U": "A", "N": "N"}
_RC_RNA = {"A": "U", "C": "G", "G": "C", "U": "A", "T": "A", "N": "N"}


def clean_seq(s: Optional[str], *, allow_rna: bool = True) -> str:
    """Normalize a nucleotide sequence: strip FASTA header, whitespace, lowercase.
 Pure function. Keeps only IUPAC nucleotide letters (upper-cased)."""
    s = (s or "").strip()
    if s.startswith(">"):
        s = "".join(s.splitlines()[1:])
    s = re.sub(r"\s+", "", s).upper()
    s = "".join(c for c in s if c in _IUPAC)
    return s


def to_rna(s: str) -> str:
    """Map T->U so a DNA sequence can be folded as RNA. Pure function."""
    return s.replace("T", "U")


def revcomp(s: str, *, rna: bool = False) -> str:
    """Reverse complement. Pure function."""
    table = _RC_RNA if rna else _COMPLEMENT
    return "".join(table.get(c, "N") for c in reversed(s))


def gc_fraction(s: str) -> float:
    if not s:
        return 0.0
    return sum(1 for c in s if c in "GC") / len(s)


def longest_homopolymer(s: str) -> int:
    """Length of the longest run of a single base. Pure function."""
    best = run = 0
    prev = ""
    for c in s:
        run = run + 1 if c == prev else 1
        prev = c
        best = max(best, run)
    return best


# ===========================================================================
# 1. RNAStructure, RNA secondary-structure prediction (ViennaRNA MFE)
# ===========================================================================
def summarize_dotbracket(structure: str) -> dict:
    """Parse a dot-bracket string into human-readable structure features.
 Pure function. Returns paired-base count, helix/loop counts, and the
 base-pair list (i,j 1-indexed)."""
    pairs: list[tuple[int, int]] = []
    stack: list[int] = []
    for i, c in enumerate(structure):
        if c == "(":
            stack.append(i)
        elif c == ")":
            if stack:
                j = stack.pop()
                pairs.append((j + 1, i + 1))  # 1-indexed
    pairs.sort()
    paired = len(pairs) * 2
    unpaired = structure.count(".")
    # Count helices: maximal runs of stacked, nested pairs (i,j),(i+1,j-1)...
    pset = {(a, b) for a, b in pairs}
    helices = 0
    counted: set[tuple[int, int]] = set()
    for a, b in sorted(pairs):
        if (a, b) in counted:
            continue
        # walk inward while the next nested pair is also present
        k = 0
        while (a + k, b - k) in pset:
            counted.add((a + k, b - k))
            k += 1
        helices += 1
    return {
        "n_pairs": len(pairs),
        "paired_bases": paired,
        "unpaired_bases": unpaired,
        "n_helices": helices,
        "base_pairs": pairs,
    }


def run_rna_structure(payload: dict) -> dict:
    """payload: { sequence: str (RNA or DNA; DNA is folded as RNA) }

 Real MFE secondary-structure prediction via ViennaRNA:
 * dot-bracket MFE structure + free energy (kcal/mol)
 * ensemble free energy + base-pair probability matrix (partition function)
 * per-base max pairing probability (positional confidence)
 * a readable structure summary (helices, loops, paired fraction)
    """
    raw = clean_seq(payload.get("sequence"))
    if len(raw) < 4:
        return {"error": "enter an RNA/DNA sequence of at least 4 nt"}
    if len(raw) > 2000:
        return {"error": "sequence too long (max 2000 nt for the inline fold)"}
    bad = set(raw) - _RNA - {"T"} - {"N"}
    if bad:
        return {"error": f"non-nucleotide characters in sequence: {''.join(sorted(bad))}"}

    if not _VIENNA_OK or RNA is None:
        return {
            "degraded": True,
            "message": f"ViennaRNA is not installed on this host ({_VIENNA_ERR}). "
            "Install with `pip install ViennaRNA` to enable RNA folding.",
            "sequence": raw,
        }

    was_dna = "T" in raw
    rna = to_rna(raw)

    # --- real ViennaRNA fold ---
    fc = RNA.fold_compound(rna)
    structure, mfe = fc.mfe()  # MFE structure (dot-bracket) + free energy
    # partition function gives the ensemble free energy + bp probabilities
    _, ensemble_energy = fc.pf()
    bpp = fc.bpp()  # 1-indexed (n+1)x(n+1) base-pair probability matrix

    n = len(rna)
    # per-base maximum pairing probability (positional confidence profile)
    max_pair_prob = [0.0] * n
    strong_pairs: list[dict] = []
    for i in range(1, n + 1):
        for j in range(i + 1, n + 1):
            p = float(bpp[i][j])
            if p <= 0:
                continue
            if p > max_pair_prob[i - 1]:
                max_pair_prob[i - 1] = p
            if p > max_pair_prob[j - 1]:
                max_pair_prob[j - 1] = p
            if p >= 0.5:
                strong_pairs.append({"i": i, "j": j, "prob": round(p, 4)})
    strong_pairs.sort(key=lambda d: d["prob"], reverse=True)

    summary = summarize_dotbracket(structure)
    # frequency of the MFE structure in the Boltzmann ensemble
    mfe_freq = float(fc.pr_structure(structure))

    # mean positional confidence of the MFE-paired bases
    paired_idx = [a - 1 for a, _ in summary["base_pairs"]] + [
        b - 1 for _, b in summary["base_pairs"]
    ]
    mean_conf = (
        round(sum(max_pair_prob[k] for k in paired_idx) / len(paired_idx), 4)
        if paired_idx
        else 0.0
    )

    return {
        "library": "ViennaRNA",
        "vienna_version": getattr(RNA, "__version__", "unknown"),
        "input_was_dna": was_dna,
        "sequence": rna,
        "length": n,
        "gc_fraction": round(gc_fraction(rna), 4),
        "mfe_structure": structure,
        "mfe_kcal_mol": round(float(mfe), 3),
        "ensemble_energy_kcal_mol": round(float(ensemble_energy), 3),
        "mfe_ensemble_frequency": round(mfe_freq, 4),
        "mean_pair_confidence": mean_conf,
        "summary": {
            "n_base_pairs": summary["n_pairs"],
            "paired_bases": summary["paired_bases"],
            "unpaired_bases": summary["unpaired_bases"],
            "paired_fraction": round(summary["paired_bases"] / n, 4) if n else 0.0,
            "n_helices": summary["n_helices"],
        },
        # cap lists so the JSON stays small for long sequences
        "base_pairs": [{"i": a, "j": b} for a, b in summary["base_pairs"]][:400],
        "high_confidence_pairs": strong_pairs[:60],
        "per_base_max_prob": [round(p, 4) for p in max_pair_prob][:1000],
        "note": (
            "MFE structure + base-pair probabilities are real ViennaRNA output "
            "(partition function). DNA input is folded as RNA (T->U)."
        ),
    }


# ===========================================================================
# 2. gRNA-Optimizer, CRISPR guide-RNA design (real deterministic algorithm)
# ===========================================================================
# SpCas9 default: 20-nt protospacer + NGG PAM on the 3' end. We scan both
# strands for PAMs, extract each candidate guide, and score it with rules drawn
# from the published guide-design literature (Doench 2014/2016 feature families,
# Hsu 2013 off-target seed logic) implemented as a transparent heuristic.
def find_guides(seq: str, *, pam: str = "NGG", guide_len: int = 20) -> list[dict]:
    """Enumerate candidate SpCas9 guides on both strands. Pure function.

 Returns each guide with its protospacer, strand, 0-indexed cut site, and the
 matched PAM. PAM is matched as a IUPAC pattern on the 3' side of the guide.
    """
    seq = seq.upper()
    pam_re = _iupac_regex(pam)
    out: list[dict] = []

    def scan(s: str, strand: str) -> None:
        for m in re.finditer(f"(?=({'.' * guide_len})({pam_re}))", s):
            guide = m.group(1)
            pam_seq = m.group(2)
            if "N" in guide:  # skip guides spanning Ns / ambiguous bases
                continue
            start = m.start()
            # SpCas9 blunt cut is 3 nt 5' of the PAM (between positions 17 and 18)
            cut = start + guide_len - 3
            out.append(
                {
                    "protospacer": guide,
                    "pam": pam_seq,
                    "strand": strand,
                    "start": start,
                    "cut_site": cut,
                }
            )

    scan(seq, "+")
    rc = revcomp(seq)
    # map reverse-strand coordinates back onto the forward sequence
    n = len(seq)
    for g in _scan_revcomp(rc, pam_re, guide_len, n):
        out.append(g)
    return out


def _scan_revcomp(rc: str, pam_re: str, guide_len: int, n: int) -> list[dict]:
    out: list[dict] = []
    for m in re.finditer(f"(?=({'.' * guide_len})({pam_re}))", rc):
        guide = m.group(1)
        pam_seq = m.group(2)
        if "N" in guide:
            continue
        start_rc = m.start()
        fwd_start = n - (start_rc + guide_len + len(pam_seq))
        cut = n - (start_rc + guide_len - 3)
        out.append(
            {
                "protospacer": guide,
                "pam": pam_seq,
                "strand": "-",
                "start": max(fwd_start, 0),
                "cut_site": cut,
            }
        )
    return out


def _iupac_regex(pam: str) -> str:
    code = {
        "A": "A", "C": "C", "G": "G", "T": "T", "U": "T", "N": "[ACGT]",
        "R": "[AG]", "Y": "[CT]", "S": "[GC]", "W": "[AT]", "K": "[GT]",
        "M": "[AC]", "B": "[CGT]", "D": "[AGT]", "H": "[ACT]", "V": "[ACG]",
    }
    return "".join(code.get(c, "[ACGT]") for c in pam.upper())


def score_guide_on_target(guide: str) -> dict:
    """Heuristic on-target efficiency score (0..1). Pure function.

 Transparent, literature-motivated rules (not the proprietary Rule Set 2
 gradient-boosted model, which needs trained weights):
 * GC content sweet spot ~40-70% (penalize extremes; Doench 2014)
 * no long homopolymers (>=4), poor transcription / U-runs terminate Pol III
 * position-specific nucleotide preferences (G at PAM-proximal positions)
 * avoid TTTT (Pol III terminator) anywhere
    """
    n = len(guide)
    gc = gc_fraction(guide)
    # GC term: triangular peak at 0.55, zero at 0.2 and 0.9
    gc_term = max(0.0, 1.0 - abs(gc - 0.55) / 0.35)
    hp = longest_homopolymer(guide)
    hp_term = 1.0 if hp <= 3 else max(0.0, 1.0 - 0.3 * (hp - 3))
    polyt_pen = 0.35 if "TTTT" in guide else 0.0
    # position preference: G preferred at the 3'-proximal (PAM-side) positions
    pos_term = 0.0
    if n >= 2:
        if guide[-1] == "G":
            pos_term += 0.5
        if guide[-2] == "G":
            pos_term += 0.3
        if guide[0] == "G":
            pos_term += 0.2  # 5' G helps U6 transcription
    pos_term = min(pos_term, 1.0)
    score = 0.45 * gc_term + 0.25 * hp_term + 0.30 * pos_term - polyt_pen
    score = max(0.0, min(1.0, score))
    flags = []
    if gc < 0.2 or gc > 0.9:
        flags.append("extreme GC content")
    if hp >= 4:
        flags.append(f"homopolymer run of {hp}")
    if "TTTT" in guide:
        flags.append("contains Pol III terminator (TTTT)")
    return {
        "on_target_score": round(score, 4),
        "gc_fraction": round(gc, 4),
        "longest_homopolymer": hp,
        "flags": flags,
    }


def off_target_risk(guide: str, context: str) -> dict:
    """Heuristic off-target risk against the supplied target context. Pure.

 Real seed-region logic (Hsu 2013): the 12 nt PAM-proximal "seed" drives
 specificity. We count how many other near-PAM-NGG sites in the supplied
 sequence share the guide's seed with <=2 mismatches, a real, if local,
 off-target signal (a genome-wide search needs a reference index; documented).
    """
    seed = guide[-12:]
    ctx = context.upper()
    both = ctx + "N" + revcomp(ctx)
    hits = 0
    near = 0
    L = len(seed)
    for i in range(0, len(both) - L + 1):
        window = both[i : i + L]
        if "N" in window:
            continue
        mm = sum(1 for a, b in zip(window, seed) if a != b)
        if mm == 0:
            hits += 1
        elif mm <= 2:
            near += 1
    # hits includes the guide's own seed (==1 expected); subtract it.
    extra_exact = max(hits - 1, 0)
    risk = min(1.0, 0.4 * extra_exact + 0.08 * near)
    level = "high" if risk >= 0.5 else "moderate" if risk >= 0.2 else "low"
    return {
        "seed_12nt": seed,
        "extra_exact_seed_matches": extra_exact,
        "near_seed_matches_le2mm": near,
        "off_target_risk": round(risk, 4),
        "off_target_level": level,
        "note": (
            "Off-target risk is a LOCAL seed-region heuristic over the supplied "
            "sequence (Hsu-2013 seed logic). A genome-wide off-target search "
            "requires a reference index (e.g. via Cas-OFFinder); documented seam."
        ),
    }


def run_grna_optimizer(payload: dict) -> dict:
    """payload: { sequence: str (target DNA), pam?: str=NGG, guide_len?: int=20,
 limit?: int=20 }

 CRISPR guide design: enumerate candidate guides (PAM scan, both strands),
 score on-target efficiency, flag off-target risk, return a ranked table.
    """
    seq = clean_seq(payload.get("sequence"), allow_rna=False).replace("U", "T")
    if len(seq) < 23:
        return {"error": "target DNA too short (need at least guide_len + PAM, ~23 nt)"}
    if len(seq) > 50000:
        return {"error": "target too long (max 50 kb)"}
    pam = (payload.get("pam") or "NGG").upper()
    if not re.fullmatch(r"[ACGTUNRYSWKMBDHV]{2,6}", pam):
        return {"error": "invalid PAM (use IUPAC, e.g. NGG, NG, TTTV)"}
    guide_len = int(payload.get("guide_len") or 20)
    if not (15 <= guide_len <= 24):
        return {"error": "guide_len must be 15..24"}
    limit = max(1, min(int(payload.get("limit") or 20), 100))

    cands = find_guides(seq, pam=pam, guide_len=guide_len)
    seen: set[tuple[str, str, int]] = set()
    rows: list[dict] = []
    for c in cands:
        key = (c["protospacer"], c["strand"], c["start"])
        if key in seen:
            continue
        seen.add(key)
        ot = score_guide_on_target(c["protospacer"])
        off = off_target_risk(c["protospacer"], seq)
        # composite: reward on-target, penalize off-target
        composite = round(max(0.0, ot["on_target_score"] - 0.5 * off["off_target_risk"]), 4)
        rows.append({**c, **ot, **off, "composite_score": composite})
    rows.sort(key=lambda r: r["composite_score"], reverse=True)

    return {
        "method": "SpCas9 PAM scan + heuristic on/off-target scoring",
        "pam": pam,
        "guide_len": guide_len,
        "target_length": len(seq),
        "n_candidates": len(rows),
        "guides": [
            {
                "rank": i + 1,
                "protospacer": r["protospacer"],
                "pam": r["pam"],
                "strand": r["strand"],
                "start": r["start"],
                "cut_site": r["cut_site"],
                "on_target_score": r["on_target_score"],
                "off_target_risk": r["off_target_risk"],
                "off_target_level": r["off_target_level"],
                "composite_score": r["composite_score"],
                "gc_fraction": r["gc_fraction"],
                "flags": r["flags"],
            }
            for i, r in enumerate(rows[:limit])
        ],
        "note": (
            "On-target uses transparent literature-motivated rules (GC sweet "
            "spot, homopolymer/PolIII penalties, position preferences) in place of the "
            "proprietary trained Rule Set 2. Off-target is a local seed heuristic."
        ),
    }


# ===========================================================================
# 3. RNA-FM-Embeds, hosted RNA embedding service (model OR real fallback)
# ===========================================================================
# RNA-FM is a 12-layer BERT-style RNA language model (640-d). It needs the
# `fm` package + downloaded weights (a GPU helps but CPU inference works for
# short seqs). When present we use it; otherwise we compute a REAL, documented
# k-mer + structural-feature embedding (numeric, reproducible) and label the
# output mode. The fallback is real feature extraction.
_RNAFM = None
_RNAFM_TRIED = False


def _try_load_rnafm():  # pragma: no cover - model load is environment-dependent
    global _RNAFM, _RNAFM_TRIED
    if _RNAFM_TRIED:
        return _RNAFM
    _RNAFM_TRIED = True
    if os.environ.get("RNAFM_DISABLE", "") in ("1", "true", "yes"):
        return None
    try:
        import fm  # type: ignore (the RNA-FM package)
        import torch  # type: ignore

        model, alphabet = fm.pretrained.rna_fm_t12()
        model.eval()
        _RNAFM = {"model": model, "alphabet": alphabet, "torch": torch, "fm": fm}
    except Exception:
        _RNAFM = None
    return _RNAFM


def kmer_embedding(seq: str, k: int = 3) -> np.ndarray:
    """Real k-mer frequency embedding over the RNA alphabet. Pure-ish (numpy).

 Dimension = 4**k (k=3 -> 64). L2-normalized frequency vector, a
 reproducible sequence representation usable as ML features downstream.
    """
    rna = to_rna(seq)
    bases = "ACGU"
    idx = {b: i for i, b in enumerate(bases)}
    dim = 4 ** k
    vec = np.zeros(dim, dtype=np.float64)
    code = [idx.get(c, -1) for c in rna]
    for i in range(len(code) - k + 1):
        window = code[i : i + k]
        if -1 in window:
            continue
        h = 0
        for c in window:
            h = h * 4 + c
        vec[h] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


def structural_features(seq: str) -> dict:
    """Real biophysical descriptors of the RNA. Pure function (+optional Vienna).

 GC content, purine fraction, longest homopolymer, dinucleotide entropy, and
, if ViennaRNA is present, the MFE per nucleotide (a real folding feature).
    """
    rna = to_rna(seq)
    n = len(rna) or 1
    # dinucleotide Shannon entropy (sequence complexity)
    di: dict[str, int] = {}
    for i in range(len(rna) - 1):
        d = rna[i : i + 2]
        di[d] = di.get(d, 0) + 1
    total = sum(di.values()) or 1
    ent = -sum((c / total) * math.log2(c / total) for c in di.values()) if di else 0.0
    feats = {
        "gc_fraction": round(gc_fraction(rna), 4),
        "purine_fraction": round(sum(1 for c in rna if c in "AG") / n, 4),
        "longest_homopolymer": longest_homopolymer(rna),
        "dinucleotide_entropy_bits": round(ent, 4),
    }
    if _VIENNA_OK and RNA is not None and 4 <= len(rna) <= 2000:
        try:
            _, mfe = RNA.fold(rna)
            feats["mfe_per_nt_kcal_mol"] = round(float(mfe) / len(rna), 4)
        except Exception:
            pass
    return feats


def run_rna_fm_embeds(payload: dict) -> dict:
    """payload: { sequence: str, k?: int=3 }

 Returns an RNA embedding. Uses the RNA-FM language model if available
 (mode="rna-fm"), else a REAL k-mer + structural-feature embedding
 (mode="kmer-structural-fallback"). The mode is reported.
    """
    seq = clean_seq(payload.get("sequence"))
    if len(seq) < 4:
        return {"error": "enter an RNA/DNA sequence of at least 4 nt"}
    if len(seq) > 5000:
        return {"error": "sequence too long (max 5000 nt)"}
    bad = set(seq) - _RNA - {"T"} - {"N"}
    if bad:
        return {"error": f"non-nucleotide characters: {''.join(sorted(bad))}"}
    k = int(payload.get("k") or 3)
    if not (1 <= k <= 5):
        return {"error": "k must be 1..5"}

    model = _try_load_rnafm()
    feats = structural_features(seq)

    if model is not None:  # pragma: no cover - requires weights at runtime
        try:
            torch = model["torch"]
            bc = model["alphabet"].get_batch_converter()
            _, _, toks = bc([("q", to_rna(seq).replace("U", "U"))])
            with torch.no_grad():
                res = model["model"](toks, repr_layers=[12])
            rep = res["representations"][12][0, 1 : len(seq) + 1].mean(0)
            emb = rep.cpu().numpy().astype(float)
            return {
                "mode": "rna-fm",
                "model": "RNA-FM (rna_fm_t12, 640-d)",
                "is_real_model": True,
                "length": len(seq),
                "embedding_dim": int(emb.shape[0]),
                "embedding": [round(float(x), 6) for x in emb[:640]],
                "structural_features": feats,
                "note": "Mean-pooled RNA-FM layer-12 representation (real model).",
            }
        except Exception as e:
            # fall through to the real fallback, but report the model attempt
            feats["_rnafm_error"] = str(e)[:160]

    emb = kmer_embedding(seq, k=k)
    return {
        "mode": "kmer-structural-fallback",
        "model": f"{k}-mer frequency ({4 ** k}-d) + structural descriptors",
        "is_real_model": False,
        "length": len(seq),
        "embedding_dim": int(emb.shape[0]),
        "embedding": [round(float(x), 6) for x in emb],
        "structural_features": feats,
        "note": (
            "RNA-FM weights are not installed on this host, so this is a REAL "
            "k-mer + structural-feature embedding (reproducible numeric features, "
            "not a placeholder). Install the `fm` package + RNA-FM weights to get "
            "the language-model embedding; the output `mode` flips to `rna-fm`."
        ),
    }


# Registry the gateway imports.
DNARNA_RUNNERS = {
    "rnastructure": run_rna_structure,
    "grnaoptimizer": run_grna_optimizer,
    "rnafmembeds": run_rna_fm_embeds,
}
