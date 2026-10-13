import argparse, hashlib, json, math, os, pathlib, random, re, subprocess, time
from concurrent.futures import ThreadPoolExecutor
from lean_features import ASYMPTOTIC, IDENT, binder_types, namespace, split_binders, statements

TACTICS = ["decide", "omega", "simp", "norm_num", "aesop"]
ALLOWED_AXIOMS = {"propext", "Classical.choice", "Quot.sound"}
INFINITE = re.compile(r"ℝ|ℂ|ℚ|π|ℕ\+|∞|\bfinrank\b|\bvolume\b|\bfrontier\b|\bIrrational\b|\bReal\b|\bSet\b|\bsInf\b|\bsSup\b|⨆|⨅|\.Infinite\b|\.Finite\b|\bncard\b|\bType\b|ℵ|Cardinal|Ordinal|∑'|∏'|\bMeasure\b|∫|\{[^{}|]*\|")
QUANTIFIER = re.compile(r"∃!|∀|∃")
ATOM = r"(?:Fin\s+\w+|ZMod\s+\d+|Bool|\(Fin\s+\w+\)|\(ZMod\s+\d+\))"
FINITE_TYPE = r"(?:(?:Finset|Equiv\.Perm|SimpleGraph|Sym2)\s*" + ATOM + r"|" + ATOM + r"\s*→\s*" + ATOM + r"|" + ATOM + r")\s*(?=[,)}]|$)"
BOUNDED = re.compile(r"\s*\(?\s*[\w' ]+?\s*(?:∈\s*\(?(?:Finset\.)?(?:range|Icc|Ico|Ioc|Ioo|univ|powerset|powersetCard|filter|divisors|primeFactors|Finset\.\w+)|[<≤]\s*\(?\d+|:\s*\(?" + FINITE_TYPE + ")")

def strip_answer(body):
    return re.sub(r"^\s*:?\s*answer\(sorry\)\s*↔", "", body)


def unbounded_quantifiers(text):
    return [text[m.start():m.start() + 40] for m in QUANTIFIER.finditer(text) if not BOUNDED.match(text, m.end())]


def classify(row):
    stmt = row["statement"]
    binders, body = split_binders(stmt)
    core = strip_answer(body)
    reasons = []
    free = [n for names, kind, br in binder_types(binders) if br in "({" and not re.match(FINITE_TYPE, kind) and re.match(r"(?:ℕ|ℤ|ℝ|ℂ|ℚ|\(|[A-Zα-ω])", kind) for n in names]
    if free:
        reasons.append("free variable " + " ".join(free[:3]))
    if "answer(sorry)" in stmt and "answer(sorry) ↔" not in stmt:
        reasons.append("answer term is data")
    if ASYMPTOTIC.search(stmt):
        reasons.append("asymptotic")
    if INFINITE.search(stmt):
        reasons.append("infinite object " + INFINITE.search(stmt)[0])
    loose = unbounded_quantifiers(stmt)
    if loose:
        reasons.append("unbounded quantifier " + loose[0].strip())
    if not re.search(r"(?<![\w.])\d+", core) and not re.search(FINITE_TYPE, stmt):
        reasons.append("no numeral")
    if "type_of%" in stmt:
        reasons.append("statement by reference")
    if reasons:
        return None, reasons
    used = sorted({t for t in IDENT.findall(stmt) if t.split(".")[-1] in row["local"]})
    hidden = []
    for u in used:
        text = row["local"][u.split(".")[-1]]
        inner = [t.split(".")[-1] for t in IDENT.findall(text) if t.split(".")[-1] in row["local"] and t.split(".")[-1] != u.split(".")[-1]]
        for name, t in [(u, text)] + [(i, row["local"][i]) for i in inner]:
            if INFINITE.search(t) or ASYMPTOTIC.search(t) or unbounded_quantifiers(t) or "sorry" in t or "noncomputable" in t:
                hidden.append(name.split(".")[-1])
    return ("definition_unbounded" if hidden else "closed"), sorted(set(hidden))


def log10_factorial(n):
    return math.lgamma(n + 1) / math.log(10)


def search_space(stmt):
    parts, total = [], 0.0
    for pat, size, label in [
            (r"SimpleGraph\s*\(Fin\s+(\d+)\)", lambda n: n * (n - 1) / 2 * math.log10(2), "graphs on {} vertices"),
            (r"Equiv\.Perm\s*\(Fin\s+(\d+)\)", log10_factorial, "permutations of {}"),
            (r"Finset\s*\(Fin\s+(\d+)\)", lambda n: n * math.log10(2), "subsets of Fin {}"),
            (r"⊆\s*\(?(?:Finset\.)?(?:range|Icc\s+\d+)\s+(\d+)", lambda n: n * math.log10(2), "subsets of a range of {}"),
            (r"∈\s*\(?(?:Finset\.)?powerset\s*\(?(?:Finset\.)?(?:range|Icc\s+\d+)\s+(\d+)", lambda n: n * math.log10(2), "subsets of a range of {}")]:
        for m in re.finditer(pat, stmt):
            n = int(m[1])
            total += size(n)
            parts.append(label.format(n))
    for m in re.finditer(r"Fin\s+(\d+)\s*→\s*(?:Fin\s+(\d+)|(Bool)|ZMod\s+(\d+))", stmt):
        k = 2 if m[3] else int(m[2] or m[4])
        total += int(m[1]) * math.log10(k)
        parts.append(f"functions Fin {m[1]} to {k} values")
    for m in re.finditer(r"[∀∃]\s*\(?\s*([\w' ]+?)\s*(?:[<≤]\s*\(?(\d+)|∈\s*\(?(?:Finset\.)?(?:range|Icc\s+\d+|Ico\s+\d+)\s+(\d+)|:\s*\(?Fin\s+(\d+)\)?\s*[,)])", stmt):
        n, count = int(m[2] or m[3] or m[4]), len(m[1].split())
        if n > 0:
            total += count * math.log10(n)
            parts.append(f"{count} variable below {n}")
    m = re.search(r"\bW\s+\d+\s+\d+\s*=\s*(\d+)", stmt)
    if m:
        return round(int(m[1]) * math.log10(2), 1), f"2-colourings of 1..{m[1]}, read from the local definition by hand"
    m = re.search(r"HasCompleteMOLS\s+(\d+)", stmt)
    if m:
        n = int(m[1])
        return round((n - 1) * n * n * math.log10(n), 1), f"{n - 1} square tables of order {n}, read from the local definition by hand"
    if not parts:
        return None, "single evaluation; cost set by the definitions, absent from the statement"
    return round(total, 1), "; ".join(parts)


def module_of(rel):
    return ".".join(c if re.fullmatch(r"[A-Za-z_]\w*", c) else f"«{c}»" for c in ["FormalConjectures"] + rel[:-5].split("/"))


def lean_name(row):
    quoted = ".".join(c if re.fullmatch(r"[A-Za-z_][\w']*", c) else f"«{c}»" for c in row["name"].split("."))
    return (row["namespace"] + "." if row["namespace"] else "") + quoted


def lean_env(build):
    ask = lambda *a: subprocess.run(["lake", "env", *a], cwd=build, capture_output=True, text=True, check=True).stdout.strip()
    return {"lean": ask("which", "lean"), "path": ask("printenv", "LEAN_PATH"), "cwd": build}


def run_lean(env, path, timeout, memory):
    t = time.time()
    cmd = ["systemd-run", "--user", "--scope", "-q", "-p", f"MemoryMax={memory}", "-p", "MemorySwapMax=0", "timeout", "-s", "KILL", str(timeout), env["lean"], str(path)]
    r = subprocess.run(cmd, cwd=env["cwd"], capture_output=True, text=True, env={**os.environ, "LEAN_NUM_THREADS": "1", "LEAN_PATH": env["path"]})
    return r.returncode, r.stdout + r.stderr, round(time.time() - t, 1)


def write_file(scratch, row, combos):
    target = f"type_of% @{lean_name(row)}"
    lines = ["module", f"import {module_of(row['file'])}"]
    for k, (tactic, answer) in enumerate(combos):
        lines += [f"theorem attempt_{k} : {'¬ (' + target + ')' if answer == 'False' else target} := by {tactic}", f"#print axioms attempt_{k}"]
    path = scratch / f"{hashlib.sha1((row['id'] + repr(combos)).encode()).hexdigest()[:12]}.lean"
    path.write_text("\n".join(lines) + "\n")
    return path


def judge(out, k, tactic):
    line = 3 + 2 * k
    errors = [m[2] for m in re.finditer(r":(\d+):\d+: error:?(.*?)(?=\n\S+:\d+:\d+: |\n'|\Z)", out, re.S) if int(m[1]) == line]
    axioms = re.search(rf"attempt_{k}' (does not depend on any axioms|depends on axioms: \[([^\]]*)\])", out)
    names = {x.strip() for x in (axioms[2] or "").split(",") if x.strip()} if axioms else set()
    message = " ".join((errors[0] if errors else "axioms " + ", ".join(sorted(names)) if axioms else "no output").split())[:200]
    if errors or not axioms:
        return ("harness_error" if tactic == "sorry" else "failure"), message
    if tactic == "sorry":
        return "harness_ok", message
    return ("success" if names <= ALLOWED_AXIOMS else "failure"), message


def sweep(job):
    env, scratch, row, combos, timeout, memory = job
    code, out, secs = run_lean(env, write_file(scratch, row, combos), timeout, memory)
    records = []
    if code not in (124, 137, -9) and (out.strip() or code == 0):
        for k, (tactic, answer) in enumerate(combos):
            outcome, message = judge(out, k, tactic)
            records.append({"id": row["id"], "tactic": tactic, "answer": answer, "outcome": outcome, "process": "shared", "seconds": secs, "message": message})
        return records
    if len(combos) == 1:
        tactic, answer = combos[0]
        return [{"id": row["id"], "tactic": tactic, "answer": answer, "outcome": "timeout" if code in (124, 137, -9) else "killed", "process": "own", "seconds": secs, "message": " ".join(out.split())[:200]}]
    for combo in combos:
        for r in sweep((env, scratch, row, [combo], timeout, memory)):
            records.append({**r, "process": "own"})
    return records


def controls(build, limit=8):
    out = []
    for path in sorted((build / ROOT_DIR).rglob("*.lean")):
        rel, text = str(path.relative_to(build / ROOT_DIR)), path.read_text()
        for m in re.finditer(r"@\[category (?:test|textbook|API)[^\]]*\]\s*(?:theorem|lemma)\s+(\S+)\s*:(?:(?!\n\s*\n).)*?:=\s*by\s+(decide|omega|simp|norm_num|aesop)\s*\n\s*\n", text, re.S):
            out.append({"id": f"{rel}::{m[1]}", "file": rel, "name": m[1], "namespace": namespace(text, m.start()), "tactic": m[2]})
    random.Random(0).shuffle(out)
    return out[:limit]


def listing(repo, head, pin):
    rows, pinned = statements(repo, head), statements(repo, pin)
    out, rejected = [], {}
    for pid, r in rows.items():
        if r["status"] != "open":
            continue
        tier, notes = classify(r)
        if tier is None:
            key = notes[0].split()[0] + " " + notes[0].split()[1] if len(notes[0].split()) > 1 else notes[0]
            rejected[key] = rejected.get(key, 0) + 1
            continue
        size, basis = search_space(r["statement"])
        same = pid in pinned and pinned[pid]["statement"] == r["statement"] and pinned[pid]["status"] == "open"
        out.append({"id": pid, "file": r["file"], "name": r["name"], "namespace": r["namespace"], "statement": r["statement"], "tier": tier, "unbounded_definitions": notes,
                    "log10_cases": size, "search_basis": basis, "bounded_search": size is not None, "same_statement_at_pin": same, "statement_sha1": hashlib.sha1(r["statement"].encode()).hexdigest()[:12]})
    return sorted(out, key=lambda x: (x["tier"], x["id"])), rejected, sum(r["status"] == "open" for r in rows.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--head", default="HEAD")
    ap.add_argument("--pin", default="7d450ef")
    ap.add_argument("--build")
    ap.add_argument("--scratch")
    ap.add_argument("--out", default="backtest")
    ap.add_argument("--sample", type=int, default=60)
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--timeout", type=int, default=60)
    ap.add_argument("--memory", default="4G")
    ap.add_argument("--resume", action="store_true")
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(exist_ok=True)
    cases, rejected, n_open = listing(a.repo, a.head, a.pin)
    res = {"head": a.head, "pin": a.pin, "open": n_open, "finite": len(cases), "by_tier": {t: sum(c["tier"] == t for c in cases) for t in ("closed", "definition_unbounded")},
           "bounded_search": sum(c["bounded_search"] for c in cases), "rejected_first_reason": dict(sorted(rejected.items(), key=lambda t: -t[1])), "cases": cases}
    if a.build:
        build, scratch = pathlib.Path(a.build).resolve(), pathlib.Path(a.scratch).resolve()
        scratch.mkdir(parents=True, exist_ok=True)
        pool = [c for c in cases if c["same_statement_at_pin"]]
        random.Random(0).shuffle(pool)
        pool.sort(key=lambda c: (not c["bounded_search"], c["tier"] != "closed"))
        sample = pool[:a.sample]
        checks = controls(build)
        files = sorted({ROOT_DIR + c["file"] for c in sample + checks})
        built = subprocess.run(["systemd-run", "--user", "--scope", "-q", "-p", "MemoryMax=12G", "lake", "build", *files], cwd=build, capture_output=True, text=True, env={**os.environ, "LEAN_NUM_THREADS": str(a.jobs)})
        res["build"] = {"modules": len(files), "exit": built.returncode, "tail": " ".join((built.stdout + built.stderr).split())[-300:]}
        env = lean_env(build)
        answers = lambda c: ("True", "False") if "answer(sorry)" in c["statement"] else (None,)
        plan = lambda c: [("sorry", answers(c)[0])] + [(t, ans) for t in TACTICS for ans in answers(c)]
        flat = lambda groups: [r for g in groups for r in g]
        log = out / "attempts.jsonl"
        prior = [json.loads(x) for x in log.read_text().splitlines()] if a.resume and log.exists() else []
        done = {r["id"] for r in prior if r["outcome"] == "harness_ok"}
        kept = [r for r in prior if r["id"] in done and r["id"] in {c["id"] for c in sample} and not r.get("control") and not r.get("recheck")]
        old_controls = [r for r in prior if r.get("control") and r["outcome"] == "success"]
        with ThreadPoolExecutor(a.jobs) as ex:
            everything = kept + flat(ex.map(sweep, [(env, scratch, c, plan(c), a.timeout, a.memory) for c in sample if c["id"] not in done]))
            known = old_controls + flat(ex.map(sweep, [(env, scratch, c, [(c["tactic"], None)], a.timeout, a.memory) for c in checks if c["id"] not in {r["id"] for r in old_controls}]))
            base, runs = [r for r in everything if r["tactic"] == "sorry"], [r for r in everything if r["tactic"] != "sorry"]
            ok = {b["id"] for b in base if b["outcome"] == "harness_ok"}
            runs = [r if r["id"] in ok else {**r, "outcome": "harness_error"} for r in runs]
            by_id = {c["id"]: c for c in sample}
            again = flat(ex.map(sweep, [(env, scratch, by_id[r["id"]], [(r["tactic"], r["answer"])], a.timeout, a.memory) for r in runs if r["outcome"] == "success"]))
        for r in again:
            r["recheck"] = True
        for r in known:
            r["control"] = True
        log.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in base + known + runs + again) + "\n")
        tally = {}
        for r in runs:
            tally.setdefault(r["tactic"], {}).setdefault(r["outcome"], 0)
            tally[r["tactic"]][r["outcome"]] += 1
        confirmed = {(r["id"], r["tactic"], r["answer"]) for r in again if r["outcome"] == "success"}
        res["attempts"] = {"sampled": len(sample), "sample_by_tier": {t: sum(c["tier"] == t for c in sample) for t in ("closed", "definition_unbounded")}, "harness_ok": len(ok),
                           "harness_other": {o: sum(b["outcome"] == o for b in base) for o in ("harness_error", "timeout", "killed")}, "runs": len(runs), "by_tactic": tally,
                           "own_process_runs": sum(r["process"] == "own" for r in runs), "resumed_problems": len({r["id"] for r in kept}),
                           "controls": {"proved_upstream_by_one_tactic": len(known), "reproduced": sum(r["outcome"] == "success" for r in known)},
                           "limits": {"processes": a.jobs, "timeout_seconds": a.timeout, "memory": a.memory},
                           "successes_unverified_pending_human_review": [{"id": i, "tactic": t, "answer": ans, "statement_unchanged_since_pin": True} for i, t, ans in sorted(confirmed, key=str)],
                           "successes_not_reproduced": sum(r["outcome"] != "success" for r in again)}
        for c in sample:
            c["attempt"] = {"harness": next(b["outcome"] for b in base if b["id"] == c["id"]), "outcomes": {f"{r['tactic']}{'/' + r['answer'] if r['answer'] else ''}": r["outcome"] for r in runs if r["id"] == c["id"]}}
    json.dump(res, open(out / "finite-cases.json", "w"), indent=1, ensure_ascii=False)
    print(json.dumps({k: v for k, v in res.items() if k != "cases"}, indent=1, ensure_ascii=False))


ROOT_DIR = "FormalConjectures/"

if __name__ == "__main__":
    main()
