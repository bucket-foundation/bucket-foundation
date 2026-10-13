#!/usr/bin/env python3
import argparse
import collections
import hashlib
import importlib.util
import json
import os
import random
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alignlib as A  # noqa: E402

CACHE = os.path.join(A.HERE, ".cache")
EMBED_SCRIPT = os.path.join(A.REPO, "scripts", "research-os", "embed-texts.py")
PER_ATOM = 10
PER_ATOM_RESOURCES = 5


def repo_model_name():
    spec = importlib.util.spec_from_file_location("embed_texts", EMBED_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.MODEL


def text_key(model, text):
    return hashlib.sha256(f"{model}\n{text}".encode()).hexdigest()[:24]


def embed(texts, model_name):
    os.makedirs(CACHE, exist_ok=True)
    keys_path, vecs_path = os.path.join(CACHE, "keys.json"), os.path.join(CACHE, "vecs.npy")
    keys, vecs = [], np.zeros((0, 384), dtype=np.float32)
    if os.path.exists(keys_path) and os.path.exists(vecs_path):
        keys, vecs = json.load(open(keys_path)), np.load(vecs_path)
    index = {key: i for i, key in enumerate(keys)}
    todo = sorted({t for t in texts if text_key(model_name, t) not in index})
    if todo:
        os.environ.setdefault("HF_HUB_OFFLINE", "1")
        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(model_name, device="cpu")
        new = model.encode(todo, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
        for text in todo:
            index[text_key(model_name, text)] = len(keys)
            keys.append(text_key(model_name, text))
        vecs = np.vstack([vecs, np.asarray(new, dtype=np.float32)])
        np.save(vecs_path, vecs)
        json.dump(keys, open(keys_path, "w"))
    return np.stack([vecs[index[text_key(model_name, t)]] for t in texts]) if texts else vecs[:0]


def corpus_rows(rules):
    rows = []
    for table in ("progression", "courses"):
        for row in A.read_jsonl(os.path.join(A.CORPUS, f"{table}.jsonl.zst")):
            if row.get("same_as"):
                continue
            cip = (row.get("cip") or {}).get("code")
            decks = [deck for deck, rule in rules.items() if A.in_field(rule, cip, row.get("field"))]
            if not decks:
                continue
            label, kind = A.row_label(table, row)
            text = A.row_text(table, row)
            if not text.strip():
                continue
            rows.append({
                "id": row["id"], "table": table, "text": text, "label": label, "kind": kind,
                "level": row.get("level"), "framework_id": row.get("framework_id"),
                "course_code": row.get("code"), "field": row.get("field"), "cip": cip,
                "source_url": row.get("standard_url") or row.get("source_url"),
                "edges_stated": row.get("edges_stated"), "decks": decks,
            })
    return rows


def collapse(rows):
    kept, strands = [], collections.defaultdict(list)
    for row in rows:
        if row["kind"] == "strand":
            strands[(row["text"], row["level"])].append(row)
        else:
            kept.append((row, 1))
    for group in strands.values():
        kept.append((min(group, key=lambda r: r["id"]), len(group)))
    return kept


def candidates(atoms, rows, rules, model_name, limits):
    texts = sorted({r["text"] for r in rows})
    text_index = {t: i for i, t in enumerate(texts)}
    text_vecs = embed(texts, model_name)
    atom_vecs = embed([A.atom_text(a) for a in atoms], model_name)
    by_deck_text = collections.defaultdict(lambda: collections.defaultdict(list))
    for row in rows:
        for deck in row["decks"]:
            by_deck_text[deck][row["text"]].append(row)
    out, best, dropped = [], {}, collections.Counter()
    for deck in sorted(rules):
        pool_texts = sorted(by_deck_text[deck])
        pool = text_vecs[[text_index[t] for t in pool_texts]]
        for i, atom in enumerate(atoms):
            if atom["deck"] != deck:
                continue
            scores = pool @ atom_vecs[i]
            best[atom["atom"]] = round(float(scores.max()), 3)
            picked = []
            for j in np.argsort(-scores):
                score = round(float(scores[j]), 3)
                if score < limits["threshold"]:
                    break
                for row, count in collapse(by_deck_text[deck][pool_texts[j]]):
                    if not A.accepts(score, row["level"], limits):
                        dropped["below-school-threshold"] += 1
                        continue
                    if not A.in_band(rules[deck], row["level"]):
                        dropped["outside-level-band"] += 1
                        continue
                    match, rule = A.relation(atom["title"], row["label"], row["kind"])
                    if match not in A.ACCEPTED_MATCHES:
                        dropped["related-only"] += 1
                        continue
                    lexical_ok, lexical = A.lexical_check(atom["title"], atom["statement"], row["label"], row["kind"])
                    if match != "exact" and not lexical_ok:
                        dropped["lexical:" + lexical] += 1
                        continue
                    picked.append({"atom": atom, "row": row, "score": score, "rows_collapsed": count,
                                   "match": match, "rule": rule, "lexical": lexical})
            picked.sort(key=lambda c: (-c["score"], c["row"]["id"]))
            out.extend(picked[:PER_ATOM])
    return out, best, dict(sorted(dropped.items()))


def mark_prerequisites(cands, forward):
    by_atom = collections.defaultdict(list)
    for cand in cands:
        by_atom[cand["atom"]["atom"]].append(cand)
    for group in by_atom.values():
        for cand in group:
            if cand["match"] == "exact":
                continue
            after = forward.get(cand["row"]["id"], ())
            if any(other["row"]["id"] in after and other["score"] > cand["score"] for other in group):
                cand["match"], cand["rule"] = "prerequisite-of", "stated-edge-to-better-candidate"


def alignment_record(cand, model_name, incoming, date):
    atom, row = cand["atom"], cand["row"]
    prerequisites = sorted(incoming.get(row["id"], ()))
    return {
        "schema": A.SCHEMA,
        "id": f"align:{row['id']}~{atom['deck']}/{atom['slug']}",
        "progression_id": row["id"],
        "table": row["table"],
        "framework_id": row["framework_id"],
        "course_code": row["course_code"],
        "field": row["field"],
        "cip": row["cip"],
        "level": row["level"],
        "atom": atom["atom"],
        "match": cand["match"],
        "score": cand["score"],
        "method": f"embedding:{model_name}+rule:{cand['rule']}+lexical:{cand['lexical']}",
        "rows_collapsed": cand["rows_collapsed"],
        "prerequisites": prerequisites,
        "prerequisite_source": "stated" if prerequisites else None,
        "source_url": row["source_url"],
        "status": A.STATUS,
        "verified": False,
        "verification": {"status": "asserted", "by": "agent", "at": date},
        "note": "",
    }


def unmatched_record(atom, best, model_name, date):
    return {
        "schema": A.SCHEMA,
        "id": f"align:none~{atom['deck']}/{atom['slug']}",
        "progression_id": None, "table": None, "framework_id": None, "course_code": None, "field": None,
        "cip": None, "level": None,
        "atom": atom["atom"],
        "match": "none",
        "score": best,
        "method": f"embedding:{model_name}+rule:below-threshold",
        "rows_collapsed": 0, "prerequisites": [], "prerequisite_source": None, "source_url": None,
        "status": A.STATUS,
        "verified": False,
        "verification": {"status": "asserted", "by": "agent", "at": date},
        "note": "",
    }


def resource_rows(rules, registry):
    seen, rows = set(), []
    for row in A.read_jsonl(os.path.join(A.CORPUS, "resources.jsonl.zst")):
        cip = (row.get("cip") or {}).get("code")
        url = row.get("url")
        if not cip or not url or url in seen or not (row.get("title") or "").strip():
            continue
        if not A.licence_linkable(row.get("licence"), registry.get(A.host_of(url))):
            continue
        if row.get("level") not in A.LEVEL_RANK:
            continue
        decks = [deck for deck, rule in rules.items() if A.in_field(rule, cip, None)]
        if decks:
            seen.add(url)
            rows.append({"row": row, "cip": cip, "decks": decks})
    return rows


def atom_resources(atoms, accepted, resources, rules, model_name, threshold):
    families = collections.defaultdict(set)
    for record in accepted:
        if record["match"] in A.LEVEL_MATCHES and record["cip"]:
            families[record["atom"]].add(A.cip_family(record["cip"]))
    titles = [r["row"]["title"] for r in resources]
    res_vecs = embed(titles, model_name)
    atom_vecs = embed([A.atom_text(a) for a in atoms], model_name)
    out = []
    for i, atom in enumerate(atoms):
        fams = families.get(atom["atom"])
        if not fams:
            continue
        idx = [
            j for j, r in enumerate(resources)
            if any(A.cip_family(r["cip"]).startswith(f) or f.startswith(A.cip_family(r["cip"])) for f in fams)
            and A.in_band(rules[atom["deck"]], r["row"]["level"])
            and A.lexical_check(atom["title"], atom["statement"], r["row"]["title"], "course")[0]
        ]
        if not idx:
            continue
        scores = res_vecs[idx] @ atom_vecs[i]
        ranked = sorted(zip((round(float(s), 3) for s in scores), idx), key=lambda p: (-p[0], resources[p[1]]["row"]["id"]))
        for score, j in ranked[:PER_ATOM_RESOURCES]:
            if score < threshold:
                break
            row = resources[j]["row"]
            out.append({
                "atom": atom["atom"], "resource_id": row["id"], "url": row["url"], "licence": row["licence"],
                "licence_verified": "unverified" not in row["licence"].lower() and bool(row.get("verified")),
                "kind": row.get("kind"), "level": row.get("level"), "cip": resources[j]["cip"],
                "score": score, "method": f"embedding:{model_name}+rule:cip-of-matched-rows+licence-open+lexical:label-terms-in-statement",
                "status": A.STATUS, "verified": False,
            })
    return out


def draw_blind(cands, per_deck, seed):
    rng = random.Random(seed)
    by_deck = collections.defaultdict(list)
    for cand in cands:
        by_deck[cand["atom"]["deck"]].append(cand)
    picked = []
    for deck in sorted(by_deck):
        pile = sorted(by_deck[deck], key=lambda c: (c["atom"]["atom"], c["row"]["id"]))
        rng.shuffle(pile)
        picked.extend(pile[:per_deck])
    rng.shuffle(picked)
    return picked


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default="2026-10-12")
    parser.add_argument("--sample", type=int, default=0)
    parser.add_argument("--seed", type=int, default=20261012)
    parser.add_argument("--discard-review", action="store_true")
    args = parser.parse_args()
    target = os.path.join(A.OUT, "alignments.jsonl")
    if os.path.exists(target) and not args.discard_review:
        if any(r["verification"]["status"] == "verified" for r in A.load_alignments(target)):
            sys.exit("alignments.jsonl holds verified rows; pass --discard-review to overwrite them")
    limits = A.thresholds()
    threshold = limits["threshold"]
    model_name = repo_model_name()
    rules = A.deck_fields()
    atoms = A.load_atoms()
    rows = corpus_rows(rules)
    accepted, best, dropped = candidates(atoms, rows, rules, model_name, limits)
    os.makedirs(CACHE, exist_ok=True)
    if args.sample:
        A.write_jsonl(os.path.join(CACHE, "blind.jsonl"), (
            {"n": n + 1, "atom": c["atom"]["atom"], "progression_id": c["row"]["id"], "table": c["row"]["table"],
             "kind": c["row"]["kind"], "row_level": c["row"]["level"], "score": c["score"], "match": c["match"],
             "atom_title": c["atom"]["title"], "summary": c["atom"]["summary"], "row_text": c["row"]["text"]}
            for n, c in enumerate(draw_blind(accepted, args.sample, args.seed))
        ))
    forward = A.stated_edges()
    incoming = collections.defaultdict(set)
    for src, dsts in forward.items():
        for dst in dsts:
            incoming[dst].add(src)
    mark_prerequisites(accepted, forward)
    records = [alignment_record(c, model_name, incoming, args.date) for c in accepted]
    matched = {r["atom"] for r in records}
    for atom in atoms:
        if atom["atom"] not in matched:
            records.append(unmatched_record(atom, best.get(atom["atom"]) or None, model_name, args.date))
    order = {a["atom"]: i for i, a in enumerate(atoms)}
    records.sort(key=lambda r: (order[r["atom"]], -(r["score"] or 0), r["id"]))
    os.makedirs(A.OUT, exist_ok=True)
    A.write_jsonl(os.path.join(A.OUT, "alignments.jsonl"), records)
    resources = resource_rows(rules, A.registry_by_host())
    A.write_jsonl(os.path.join(A.OUT, "atom_resources.jsonl"), atom_resources(atoms, records, resources, rules, model_name, threshold))
    print(json.dumps({
        "model": model_name, "limits": limits, "atoms": len(atoms), "corpus_rows_in_field": len(rows),
        "alignments": len(accepted), "atoms_matched": len(matched), "dropped": dropped,
        "resources_in_field": len(resources),
    }))


if __name__ == "__main__":
    main()
