import os, re, shutil
from r2 import ROUND2, PUBLIC

SKIP = {"src", "FOUNDER-FEEDBACK.md"}


def rewrite(t, base):
    t = t.replace("../_directions/", "../directions/").replace("../../_directions/", "../../directions/")
    return re.sub(r"<head>", f'<head><base href="{base}">', t, count=1)


def main():
    if os.path.isdir(PUBLIC):
        shutil.rmtree(PUBLIC)
    n = 0
    for root, dirs, files in os.walk(ROUND2):
        rel = os.path.relpath(root, ROUND2)
        if rel.split(os.sep)[0] in SKIP or rel.split(os.sep)[0] == "screens" and "thumbs" in rel:
            dirs[:] = []
            continue
        dirs[:] = [d for d in dirs if d not in SKIP]
        out = os.path.join(PUBLIC, rel)
        os.makedirs(out, exist_ok=True)
        for f in files:
            if f in SKIP:
                continue
            s, d = os.path.join(root, f), os.path.join(out, f)
            if f.endswith(".html"):
                base = "/brand/round2/" + ("" if rel == "." else rel.replace(os.sep, "/") + "/")
                open(d, "w", encoding="utf-8").write(rewrite(open(s, encoding="utf-8").read(), base))
            else:
                shutil.copy2(s, d)
            n += 1
    print("synced", n, "files to", os.path.relpath(PUBLIC, os.path.dirname(os.path.dirname(ROUND2))))


if __name__ == "__main__":
    main()
