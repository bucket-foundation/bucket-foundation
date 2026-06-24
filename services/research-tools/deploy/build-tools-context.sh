#!/usr/bin/env bash
# Build the STANDARD (fat) image build-context for research-tools-gateway.
# ========================================================================
# Vendors the 5 CPU-feasible subprocess tools + their weights/corpora + the
# all-MiniLM HF cache next to the gateway, so deploy/Dockerfile.tools can bake a
# self-contained image that needs NO subprocess into ~/agfarms or ~/screenserver.
#
# Run on a host that has the sibling repos checked out:
#   ~/agfarms/biophysics-phd-review/{labbrain,proteinscout,stabilitydesigner,patchseqml}
#   ~/screenserver
#   ~/.cache/huggingface/hub/models--sentence-transformers--all-MiniLM-L6-v2
#
# Produces $STAGE (default /tmp/rt-tools-build) ready for:
#   docker build -f deploy/Dockerfile.tools -t farmera/research-tools-gateway:tools-<tag> $STAGE
#
# Deliberately EXCLUDES (not needed on the invoked tool paths, keeps image lean):
#   stabilitydesigner/data (296M train/benchmark) · patchseqml/data (156M; sim needs none)
#   screenserver/data (training) · every tool's out/ + __pycache__ · the 1.6G .esm_cache
set -euo pipefail

RT="${RT:-$HOME/agfarms/bucket-foundation/services/research-tools}"
BIO="${BIO:-$HOME/agfarms/biophysics-phd-review}"
SS="${SS:-$HOME/screenserver}"
STAGE="${STAGE:-/tmp/rt-tools-build}"
HF="${HF:-$HOME/.cache/huggingface/hub/models--sentence-transformers--all-MiniLM-L6-v2}"

rm -rf "$STAGE"
mkdir -p "$STAGE/vendor/tools" "$STAGE/deploy" "$STAGE/hf-cache/hub"

# gateway + the self-contained REAL backends (same as the lean image):
# tools_rag (RAG x5 incl. quantumbiorag), tools_dnarna, tools_neuro,
# tools_protocol (ProtocolGPT), tools_toxin (ToxinChannelFinder),
# tools_citation (CitationGraph), AND the three new CPU clusters:
# tools_imaging (CalciumTraceML/CellSegTrack/AFM-CurveML/TractionForceML),
# tools_figure (FigureMiner), tools_genomics (ChromatinAccess/AggregatePredict/
# ChannelDwell). All stdlib/CPU (scipy/scikit-image/numpy); no extra vendoring.
# NOTE: tools_fair (FAIRCheck) + tools_repli (RepliCheck) are the 2026-06-22
# all-field horizontal tools; llm_client is the OPTIONAL shared LLM seam
# (tools_rag + tools_protocol import it under a try/except — it no-ops without
# an API key). All three MUST be staged or the Dockerfile COPY fails.
# tools_causal/materials/power/geo/mlrepro are the 2026-06-22 (later) FIVE
# per-field NON-bio tools — they MUST be staged too or the Dockerfile COPY
# (deploy/Dockerfile.tools lines 85-86) fails. CausalDesigner adds networkx
# (already pinned in requirements.tools.txt); the other four reuse scipy/numpy.
# tools_seqalign/stoich/units/survival/forecast are the 2026-06-24 FIVE per-field
# CLASSICAL-algorithm tools (Needleman-Wunsch/Smith-Waterman, equation balancing,
# SI dimensional analysis, Kaplan-Meier+log-rank, Holt-Winters). They MUST be
# staged too or the Dockerfile COPY fails. All reuse numpy/scipy (already pinned)
# — NO new dependency.
cp "$RT/gateway.py" "$RT/tools_rag.py" "$RT/tools_dnarna.py" "$RT/tools_neuro.py" \
   "$RT/tools_protocol.py" "$RT/tools_toxin.py" "$RT/tools_citation.py" \
   "$RT/tools_imaging.py" "$RT/tools_figure.py" "$RT/tools_genomics.py" \
   "$RT/tools_fair.py" "$RT/tools_repli.py" \
   "$RT/tools_causal.py" "$RT/tools_materials.py" "$RT/tools_power.py" \
   "$RT/tools_geo.py" "$RT/tools_mlrepro.py" \
   "$RT/tools_seqalign.py" "$RT/tools_stoich.py" "$RT/tools_units.py" \
   "$RT/tools_survival.py" "$RT/tools_forecast.py" "$RT/llm_client.py" "$STAGE/"
cp "$RT/deploy/requirements.tools.txt" "$RT/deploy/Dockerfile.tools" "$STAGE/deploy/"

ex=(--exclude '__pycache__' --exclude 'out' --exclude '.pytest_cache')

rsync -a "${ex[@]}"                 "$BIO/labbrain/"          "$STAGE/vendor/tools/labbrain/"
rsync -a "${ex[@]}"                 "$BIO/proteinscout/"      "$STAGE/vendor/tools/proteinscout/"
rsync -a "${ex[@]}" --exclude 'data' "$BIO/stabilitydesigner/" "$STAGE/vendor/tools/stabilitydesigner/"
rsync -a "${ex[@]}" --exclude 'data' "$BIO/patchseqml/"        "$STAGE/vendor/tools/patchseqml/"
rsync -a "${ex[@]}" --exclude 'data' "$SS/"                    "$STAGE/vendor/screenserver/"
# trajmine + cryotriage: DEMO/SYNTHETIC mode only (CPU; no GPU). Source only —
# trajmine fetches its demo trajectory via mdshare at runtime; cryotriage's 3.7G
# real-micrograph data/ is NOT needed for the synth path, so exclude it.
rsync -a "${ex[@]}"                 "$BIO/trajmine/"          "$STAGE/vendor/tools/trajmine/"
rsync -a "${ex[@]}" --exclude 'data' "$BIO/cryotriage/"        "$STAGE/vendor/tools/cryotriage/"

rsync -a "$HF" "$STAGE/hf-cache/hub/"

echo "staged context at $STAGE"
du -sh "$STAGE"
