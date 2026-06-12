#!/usr/bin/env bash
# Validate the Bucket Academy app: JSON integrity + JS syntax + engine simulation.
# Used by the overnight build loop before committing, and by humans before shipping.
set -e
cd "$(dirname "$0")"
echo "== corpus JSON integrity =="
for f in corpus/*.json; do
  python3 - "$f" <<'PY'
import json,sys,collections
f=sys.argv[1]; d=json.load(open(f)); a=d['atoms']; ids=[x['id'] for x in a]
dup=[k for k,v in collections.Counter(ids).items() if v>1]
miss=sorted({r for x in a for r in x.get('requires',[]) if r not in ids})
nq=[x['id'] for x in a if not x.get('quiz')]
assert not dup, f"{f}: duplicate ids {dup}"
assert not miss, f"{f}: missing requires {miss}"
assert not nq, f"{f}: atoms without quiz {nq}"
# every atom needs depths + summary
bad=[x['id'] for x in a if not x.get('summary') or not x.get('depths')]
assert not bad, f"{f}: atoms missing summary/depths {bad}"
print(f"  OK {f}: {len(a)} atoms, no dupes/missing/empty")
PY
done
echo "== JS syntax =="
for f in js/*.js; do node --check "$f" && echo "  OK $f"; done
echo "== engine simulation =="
node -e '
const g=globalThis,fs=require("fs"),store={};
g.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const base="'"$PWD"'";
const corpus=fs.readFileSync(base+"/corpus/biophysics.json","utf8");
g.fetch=async()=>({json:async()=>JSON.parse(corpus)});
require(base+"/js/fsrs.js");require(base+"/js/engine.js");
(async()=>{const E=new g.Engine();await E.load("x");
let now=Date.now(),guard=0;
for(let d=0;d<60;d++){const t=now+d*86400000;const r=E.route(t);for(const it of r)E.grade(it.id,3,"recall",t);if(++guard>200)break;}
const s=E.summary(now+60*86400000);
if(s.introduced!==E.atoms.length){console.error("FAIL: not all introduced",s);process.exit(1);}
console.log("  OK engine: all",s.introduced,"introduced, xp",s.xp,"streak",s.streak);
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
'
echo "ALL VALIDATIONS PASSED"
