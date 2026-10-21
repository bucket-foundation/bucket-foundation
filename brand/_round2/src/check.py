import os, re, sys, glob, threading, functools, subprocess, urllib.request, urllib.parse, urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from r2 import ROUND2, BRAND, REPO, aa_rows

THUMBS = "--thumbs" in sys.argv


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class Server(ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        pass


def pages():
    return sorted(f for f in glob.glob(f"{ROUND2}/**/*.html", recursive=True) if os.sep + "src" + os.sep not in f)


def aa():
    bad = 0
    for n, f, b, r, need in aa_rows():
        ok = r >= need
        bad += not ok
        print(f"AA    {'PASS' if ok else 'FAIL'} {r:5.2f}:1 need {need} {n} {f} on {b}")
    return bad


def hygiene():
    bad = 0
    for f in pages():
        t = open(f, encoding="utf-8").read()
        for u in re.findall(r'(?:src|href)="([^"]+)"', t):
            if u.startswith("/") and not u.startswith("//") or u.startswith("file:") or "/home/" in u:
                bad += 1
                print(f"HYG   {os.path.relpath(f, REPO)} {u}")
    r = subprocess.run([sys.executable, os.path.join(REPO, "tools/hygiene/check-local-paths.py"), "--all"], cwd=REPO, capture_output=True, text=True)
    print("HYG   local-paths", "PASS" if r.returncode == 0 else "FAIL\n" + r.stdout[-2000:])
    return bad + (r.returncode != 0)


def serve():
    srv = Server(("127.0.0.1", 0), functools.partial(Quiet, directory=BRAND))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/"


def assets(base):
    refs = set()
    for f in pages():
        rel = os.path.relpath(os.path.dirname(f), BRAND)
        for u in re.findall(r'(?:src|href|poster)="([^"#?]+)', open(f, encoding="utf-8").read()):
            if re.match(r"^(https?:|data:|mailto:|javascript:|//)", u):
                continue
            refs.add(os.path.normpath(os.path.join(rel, urllib.parse.unquote(u))))
        for u in re.findall(r"url\(([^)\"'#]+)\)", open(f, encoding="utf-8").read()):
            refs.add(os.path.normpath(os.path.join(rel, u)))
    fail = 0
    for r in sorted(refs):
        try:
            with urllib.request.urlopen(base + urllib.parse.quote(r), timeout=10) as resp:
                code = resp.status
        except urllib.error.HTTPError as e:
            code = e.code
        if code != 200:
            fail += 1
            print(f"ASSET {code} {r}")
    print(f"ASSET {len(refs)} refs, {fail} missing")
    return fail


def views(base):
    from playwright.sync_api import sync_playwright
    bad = 0
    tdir = os.path.join(ROUND2, "thumbs")
    if THUMBS:
        os.makedirs(tdir, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        for w, h in ((1440, 900), (390, 844)):
            pg = b.new_page(viewport={"width": w, "height": h})
            targets = []
            pg.goto(base + "_round2/index.html", wait_until="networkidle")
            for sid in pg.eval_on_selector_all(".slide", "s=>s.map(x=>x.id)"):
                targets.append(("_round2/index.html#" + sid, "deck-" + sid))
            for f in pages():
                rel = os.path.relpath(f, BRAND)
                if rel != "_round2/index.html":
                    targets.append((rel, os.path.basename(f)[:-5]))
            for url, name in targets:
                pg.goto(base + url, wait_until="networkidle")
                if "#" in url:
                    pg.evaluate("()=>dispatchEvent(new HashChangeEvent('hashchange'))")
                    pg.wait_for_timeout(300)
                sw = pg.evaluate("()=>Math.max(document.documentElement.scrollWidth,...[...document.querySelectorAll('.slide.on')].map(s=>s.scrollWidth))")
                if sw > w:
                    bad += 1
                    print(f"VIEW  FAIL {w} {url} scrollWidth {sw}")
                if THUMBS:
                    pg.screenshot(path=os.path.join(tdir, f"{name}-{w}.jpg"), type="jpeg", quality=60, full_page="#" not in url)
            pg.close()
        b.close()
    print(f"VIEW  {bad} horizontal overflow at 1440 or 390")
    return bad


if __name__ == "__main__":
    srv, base = serve()
    n = aa() + hygiene() + assets(base) + views(base)
    srv.server_close()
    sys.exit(1 if n else 0)
