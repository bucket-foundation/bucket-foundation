#!/bin/bash
R=/home/gian/agfarms/bucket-foundation/finance/06-youtube
for id in $(grep '^OK' $R/_tools/pull-status.txt | awk '{print $3}'); do
  [ -s $R/videos/$id/DIGEST.md ] || { echo $id; exit; }
done
