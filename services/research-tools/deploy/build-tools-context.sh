#!/usr/bin/env bash
set -euo pipefail

RT="${RT:-$HOME/agfarms/bucket-foundation/services/research-tools}"
BIO="${BIO:-$HOME/agfarms/biophysics-phd-review}"
SS="${SS:-$HOME/screenserver}"
STAGE="${STAGE:-/tmp/rt-tools-build}"
HF="${HF:-$HOME/.cache/huggingface/hub/models--sentence-transformers--all-MiniLM-L6-v2}"

rm -rf "$STAGE"
mkdir -p "$STAGE/vendor/tools" "$STAGE/deploy" "$STAGE/hf-cache/hub"

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
rsync -a "${ex[@]}"                 "$BIO/trajmine/"          "$STAGE/vendor/tools/trajmine/"
rsync -a "${ex[@]}" --exclude 'data' "$BIO/cryotriage/"        "$STAGE/vendor/tools/cryotriage/"

rsync -a "$HF" "$STAGE/hf-cache/hub/"

echo "staged context at $STAGE"
du -sh "$STAGE"
