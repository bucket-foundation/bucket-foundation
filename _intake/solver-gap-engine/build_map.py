import json, re, pathlib, collections
root = pathlib.Path("fc/FormalConjectures")
pat = re.compile(r'(/--(?P<doc>.*?)-/\s*)?@\[category research (?P<st>open|solved)(?P<tags>[^\]]*)\]\s*(?:theorem|lemma)\s+(?P<name>\S+)', re.S)
rows = []
for f in root.rglob("*.lean"):
    t = f.read_text(errors="ignore")
    for m in pat.finditer(t):
        ams = re.findall(r'AMS ([0-9 ]+)', m["tags"])
        rows.append({"id": f"{f.relative_to(root)}::{m['name']}", "status": m["st"],
            "ams": ams[0].split() if ams else [], "lean_proof": "formal_proof" in m["tags"],
            "text": " ".join((m["doc"] or "").split())[:1200]})
pathlib.Path("problem_map.jsonl").write_text("\n".join(json.dumps(r) for r in rows))
c = collections.Counter(r["status"] for r in rows)
print(len(rows), dict(c), sum(r["lean_proof"] for r in rows), sum(1 for r in rows if r["text"]))
