#!/bin/bash
ROOT=/home/gian/agfarms/bucket-foundation/finance/06-youtube
LIST=${1:-$ROOT/_tools/pull-list.txt}
STATUS=$ROOT/_tools/pull-status.txt
LOGD=$ROOT/_tools/logs
mkdir -p $LOGD
echo $$ > $ROOT/_tools/pull.pid
consec=0
while IFS='|' read -r tag id title dur; do
  [ -z "$id" ] && continue
  if [ -s "$ROOT/videos/$id/transcript.txt" ]; then echo "SKIP $id" >> $STATUS; continue; fi
  free=$(df --output=avail -BG / | tail -1 | tr -dc 0-9)
  if [ "$free" -lt 30 ]; then echo "STOP disk $free" >> $STATUS; break; fi
  log=$LOGD/$id.log
  python3 -W ignore /home/gian/agfarms/tools/youtube/yt.py pull "https://www.youtube.com/watch?v=$id" --out "$ROOT/videos/$id" > $log 2>&1
  if [ -s "$ROOT/videos/$id/transcript.txt" ]; then
    consec=0
    sed -i '1s/^/<!-- voice-ignore-file -->\n/' "$ROOT/videos/$id/info.md"
    echo "OK $tag $id $dur" >> $STATUS
    sleep 90
  else
    if grep -qiE 'no captions|no subtitle|available: \[\]' $log; then
      echo "NOCAP $tag $id" >> $STATUS; sleep 90
    elif grep -qiE '429|too many|sign in|bot|confirm you' $log; then
      consec=$((consec+1)); echo "RATE $tag $id consec=$consec" >> $STATUS
      [ $consec -ge 5 ] && { echo "STOP 5 consecutive" >> $STATUS; break; }
      sleep $((240 + 60*consec))
    else
      consec=$((consec+1)); echo "FAIL $tag $id consec=$consec $(grep -v Warn $log | tail -1 | cut -c1-150)" >> $STATUS
      [ $consec -ge 5 ] && { echo "STOP 5 consecutive" >> $STATUS; break; }
      sleep 240
    fi
  fi
done < "$LIST"
echo "DONE" >> $STATUS
rm -f $ROOT/_tools/pull.pid
