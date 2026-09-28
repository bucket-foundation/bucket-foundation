import json
import os
import re
import subprocess
import urllib.request
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

USER_AGENT = "bucket-profile-builder/0.1 (+https://bucket.foundation)"
TEXT_NAMES = ("README.md", "README", "CLAUDE.md", "AGENTS.md", "readme.md")
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", ".lake", ".next", "dist", "build", ".wt", "worktrees"}

@dataclass
class Item:
    source: str
    url: str
    title: str
    text: str
    meta: dict = field(default_factory=dict)

def fetch_json(url: str, token: str | None = None) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

class _TextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.links: list[str] = []
        self._skip = 0
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self._skip += 1
        if tag == "title":
            self._in_title = True
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript") and self._skip:
            self._skip -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self._skip and data.strip():
            self.parts.append(data.strip())

def parse_html(html: str) -> tuple[str, str, list[str]]:
    p = _TextParser()
    p.feed(html)
    return p.title.strip(), " ".join(p.parts), p.links

def gh_token() -> str | None:
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        return tok
    try:
        return subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=10).stdout.strip() or None
    except (OSError, subprocess.TimeoutExpired):
        return None

def github(login: str, max_items: int, token: str | None = None, fetch=fetch_json) -> list[Item]:
    base = "https://api.github.com"
    user = fetch(f"{base}/users/{login}", token)
    repos = fetch(f"{base}/users/{login}/repos?per_page=100&sort=pushed", token)
    items = [Item("github", user.get("html_url", ""), f"GitHub {login}", user.get("bio") or "", {"kind": "account", "public_repos": user.get("public_repos"), "created": user.get("created_at")})]
    for repo in [r for r in repos if not r.get("fork")][:max_items]:
        readme = ""
        try:
            data = fetch(f"{base}/repos/{repo['full_name']}/readme", token)
            if isinstance(data, dict) and data.get("encoding") == "base64":
                import base64
                readme = base64.b64decode(data["content"]).decode("utf-8", "replace")
        except Exception as exc:
            readme = ""
            repo.setdefault("_errors", []).append(str(exc))
        items.append(Item("github", repo["html_url"], repo["name"],
                          " ".join(filter(None, [repo.get("description") or "", " ".join(repo.get("topics") or []), readme[:20000]])),
                          {"kind": "repo", "language": repo.get("language"), "stars": repo.get("stargazers_count"), "pushed": repo.get("pushed_at"), "errors": repo.get("_errors", [])}))
    return items

def openalex(orcid: str | None, name: str | None, max_items: int, fetch=fetch_json) -> list[Item]:
    base = "https://api.openalex.org"
    if orcid:
        authors = fetch(f"{base}/authors?filter=orcid:{orcid}", None).get("results", [])
    elif name:
        authors = fetch(f"{base}/authors?search={urllib.request.quote(name)}&per_page=1", None).get("results", [])
    else:
        return []
    if not authors:
        return []
    aid = authors[0]["id"].rsplit("/", 1)[-1]
    works = fetch(f"{base}/works?filter=author.id:{aid}&per_page={min(max_items, 200)}&select=id,title,publication_year,topics,doi", None).get("results", [])
    return [Item("openalex", w.get("doi") or w["id"], w.get("title") or "",
                 " ".join([w.get("title") or ""] + [t.get("display_name", "") for t in w.get("topics") or []]),
                 {"kind": "work", "year": w.get("publication_year")}) for w in works]

def websites(seeds: list[str], max_links: int, fetch_text=None, allowed=None, delay: float = 1.0, sleep=None) -> list[Item]:
    def default_fetch(url: str) -> str:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read(2_000_000).decode("utf-8", "replace")

    import time
    from urllib import robotparser
    from urllib.parse import urljoin, urlparse

    fetch_text = fetch_text or default_fetch
    sleep = sleep or time.sleep
    robots: dict = {}

    def default_allowed(url: str) -> bool:
        host = urlparse(url)
        key = f"{host.scheme}://{host.netloc}"
        if key not in robots:
            rp = robotparser.RobotFileParser(key + "/robots.txt")
            try:
                rp.read()
            except OSError:
                rp = None
            robots[key] = rp
        return robots[key] is None or robots[key].can_fetch(USER_AGENT, url)

    allowed = allowed or default_allowed
    queue, seen, items = list(seeds), set(), []
    hosts = {urlparse(s).netloc for s in seeds}
    while queue and len(items) < max_links:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        if not allowed(url):
            items.append(Item("web", url, "", "", {"kind": "page", "error": "disallowed by robots.txt"}))
            continue
        if len(seen) > 1:
            sleep(delay)
        try:
            title, text, links = parse_html(fetch_text(url))
        except Exception as exc:
            items.append(Item("web", url, "", "", {"kind": "page", "error": str(exc)}))
            continue
        items.append(Item("web", url, title, text[:20000], {"kind": "page"}))
        for href in links:
            nxt = urljoin(url, href).split("#")[0]
            if urlparse(nxt).netloc in hosts and nxt not in seen:
                queue.append(nxt)
    return items

def local(roots: list[str], max_items: int) -> list[Item]:
    items: list[Item] = []
    for root in roots:
        root_path = Path(root).expanduser()
        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".wt")]
            depth = len(Path(dirpath).relative_to(root_path).parts)
            if depth > 2:
                dirnames[:] = []
            for name in filenames:
                if name in TEXT_NAMES:
                    p = Path(dirpath) / name
                    try:
                        text = p.read_text("utf-8", "replace")[:20000]
                    except OSError as exc:
                        items.append(Item("local", str(p), Path(dirpath).name, "", {"kind": "project-doc", "error": str(exc)}))
                        continue
                    items.append(Item("local", str(p), Path(dirpath).name, text, {"kind": "project-doc"}))
                    if len(items) >= max_items:
                        return items
    return items
