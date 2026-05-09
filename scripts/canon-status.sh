#!/usr/bin/env bash
V=bucket-foundation
D=$HOME/agfarms/$V
yt=$(ls $D/yt 2>/dev/null | wc -l)
ar=$(ls $D/archive 2>/dev/null | wc -l)
pm=$(ls $D/pubmed 2>/dev/null | wc -l)
ax=$(ls $D/arxiv 2>/dev/null | wc -l)
fts=$(python3 -c "import sqlite3;c=sqlite3.connect('$D/.fts.sqlite');print(c.execute('SELECT COUNT(*) FROM docs').fetchone()[0])" 2>/dev/null || echo 0)
pursue=$(python3 -c "import json;d=json.load(open('$D/_intake/war-gov-pursue-release-01/.status.json'));print(f\"{d['files_mirrored']}/{d['urls_total']}\")" 2>/dev/null || echo "n/a")
printf "[canon] yt=%d archive=%d pubmed=%d arxiv=%d  fts=%d  pursue=%s\n" "$yt" "$ar" "$pm" "$ax" "$fts" "$pursue"
