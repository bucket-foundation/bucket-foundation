from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

import tools_dnarna as d  # noqa: E402

def test_clean_seq_strips_fasta_and_whitespace():
    assert d.clean_seq(">header\nACGU acgu\n") == "ACGUACGU"

def test_revcomp_dna_and_rna():
    assert d.revcomp("ATGC") == "GCAT"
    assert d.revcomp("AUGC", rna=True) == "GCAU"

def test_gc_and_homopolymer():
    assert d.gc_fraction("GGCC") == 1.0
    assert d.longest_homopolymer("AAATGGGGC") == 4

def test_summarize_dotbracket():
    s = d.summarize_dotbracket("((..))")
    assert s["n_pairs"] == 2
    assert s["base_pairs"] == [(1, 6), (2, 5)]
    assert s["n_helices"] == 1

@pytest.mark.skipif(not d._VIENNA_OK, reason="ViennaRNA not installed")
def test_rna_structure_known_hairpin_folds():
    out = d.run_rna_structure({"sequence": "GGGGAAAACCCC"})
    assert out["mfe_structure"] == "((((....))))"
    assert out["summary"]["n_base_pairs"] == 4
    assert out["mfe_kcal_mol"] < 0
    assert out["length"] == 12
    assert out["summary"]["paired_bases"] == 8
    assert out["summary"]["unpaired_bases"] == 4

@pytest.mark.skipif(not d._VIENNA_OK, reason="ViennaRNA not installed")
def test_rna_structure_dna_is_folded_as_rna():
    out = d.run_rna_structure({"sequence": "GGGGAAAACCCC".replace("U", "T")})
    assert out["input_was_dna"] is False
    out2 = d.run_rna_structure({"sequence": "TTTTAAAACCCC"})
    assert out2["input_was_dna"] is True
    assert "U" in out2["sequence"]

@pytest.mark.skipif(not d._VIENNA_OK, reason="ViennaRNA not installed")
def test_rna_structure_unstructured_has_no_pairs():
    out = d.run_rna_structure({"sequence": "AAAAAAAAAAAA"})
    assert out["summary"]["n_base_pairs"] == 0
    assert set(out["mfe_structure"]) == {"."}

def test_rna_structure_validation():
    assert d.run_rna_structure({"sequence": "AC"}).get("error")
    assert d.run_rna_structure({"sequence": "ACGTXYZ123"}).get("error")

def test_find_guides_locates_pam():
    seq = "A" * 20 + "AGG" + "C" * 10
    guides = d.find_guides(seq, pam="NGG", guide_len=20)
    fwd = [g for g in guides if g["strand"] == "+"]
    assert any(g["protospacer"] == "A" * 20 and g["pam"] == "AGG" for g in fwd)

def test_score_guide_flags_homopolymer_and_polyt():
    bad = d.score_guide_on_target("TTTTAAAAAAAAAAAAAAAA")
    assert "contains Pol III terminator (TTTT)" in bad["flags"]
    assert bad["longest_homopolymer"] >= 4
    good = d.score_guide_on_target("ACGTACGTACGTACGTACGG")
    assert good["on_target_score"] > bad["on_target_score"]

def test_off_target_risk_detects_repeat():
    seed_carrier = "ACGTACGTACGTACGTACGT"
    context = seed_carrier + "TTTT" + seed_carrier
    risk = d.off_target_risk(seed_carrier, context)
    assert risk["off_target_risk"] > 0
    assert risk["seed_12nt"] == seed_carrier[-12:]

def test_run_grna_optimizer_ranks_and_validates():
    seq = "ATGCGTACGTTAGCGATCGGGGCCAATTCCGGTACGATCGATCGGGAATTCCGG"
    out = d.run_grna_optimizer({"sequence": seq})
    assert out["n_candidates"] >= 1
    g = out["guides"]
    comps = [x["composite_score"] for x in g]
    assert comps == sorted(comps, reverse=True)
    assert all(len(x["protospacer"]) == 20 for x in g)
    assert d.run_grna_optimizer({"sequence": "ACGT"}).get("error")
    assert d.run_grna_optimizer({"sequence": seq, "pam": "XYZ"}).get("error")

def test_kmer_embedding_dim_and_normalized():
    import numpy as np

    emb = d.kmer_embedding("ACGUACGUACGU", k=3)
    assert emb.shape == (64,)
    assert abs(float(np.linalg.norm(emb)) - 1.0) < 1e-9

def test_structural_features_real_descriptors():
    f = d.structural_features("GGGGAAAACCCC")
    assert 0.0 <= f["gc_fraction"] <= 1.0
    assert f["longest_homopolymer"] == 4
    assert "dinucleotide_entropy_bits" in f

def test_run_rna_fm_embeds_fallback_is_real():
    out = d.run_rna_fm_embeds({"sequence": "GGGGAAAACCCC", "k": 3})
    assert out["mode"] == "kmer-structural-fallback"
    assert out["is_real_model"] is False
    assert out["embedding_dim"] == 64
    assert len(out["embedding"]) == 64
    assert "structural_features" in out

def test_run_rna_fm_embeds_validation():
    assert d.run_rna_fm_embeds({"sequence": "AC"}).get("error")
    assert d.run_rna_fm_embeds({"sequence": "ACGU", "k": 9}).get("error")

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
