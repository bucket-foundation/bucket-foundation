#!/usr/bin/env python3
"""Builds ASCII-safe snapshots of this paper's Lean 4 listings for
Appendix A. Run: python3 make_lean_snapshots.py

Lean 4 source uses Unicode operators pervasively (forall, arrow, and the
rest of the math alphabet), and this environment's toolchain is plain
pdflatex plus the listings package with no listingsutf8 and no Unicode
math font (see papers/PAPER-STANDARDS.md, "Toolchain notes"): feeding a
real .lean file straight to \\lstinputlisting fails with "Invalid UTF-8
byte sequence" the moment a multi-byte character reaches the package's
byte-by-byte catcode scan. lean/Bucket/*.lean is also being written in
parallel by a companion pass, so its Unicode content is not this paper's
to rewrite or wait on.

This script copies each expected Lean file (if present) into
lean-snapshots/, transliterating the common Lean/math Unicode set to a
readable ASCII spelling so the appendix listing stays legible and the
build stays byte-safe regardless of what that companion pass writes next.
Any Lean file not yet on disk is skipped; main.tex's \\bucketlean macro
falls back to a pending note for it exactly as it would for a missing
file.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "lean", "Bucket")
OUT_DIR = os.path.join(HERE, "lean-snapshots")

FILES = [
    "Timeline.lean",
    "Concept.lean",
    "Hypothesis.lean",
    "Address.lean",
    "Belief.lean",
    "Unknowns.lean",
]

# Longest keys first so multi-character sequences match before any
# single-character prefix of them would.
TRANSLITERATE = [
    ("∀", "forall "),
    ("∃", "exists "),
    ("→", "->"),
    ("↔", "<->"),
    ("≤", "<="),
    ("≥", ">="),
    ("≠", "!="),
    ("¬", "not "),
    ("∧", "/\\"),
    ("∨", "\\/"),
    ("×", "x"),
    ("ℕ", "Nat"),
    ("ℤ", "Int"),
    ("ℝ", "Real"),
    ("ℙ", "Prop"),
    ("λ", "fun "),
    ("∅", "empty"),
    ("∈", "in"),
    ("∉", "not-in"),
    ("⊆", "subset-eq"),
    ("∪", "union"),
    ("∩", "inter"),
    ("·", "."),
    ("▸", ">"),
    ("⟨", "<"),
    ("⟩", ">"),
    ("…", "..."),
    ("§", "Section "),
    ("–", "-"),
    ("—", "-"),
    ("’", "'"),
    ("“", '"'),
    ("”", '"'),
    ("ç", "c"), ("Ç", "C"),
    ("ö", "o"), ("Ö", "O"),
    ("ü", "u"), ("Ü", "U"),
    ("é", "e"), ("É", "E"),
    ("è", "e"), ("È", "E"),
    ("á", "a"), ("Á", "A"),
    ("ø", "o"), ("Ø", "O"),
    ("ω", "omega"), ("Ω", "Omega"),
    ("←", "<-"),
    ("⁻¹", "^-1"),
]


def transliterate(text: str) -> str:
    for src, dst in TRANSLITERATE:
        if src in text:
            text = text.replace(src, dst)
    # Anything still outside printable ASCII gets a codepoint placeholder
    # rather than silently dropped or left to break listings again.
    out = []
    for ch in text:
        if ch == "\n" or ch == "\t" or (32 <= ord(ch) < 127):
            out.append(ch)
        else:
            out.append(f"[U+{ord(ch):04X}]")
    return "".join(out)


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    written = 0
    for name in FILES:
        src = os.path.join(SRC_DIR, name)
        dst = os.path.join(OUT_DIR, name)
        if not os.path.isfile(src):
            print(f"-- skip {name}: not on disk yet")
            continue
        with open(src, "r", encoding="utf-8") as f:
            content = f.read()
        safe = transliterate(content)
        with open(dst, "w", encoding="ascii") as f:
            f.write(safe)
        print(f"-- wrote {dst} ({len(safe)} bytes, ascii-safe)")
        written += 1
    print(f"\n{written} of {len(FILES)} Lean listings snapshotted.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
