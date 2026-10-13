#!/usr/bin/env python3
import argparse, datetime, json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
WHATS_NEW = ROOT / "data" / "whats-new.json"
HISTORY = ROOT / "docs" / "foundation" / "HISTORY.md"
REPORTS = ROOT / "reports"
IMAGES = ROOT / "public" / "whats-new"
HISTORY_HEAD = "## Research additions"
CATEGORIES = {"production", "site-feature", "intake-research", "claim-added", "entry-promoted", "branch-opened", "site-refactor"}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]


def today():
    return datetime.date.today().isoformat()


def head_commit():
    try:
        return subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def add_image(src, name):
    IMAGES.mkdir(parents=True, exist_ok=True)
    out = IMAGES / f"{name}.webp"
    from PIL import Image
    Image.open(src).convert("RGB").save(out, "WEBP", quality=85)
    return f"/whats-new/{out.name}"


def whats_new(a, root=None):
    path = (root or ROOT) / "data" / "whats-new.json"
    doc = json.loads(path.read_text())
    if a.category not in CATEGORIES:
        sys.exit(f"category must be one of {sorted(CATEGORIES)}")
    eid = a.id or f"{a.category}-{slug(a.title)}"
    if any(e["id"] == eid for e in doc["entries"]):
        sys.exit(f"entry {eid} exists")
    e = {"id": eid, "date": a.date or today(), "category": a.category, "branch": a.branch, "title": a.title, "summary": a.summary, "commit": a.commit or head_commit()}
    if a.pr:
        e.update(pr=a.pr, url=f"https://github.com/bucket-foundation/bucket-foundation/pull/{a.pr}", status=a.status)
    if a.image:
        if not a.image_alt:
            sys.exit("--image needs --image-alt")
        e.update(plot_title=a.plot_title or a.title, image=add_image(a.image, slug(eid)), image_alt=a.image_alt)
    if a.discussion:
        e["discussion"] = a.discussion
    if a.link:
        e["links"] = [{"label": l.split("=", 1)[0], "href": l.split("=", 1)[1]} for l in a.link]
    doc["entries"].insert(0, e)
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    return eid


def history(a, root=None):
    path = (root or ROOT) / "docs" / "foundation" / "HISTORY.md"
    text = path.read_text()
    line = f"- **{a.date or today()}, {a.title}.** {a.summary}"
    if HISTORY_HEAD not in text:
        marker = "\n---\n\n## Recovery metadata"
        block = f"\n---\n\n{HISTORY_HEAD}\n\nDated additions since the 2026 revival, newest last.\n\n{line}\n"
        text = text.replace(marker, block + marker, 1) if marker in text else text.rstrip() + "\n" + block
    else:
        i = text.index(HISTORY_HEAD)
        j = text.find("\n---", i)
        j = len(text) if j < 0 else j
        text = text[:j].rstrip() + "\n" + line + "\n" + text[j:]
    path.write_text(text)
    return line


def report(a, root=None):
    d = (root or ROOT) / "reports"
    d.mkdir(exist_ok=True)
    out = d / f"{a.date or today()}-{slug(a.title)}.md"
    if out.exists():
        sys.exit(f"{out} exists")
    body = pathlib.Path(a.body).read_text() if a.body else ""
    out.write_text(f"# {a.title}\n\n{a.summary}\n\n{body}".rstrip() + "\n")
    return str(out.relative_to(root or ROOT))


def main(argv=None):
    p = argparse.ArgumentParser(prog="bucket-post")
    sub = p.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("whats-new")
    for f in ["title", "summary"]:
        w.add_argument(f"--{f}", required=True)
    w.add_argument("--category", default="production")
    for f in ["id", "date", "branch", "commit", "image", "image-alt", "plot-title", "discussion"]:
        w.add_argument(f"--{f}")
    w.add_argument("--pr", type=int)
    w.add_argument("--status", default="open")
    w.add_argument("--link", action="append", help="label=url")
    h = sub.add_parser("history")
    h.add_argument("--title", required=True)
    h.add_argument("--summary", required=True)
    h.add_argument("--date")
    r = sub.add_parser("report")
    r.add_argument("--title", required=True)
    r.add_argument("--summary", required=True)
    r.add_argument("--body")
    r.add_argument("--date")
    a = p.parse_args(argv)
    print({"whats-new": whats_new, "history": history, "report": report}[a.cmd](a))


if __name__ == "__main__":
    main()
