#!/bin/bash
cd /home/gian/agfarms/bucket-foundation/finance/06-youtube/_tools
timeout 500 bash -c 'until [ -n "$(./next.sh)" ] || ! [ -f pull.pid ]; do sleep 5; done'
n=$(./next.sh); echo "next=$n"; [ -n "$n" ] && python3 view.py $n ${1:-2200}
