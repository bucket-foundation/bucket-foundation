"""hte: the History Hypothesis Engine core.

Combinatorial address space, subjective-logic belief, and their supporting
timeline, concept, and evidence models, over `papers/history-hypothesis-
engine/main.tex` and its Lean counterparts under `Bucket.*`. See `README.md`
in this directory for the module map and how to run the tests.

This package builds the address, belief, and data-model layer only. The
generator, ranking tournament, evolver, LLM extractor roles, and any CLI are
out of scope here: they are built next, against the interfaces this package
documents.
"""
from __future__ import annotations

__version__ = "0.1.0"
