# research-tools-gateway — CPU image for the live research tools
# ==============================================================
# Builds the FastAPI gateway (gateway.py) + the three self-contained REAL tool
# backends (tools_rag.py, tools_dnarna.py, tools_neuro.py). CPU base, no GPU,
# no model weights. Serves the 9 fully-functional tools end-to-end:
#   RAG:     paperradar, grantdraft, methodsmatcher, reviewguard  (live OpenAlex)
#   DNA/RNA: rnastructure, grnaoptimizer, rnafmembeds             (ViennaRNA+numpy)
#   neuro:   hhfit, spikefeatures                                 (scipy)
#
# The 7 subprocess/demo tools (labbrain, proteinscout, stabilitydesigner,
# screenserver, patchseqml, trajmine, cryotriage) are present in the registry
# and the gateway answers their endpoints, but they shell out to sibling repos
# (~/agfarms/biophysics-phd-review/<tool>, ~/screenserver) + ML weights that are
# intentionally NOT in this image. They return a clean tool-level error here.
# Vendoring them is a separate, much larger image (future bead). The 9 above run
# live regardless — that is the deliverable of this slice.
#
# Build context = the research-tools dir (one level up from deploy/):
#   docker build -f deploy/Dockerfile -t farmera/research-tools-gateway:<tag> .
FROM python:3.12-slim

# ViennaRNA wheel is self-contained; build-essential kept minimal for any
# source fallback of scipy/numpy on uncommon arches (no-op on x86_64 wheels).
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TOOLS_CACHE_DIR=/data/cache \
    RESEARCH_ATLAS_DIR=/data/research-atlas \
    OPENALEX_MAILTO=research-tools@agfarms.dev

WORKDIR /app

# Deps first for layer caching.
COPY deploy/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# App + the three REAL backends. (We copy explicitly rather than `COPY . .` to
# keep the heavy sibling-repo subprocess tools out and the image lean.)
COPY gateway.py tools_rag.py tools_dnarna.py tools_neuro.py /app/

# Non-root + a writable cache/atlas dir.
RUN useradd -m -u 10001 tools \
    && mkdir -p /data/cache /data/research-atlas \
    && chown -R tools:tools /app /data
USER tools

EXPOSE 8732

# Readiness/liveness target. The gateway binds 0.0.0.0 inside the container so
# the k8s Service can reach it; TLS + auth are terminated upstream (nginx).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python3 -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8732/health',timeout=4).status==200 else 1)"

CMD ["python3", "-m", "uvicorn", "gateway:app", "--host", "0.0.0.0", "--port", "8732", "--workers", "2"]
