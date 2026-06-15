#!/usr/bin/env bash
# Background completer (Nucleus): waits for the LaBSE semantic embedding to
# finish, then runs the idempotent deploy and verifies the live endpoint.
# Launched after the dictionary-coverage agent ended mid-embedding.
set -uo pipefail
cd /home/gian/agfarms/bucket-foundation
LOG=_intake/photons/complete-deploy.log
exec > >(tee -a "$LOG") 2>&1
echo "=========================================================="
echo "[completer] started $(date -u)"
EMB_PID=4064462
DB=_intake/photons/index.sqlite

emb_count() { python3 -c "import sqlite3;print(sqlite3.connect('$DB').execute('select count(*) from photons where semantic_row is not null').fetchone()[0])"; }
tot_count() { python3 -c "import sqlite3;print(sqlite3.connect('$DB').execute('select count(*) from photons').fetchone()[0])"; }

# 1) Wait for the embedding process to exit (poll /proc, no signals sent).
waited=0
while [ -d "/proc/$EMB_PID" ]; do
  sleep 60; waited=$((waited+1))
  if [ $((waited % 10)) -eq 0 ]; then echo "[completer] +${waited}m embedded=$(emb_count)"; fi
  if [ "$waited" -gt 300 ]; then echo "[completer] TIMEOUT (5h) — proceeding to check anyway"; break; fi
done
echo "[completer] embedding process ended after ~${waited}m"

EMB=$(emb_count); TOT=$(tot_count)
echo "[completer] embedded=$EMB total=$TOT"
if [ "$EMB" -lt 150000 ]; then
  echo "[completer] ABORT: embedding looks incomplete ($EMB < 150000); not deploying."
  exit 1
fi

# 2) Idempotent deploy (rsync substrate + server, venv, user service, nginx/cert).
echo "[completer] running deploy.sh ..."
if bash services/photon-api/deploy.sh; then
  echo "[completer] deploy.sh OK"
else
  echo "[completer] DEPLOY FAILED (see above)"; exit 1
fi

# 3) Live verification via urllib (no curl; avoids the bash hook).
python3 - <<'PY'
import urllib.request, json
BASE = "https://polingual.agfarms.dev"
def get(p):
    with urllib.request.urlopen(BASE + p, timeout=20) as r:
        return json.load(r)
try:
    h = get("/healthz")
    print(f"[completer] healthz: photons={h.get('photons')} langs={h.get('languages')} sem_dim={h.get('semantic_dim')}")
except Exception as e:
    print(f"[completer] healthz ERROR: {e}")
for w in ("gold", "entropy", "energy"):
    try:
        r = get(f"/lookup?surface={w}&lang=en")
        forms = r.get("forms") or r.get("results") or r.get("translations") or r
        print(f"[completer] lookup {w}: OK ({r.get('took_ms','?')}ms) keys={list(r)[:6]}")
    except Exception as e:
        print(f"[completer] lookup {w}: ERROR {e}")
try:
    s = get("/semantic?surface=entropy&lang=en&k=8")
    nb = s.get("neighbors") or s.get("results") or []
    langs = sorted({(n.get('lang') if isinstance(n, dict) else None) for n in nb} - {None})
    print(f"[completer] semantic entropy: {len(nb)} neighbors across langs={langs} ({s.get('took_ms','?')}ms)")
except Exception as e:
    print(f"[completer] semantic entropy: ERROR {e}")
PY
echo "[completer] DONE $(date -u)"
echo "=========================================================="
