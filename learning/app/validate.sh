#!/usr/bin/env bash
# Validate the Bucket Academy app: JSON integrity + JS syntax + engine simulation.
# Used by the overnight build loop before committing, and by humans before shipping.
set -e
cd "$(dirname "$0")"
echo "== corpus JSON integrity =="
for f in corpus/*.json; do
  python3 - "$f" <<'PY'
import json,sys,collections
f=sys.argv[1]; d=json.load(open(f))
# index.json is the branch MANIFEST (a list of decks), not a corpus — skip it.
if 'atoms' not in d:
    print(f"  -- {f}: manifest ({len(d.get('decks',[]))} decks), skipping corpus checks"); sys.exit(0)
a=d['atoms']; ids=[x['id'] for x in a]
kind=d.get('meta',{}).get('kind','concept')
dup=[k for k,v in collections.Counter(ids).items() if v>1]
miss=sorted({r for x in a for r in x.get('requires',[]) if r not in ids})
assert not dup, f"{f}: duplicate ids {dup}"
assert not miss, f"{f}: missing requires {miss}"
assert all(x.get('shell') for x in a), f"{f}: atoms missing shell"
if kind=='language':
    # language atoms carry gloss + per-language forms instead of quiz/depths
    langs=d.get('meta',{}).get('languages',[])
    bad=[x['id'] for x in a if not x.get('gloss') or not all(l in x.get('forms',{}) and x['forms'][l].get('word') for l in langs)]
    assert not bad, f"{f}: language atoms missing gloss/forms {bad}"
    print(f"  OK {f}: {len(a)} language entries x {len(langs)} languages")
else:
    nq=[x['id'] for x in a if not x.get('quiz')]
    assert not nq, f"{f}: atoms without quiz {nq}"
    bad=[x['id'] for x in a if not x.get('summary') or not x.get('depths')]
    assert not bad, f"{f}: atoms missing summary/depths {bad}"
    print(f"  OK {f}: {len(a)} atoms, no dupes/missing/empty")
PY
done
echo "== manifest consistency =="
python3 - <<'PY'
import json,os
m=json.load(open('corpus/index.json'))
decks=m.get('decks',[])
ids=[d['id'] for d in decks]
assert len(ids)==len(set(ids)), f"manifest: duplicate deck ids {ids}"
for d in decks:
    assert d.get('id') and d.get('file') and d.get('pill'), f"manifest: deck missing id/file/pill: {d}"
    assert os.path.exists(d['file']), f"manifest: deck file not found: {d['file']}"
print(f"  OK corpus/index.json: {len(decks)} built-in decks, all files present")
PY
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
