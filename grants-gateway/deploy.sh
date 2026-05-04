#!/usr/bin/env bash
# deploy.sh — one-command deploy of grants-gateway to the agfarms-k3s cluster
# (Hetzner CPX42, K3s in a Docker container named agfarms-k3s).
#
# Mirrors ~/agfarms/kruse/deploy.sh — the AGFarms reference feed402 deploy.
#
# Requires:
#   - docker (build + push image locally)
#   - sshpass (non-interactive SSH to the K3s host)
#   - env: DEPLOY_SERVER=<hetzner ip>  SERVER_PASS=<ssh pass>
#   - (first deploy) FEED402_WALLET=0x...  ANTHROPIC_API_KEY=sk-ant-...
#
# Usage:
#   ./deploy.sh                      # build, push, apply manifest, rollout
#   ./deploy.sh --skip-build         # already pushed → just apply/rollout
#   ./deploy.sh --seed-secret        # also (re)create grants-env secret
#   ./deploy.sh --dry-run            # show commands without running
#
# First deploy:
#   FEED402_WALLET=0xYOUR_BASE_WALLET \
#   ANTHROPIC_API_KEY=sk-ant-xxx \
#   ./deploy.sh --seed-secret
#
# IMPORTANT: ./data/grants.db must exist locally before this script runs
# (the corpus is baked into the image). Produce it with:
#   python3 scripts/ingest.py        # ~10 min, idempotent

set -euo pipefail
cd "$(dirname "$0")"

SKIP_BUILD=false
SEED_SECRET=false
DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)   SKIP_BUILD=true  ; shift ;;
    --seed-secret)  SEED_SECRET=true ; shift ;;
    --dry-run)      DRY_RUN=true     ; shift ;;
    -h|--help)      head -28 "$0" | tail -25 ; exit 0 ;;
    *)              echo "unknown arg: $1" ; exit 1 ;;
  esac
done

SERVER="${DEPLOY_SERVER:?Set DEPLOY_SERVER env var (Hetzner IP)}"
SERVER_USER="${DEPLOY_USER:-giany}"
SERVER_PASS="${SERVER_PASS:?Set SERVER_PASS env var}"
IMAGE="farmera/bucket-grants-gateway"
TAG="${GRANTS_IMAGE_TAG:-v0.1.0-alpha.2}"
NS="grants"

if ! command -v sshpass >/dev/null 2>&1; then
  echo "x sshpass required (sudo dnf install sshpass  /  apt install sshpass)" >&2
  exit 1
fi

run() { if $DRY_RUN; then echo "  [dry-run] $*"; else "$@"; fi; }
ssh_run() {
  if $DRY_RUN; then echo "  [dry-run] ssh $SERVER -- $*"
  else sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
       "${SERVER_USER}@${SERVER}" "$@"
  fi
}

echo "-> target: ${SERVER_USER}@${SERVER}  ns=${NS}  image=${IMAGE}:${TAG}"

# --- 0. Pre-flight: corpus must exist (baked into image) --------------------
if ! $SKIP_BUILD; then
  if [[ ! -f data/grants.db ]]; then
    echo "x data/grants.db missing — run: python3 scripts/ingest.py" >&2
    exit 1
  fi
  DB_SIZE=$(du -h data/grants.db | cut -f1)
  echo "-> corpus: data/grants.db (${DB_SIZE})"
fi

# --- 1. Build + push --------------------------------------------------------
if ! $SKIP_BUILD; then
  echo "-> building image"
  run docker build -t "${IMAGE}:${TAG}" .
  echo "-> pushing ${IMAGE}:${TAG}"
  run docker push "${IMAGE}:${TAG}"
else
  echo "-> skip build (--skip-build)"
fi

# --- 2. Ensure namespace ----------------------------------------------------
echo "-> ensuring namespace ${NS}"
ssh_run "docker exec agfarms-k3s kubectl get ns ${NS} >/dev/null 2>&1 || docker exec agfarms-k3s kubectl create ns ${NS}"

# --- 3. Seed secret ---------------------------------------------------------
if $SEED_SECRET; then
  : "${FEED402_WALLET:?Set FEED402_WALLET for --seed-secret (Base wallet 0x...)}"
  : "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY for --seed-secret}"
  FACIL="${FEED402_FACILITATOR_URL:-https://facilitator.x402.rs}"
  CHAIN="${FEED402_CHAIN:-base}"
  VERIFY="${FEED402_VERIFY_MODE:-facilitator}"
  SYNTH="${INSIGHT_SYNTH:-anthropic}"
  echo "-> (re)creating secret grants-env"
  ssh_run "docker exec agfarms-k3s kubectl -n ${NS} delete secret grants-env --ignore-not-found"
  ssh_run "docker exec agfarms-k3s kubectl -n ${NS} create secret generic grants-env \
    --from-literal=FEED402_WALLET='${FEED402_WALLET}' \
    --from-literal=FEED402_CHAIN='${CHAIN}' \
    --from-literal=FEED402_VERIFY_MODE='${VERIFY}' \
    --from-literal=FEED402_FACILITATOR_URL='${FACIL}' \
    --from-literal=ANTHROPIC_API_KEY='${ANTHROPIC_API_KEY}' \
    --from-literal=INSIGHT_SYNTH='${SYNTH}'"
fi

# --- 4. Apply manifest ------------------------------------------------------
echo "-> applying deploy/k8s.yaml"
if ! $DRY_RUN; then
  sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no deploy/k8s.yaml \
    "${SERVER_USER}@${SERVER}:/tmp/grants-k8s.yaml"
  ssh_run "docker cp /tmp/grants-k8s.yaml agfarms-k3s:/tmp/grants-k8s.yaml && \
           docker exec agfarms-k3s kubectl apply -f /tmp/grants-k8s.yaml"
fi

# --- 5. Rollout -------------------------------------------------------------
echo "-> rolling deployment"
ssh_run "docker exec agfarms-k3s kubectl -n ${NS} set image deploy/grants-gateway server=${IMAGE}:${TAG} --record=false || true"
ssh_run "docker exec agfarms-k3s kubectl -n ${NS} rollout restart deploy/grants-gateway"
ssh_run "docker exec agfarms-k3s kubectl -n ${NS} rollout status deploy/grants-gateway --timeout=180s"

# --- 6. Verify --------------------------------------------------------------
echo "-> sanity check (ClusterIP /health)"
ssh_run "docker exec agfarms-k3s kubectl -n ${NS} run grants-check --rm -i --restart=Never --image=curlimages/curl -- curl -sf http://grants-gateway/health" || true

echo ""
echo "v deploy complete"
echo ""
echo "DNS: point grants-gateway.nucleus.agfarms.dev (CNAME or A) at the ingress IP."
echo "Cert: cert-manager will issue Let's Encrypt automatically once DNS resolves."
echo ""
echo "Check:  curl -s https://grants-gateway.nucleus.agfarms.dev/.well-known/feed402.json | jq"
echo "402:    curl -i https://grants-gateway.nucleus.agfarms.dev/grants/query?topic=ai"
echo "Paid:   curl -s -H 'x-payment: <signed-base-payload>' \\"
echo "          https://grants-gateway.nucleus.agfarms.dev/grants/query?topic=ai | jq"
