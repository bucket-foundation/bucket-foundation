#!/usr/bin/env bash
# Speed up the embed WITHOUT pausing the running GPU job: retire the old
# PID-based finalize monitor and launch N parallel CPU workers on disjoint hash
# partitions (DESC, opposite end from the main ASC job).
cd /home/gian/agfarms/bucket-foundation
mkdir -p _intake/photons/logs
pkill -f "finalize_full.sh" 2>/dev/null && echo "retired old finalize monitor" || echo "no old monitor"
sleep 1
for s in 0 1 2 3; do
  nohup python3 scripts/photon/embed_worker.py --slots 4 --slot "$s" --order desc --threads 3 \
    > "_intake/photons/logs/worker_$s.log" 2>&1 &
  echo "launched CPU worker slot $s -> pid $!"
done
