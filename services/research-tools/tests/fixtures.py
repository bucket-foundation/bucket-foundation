"""Fixture works/grants for the no-network research-tools tests.

These are trimmed, realistic OpenAlex-shaped records (normalized to the shape
tools_rag.normalize_work produces) plus NSF-shaped award dicts. No network is
ever touched: tests monkeypatch tools_rag.search_works / _iter_atlas_nsf_awards
to return these.
"""
from __future__ import annotations

# --- normalized OpenAlex works (output shape of tools_rag.normalize_work) ----
WORKS_PROTEIN_DYNAMICS = [
    {
        "id": "https://openalex.org/W1",
        "title": "Markov state models reveal metastable conformations in protein folding",
        "abstract": "We build a Markov state model from molecular dynamics trajectories to "
        "identify metastable states and transition kinetics in protein folding.",
        "publication_date": "2025-11-01",
        "publication_year": 2025,
        "cited_by_count": 12,
        "venue": "Journal of Chemical Physics",
        "is_oa": True,
        "oa_url": "https://example.org/w1",
        "doi": "https://doi.org/10.1/w1",
        "authors": ["A. Researcher", "B. Scientist"],
        "concepts": ["Molecular dynamics", "Markov chain", "Protein folding"],
        "specific_concepts": ["Molecular dynamics", "Markov state model", "Conformational change"],
    },
    {
        "id": "https://openalex.org/W2",
        "title": "Allosteric residue networks in enzyme dynamics",
        "abstract": "Per-residue analysis identifies allosteric coupling and flexible regions.",
        "publication_date": "2019-03-01",
        "publication_year": 2019,
        "cited_by_count": 240,
        "venue": "Nature Structural Biology",
        "is_oa": False,
        "oa_url": "https://example.org/w2",
        "doi": "https://doi.org/10.1/w2",
        "authors": ["C. Author"],
        "concepts": ["Allostery", "Protein dynamics"],
        "specific_concepts": ["Allostery", "Residue network", "Protein dynamics"],
    },
    {
        "id": "https://openalex.org/W3",
        "title": "An unrelated study of soil microbiology",
        "abstract": "We characterize soil bacterial communities. No protein content here.",
        "publication_date": "2024-01-01",
        "publication_year": 2024,
        "cited_by_count": 3,
        "venue": "Soil Journal",
        "is_oa": True,
        "oa_url": "https://example.org/w3",
        "doi": "",
        "authors": ["D. Soil"],
        "concepts": ["Microbiology", "Soil"],
        "specific_concepts": ["Soil microbiology"],
    },
]

# Works whose abstracts carry clear positive / negative stance toward a claim.
CLAIM = "cold exposure increases mitochondrial uncoupling"
WORKS_CLAIM = [
    {
        "id": "https://openalex.org/WP",
        "title": "Cold exposure enhances mitochondrial uncoupling in brown fat",
        "abstract": "Cold exposure significantly increased mitochondrial uncoupling and "
        "elevated UCP1 expression in brown adipose tissue.",
        "publication_date": "2022-01-01",
        "publication_year": 2022,
        "cited_by_count": 80,
        "venue": "Cell Metabolism",
        "is_oa": True,
        "oa_url": "https://example.org/wp",
        "doi": "",
        "authors": ["P. Pro"],
        "concepts": ["Mitochondrion", "Thermogenesis"],
        "specific_concepts": ["Mitochondrial uncoupling", "Brown adipose tissue"],
    },
    {
        "id": "https://openalex.org/WN",
        "title": "Cold exposure does not change mitochondrial uncoupling in lean subjects",
        "abstract": "Mitochondrial uncoupling was unchanged after cold exposure; we found no "
        "increase and the effect was negligible.",
        "publication_date": "2023-01-01",
        "publication_year": 2023,
        "cited_by_count": 30,
        "venue": "J Physiol",
        "is_oa": True,
        "oa_url": "https://example.org/wn",
        "doi": "",
        "authors": ["N. Neg"],
        "concepts": ["Mitochondrion"],
        "specific_concepts": ["Mitochondrial uncoupling"],
    },
    {
        "id": "https://openalex.org/WO",
        "title": "A study of plant photosynthesis",
        "abstract": "We measure leaf chlorophyll content and light absorption in maize.",
        "publication_date": "2021-01-01",
        "publication_year": 2021,
        "cited_by_count": 5,
        "venue": "Plant Sci",
        "is_oa": True,
        "oa_url": "https://example.org/wo",
        "doi": "",
        "authors": ["O. Off"],
        "concepts": ["Photosynthesis"],
        "specific_concepts": ["Photosynthesis"],
    },
]

# --- raw NSF-shaped awards (input shape of tools_rag._grant_record) ----------
NSF_AWARDS = [
    {
        "id": "2543297",
        "title": "CAREER: Biomolecular condensates in plant stress adaptation",
        "abstractText": "This project studies biomolecular condensates and phase separation "
        "under stress, characterizing the molecular determinants of condensate formation.",
        "fundsObligatedAmt": "1330337",
        "piFirstName": "Shuai",
        "piLastName": "Huang",
        "awardeeName": "OHIO STATE UNIVERSITY",
        "fundProgramName": "Cell, Dev, & Physio",
        "startDate": "09/01/2026",
        "agency": "NSF",
    },
    {
        "id": "2222222",
        "title": "Coarse-grained modeling of condensate phase separation dynamics",
        "abstractText": "We develop coarse-grained models of phase separation and condensate "
        "dynamics in biomolecular systems.",
        "fundsObligatedAmt": "536802",
        "piFirstName": "Jane",
        "piLastName": "Modeler",
        "awardeeName": "MIT",
        "fundProgramName": "Molecular Biophysics",
        "startDate": "01/01/2025",
        "agency": "NSF",
    },
    {
        "id": "3333333",
        "title": "Quantum dots for solar cells",
        "abstractText": "Unrelated materials-science work on photovoltaic quantum dots.",
        "fundsObligatedAmt": "400000",
        "piFirstName": "Sol",
        "piLastName": "Cell",
        "awardeeName": "Caltech",
        "fundProgramName": "Materials",
        "startDate": "01/01/2024",
        "agency": "NSF",
    },
]
