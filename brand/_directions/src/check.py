import os, re, sys, glob, threading, functools, urllib.request, urllib.parse, urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from paths import BRAND_DIR, DIRECTIONS_DIR
from lib import D, pairs

REGENERABLE = [re.compile(p) for p in (r"^_directions/pages/[^/]+/thumbs/", r"^_directions/screens/thumbs/", r"^_directions/logos/px/", r"^_directions/3d/[^/]+\.png$", r"^_directions/video/", r"^_directions/mood/")]
STRICT = os.environ.get("STRICT") == "1"


def aa():
    bad = 0
    for d in D:
        try:
            print(f"AA    {d['id']} {len(pairs(d))} pairs PASS")
        except AssertionError as e:
            bad += 1
            print(f"AA    {d['id']} FAIL {e}")
    return bad


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def assets():
    srv = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=BRAND_DIR))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}/"
    refs = set()
    for f in glob.glob(f"{DIRECTIONS_DIR}/**/*.html", recursive=True):
        if os.sep + "src" + os.sep in f:
            continue
        rel_dir = os.path.relpath(os.path.dirname(f), BRAND_DIR)
        for u in re.findall(r'(?:src|href|poster)="([^"#?]+)', open(f, encoding="utf-8").read()):
            if re.match(r"^(https?:|data:|mailto:|javascript:|//)", u) or "{" in u:
                continue
            refs.add(os.path.normpath(os.path.join(rel_dir, urllib.parse.unquote(u))))
    fail = skipped = 0
    for r in sorted(refs):
        try:
            with urllib.request.urlopen(base + urllib.parse.quote(r), timeout=10) as resp:
                resp.read()
                code = resp.status
        except urllib.error.HTTPError as e:
            code = e.code
        if code == 200:
            continue
        if not STRICT and any(p.match(r) for p in REGENERABLE):
            skipped += 1
            continue
        fail += 1
        print(f"ASSET {code} {r}")
    srv.server_close()
    print(f"ASSET {len(refs)} refs, {fail} missing, {skipped} regenerable not built")
    return fail


if __name__ == "__main__":
    sys.exit(1 if aa() + assets() else 0)
