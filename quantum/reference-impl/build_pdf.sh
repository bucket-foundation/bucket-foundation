#!/usr/bin/env bash
# Build the project PDF with REAL LaTeX math + syntax-highlighted code blocks,
# via pandoc + xelatex. Run:  bash build_pdf.sh
set -euo pipefail
cd "$(dirname "$0")"

TMP="$(mktemp -d)"
COMBINED="$TMP/combined.md"

# listings style: small mono, light background, wrap long lines, colored syntax
cat > "$TMP/listings-setup.tex" <<'TEX'
\usepackage{listings}
\usepackage{xcolor}
\definecolor{codebg}{RGB}{246,248,250}
\definecolor{codekw}{RGB}{215,58,73}
\definecolor{codestr}{RGB}{3,47,98}
\definecolor{codecom}{RGB}{106,115,125}
\lstset{
  basicstyle=\ttfamily\footnotesize,
  backgroundcolor=\color{codebg},
  keywordstyle=\color{codekw}\bfseries,
  stringstyle=\color{codestr},
  commentstyle=\color{codecom}\itshape,
  breaklines=true, breakatwhitespace=false,
  showstringspaces=false, columns=fullflexible,
  frame=single, framesep=4pt, rulecolor=\color{gray!30},
  xleftmargin=6pt, xrightmargin=6pt, aboveskip=8pt, belowskip=8pt,
}
TEX

# --- YAML metadata (title page + TOC settings) ---
cat > "$COMBINED" <<'YAML'
---
title: "Quantum Similarity Search"
subtitle: "Cosine similarity & kernel matrices on quantum hardware — the swap test, the Hadamard test, and a quantum-kernel SVM"
author: "Gianangelo Dichio"
date: "2026-07-07"
---

YAML

sep() { printf '\n\n\\newpage\n\n# %s\n\n' "$1" >> "$COMBINED"; }
add() { cat "$1" >> "$COMBINED"; }

# --- narrative sections ---
sep "Overview"                 ; tail -n +2 README.md          >> "$COMBINED"   # drop its own H1
sep "The math & science, from first principles" ; tail -n +2 MATH.md >> "$COMBINED"
sep "Results & technical note" ; tail -n +2 writeup/technical-note.md >> "$COMBINED"

# --- source-code appendix: each file as a fenced python block ---
printf '\n\n\\newpage\n\n# Source code\n\n' >> "$COMBINED"
for f in src/classical.py src/encode.py src/swap_test.py src/hadamard_test.py \
         src/kernel.py src/experiment.py src/studies.py src/qsvm.py \
         src/angle_sweep.py src/mitigation.py src/noise_models.py \
         src/error_budget.py src/destructive_swap.py \
         tests/test_estimators.py tests/test_mitigation.py; do
  printf '\n## %s\n\n```python\n' "$f" >> "$COMBINED"
  cat "$f" >> "$COMBINED"
  printf '\n```\n' >> "$COMBINED"
done

# --- render ---
pandoc "$COMBINED" -o qc-embedding-similarity.pdf \
  --pdf-engine=xelatex \
  --toc --toc-depth=2 --number-sections \
  -V geometry:margin=2cm \
  -V mainfont="Liberation Serif" \
  -V monofont="Liberation Mono" \
  -V fontsize=10pt \
  -V colorlinks=true -V linkcolor=RoyalBlue -V urlcolor=RoyalBlue -V toccolor=black \
  --listings -H "$TMP/listings-setup.tex" \
  --resource-path=.

echo "wrote qc-embedding-similarity.pdf"
rm -rf "$TMP"
