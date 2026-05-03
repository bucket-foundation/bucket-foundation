#!/usr/bin/env bash
# bkt-ibj — local patent index bootstrap
# Installs llama.cpp (Vulkan), DuckDB, bge-small GGUF into ./bin and ./models
# No system-wide installs; everything lives under local/patents/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/.bin"
MODELS="$ROOT/models"
mkdir -p "$BIN" "$MODELS"

echo "==> bootstrap into $ROOT"

# 1. llama.cpp with Vulkan (universal AMD GPU acceleration on this Fedora 42 box)
if [[ ! -x "$BIN/llama-server" ]]; then
  echo "==> building llama.cpp (Vulkan backend) ..."
  TMP="$(mktemp -d)"
  git clone --depth 1 https://github.com/ggerganov/llama.cpp "$TMP/llama.cpp"
  cmake -S "$TMP/llama.cpp" -B "$TMP/llama.cpp/build" \
    -DGGML_VULKAN=1 \
    -DLLAMA_CURL=OFF \
    -DCMAKE_BUILD_TYPE=Release
  cmake --build "$TMP/llama.cpp/build" --config Release -j "$(nproc)" \
    --target llama-server llama-embedding
  cp "$TMP/llama.cpp/build/bin/llama-server" "$BIN/"
  cp "$TMP/llama.cpp/build/bin/llama-embedding" "$BIN/"
  rm -rf "$TMP"
else
  echo "==> llama-server already present, skipping build"
fi

# 2. DuckDB CLI
if [[ ! -x "$BIN/duckdb" ]]; then
  echo "==> downloading DuckDB CLI ..."
  curl -fsSL https://github.com/duckdb/duckdb/releases/latest/download/duckdb_cli-linux-amd64.zip \
    -o /tmp/duckdb.zip
  unzip -o /tmp/duckdb.zip -d "$BIN/"
  chmod +x "$BIN/duckdb"
  rm /tmp/duckdb.zip
else
  echo "==> duckdb already present, skipping"
fi

# Pre-install vss + fts + httpfs extensions (so first ingest doesn't hit the network)
"$BIN/duckdb" -c "INSTALL vss; INSTALL fts; INSTALL httpfs; INSTALL parquet;" >/dev/null

# 3. bge-small-en-v1.5 GGUF (~150 MB, q8_0)
GGUF="$MODELS/bge-small-en-v1.5-q8_0.gguf"
if [[ ! -f "$GGUF" ]]; then
  echo "==> downloading bge-small-en-v1.5 GGUF ..."
  curl -fsSL \
    https://huggingface.co/CompendiumLabs/bge-small-en-v1.5-gguf/resolve/main/bge-small-en-v1.5-q8_0.gguf \
    -o "$GGUF"
else
  echo "==> bge-small GGUF already present"
fi

# 4. Python venv for ingest/embed scripts
if [[ ! -d "$ROOT/.venv" ]]; then
  echo "==> creating Python venv ..."
  python3 -m venv "$ROOT/.venv"
  "$ROOT/.venv/bin/pip" install --quiet --upgrade pip
  "$ROOT/.venv/bin/pip" install --quiet duckdb pyarrow requests tqdm
fi

cat <<EOF

==> bootstrap done

llama-server:  $BIN/llama-server
duckdb:        $BIN/duckdb
embedder GGUF: $GGUF
python venv:   $ROOT/.venv (activate with 'source $ROOT/.venv/bin/activate')

next:
  ./scripts/01-fetch-uspto.sh        # ~80 GB, resumable
  $BIN/llama-server -m $GGUF --embedding -ngl 99 --port 8081 &
  ./scripts/02-ingest.py
  ./scripts/03-embed.py --batch 64 --resume
EOF
