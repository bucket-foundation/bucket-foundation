from common import LANGS, VEC, candidates, eval_set


def main():
    cand = candidates()
    en = {}
    for lang in LANGS:
        ws = {}
        for d in cand.get(lang, []):
            if d["k"].startswith("="):
                en.setdefault(d["w"], None)
                for w in d["e"]:
                    ws.setdefault(w, None)
            else:
                ws.setdefault(d["w"], None)
                for e in d["e"]:
                    en.setdefault(e, None)
        ev = eval_set(lang)
        for row in ev.get("words", []) + ev.get("tail", []) + ev.get("aligned", []):
            ws.setdefault(row[0], None)
            for r in row[1]:
                if len(r.split()) <= 3:
                    en.setdefault(r, None)
        ws = [w for w in ws if w and "\n" not in w]
        (VEC / lang).mkdir(parents=True, exist_ok=True)
        (VEC / lang / "words.txt").write_text("\n".join(ws), encoding="utf-8")
        print(lang, len(ws))
    (VEC / "en").mkdir(parents=True, exist_ok=True)
    (VEC / "en" / "words.txt").write_text("\n".join(w for w in en if w and "\n" not in w), encoding="utf-8")
    print("en", len(en))


if __name__ == "__main__":
    main()
