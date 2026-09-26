#!/usr/bin/env python3
import argparse
import collections
import concurrent.futures
import hashlib
import ipaddress
import json
import pathlib
import re
import socket
import sqlite3
import subprocess
import threading
import time
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from protego import Protego

VERSION = "raw-html-v1"
AGENT = "BucketResearchArchive/1.0"
MAX_BYTES = 12 * 1024 * 1024
MAX_TOTAL = 4 * 1024 * 1024 * 1024
MAX_URLS = 30000
ASSET = re.compile(r"\.(?:png|jpg|jpeg|webp|gif|svg|css|js|woff2?|mp3|mp4|zip|ico|wav)$", re.I)


def stamp():
    return datetime.now(timezone.utc).isoformat()


def digest(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode()).hexdigest()


def canonical(url):
    p = urllib.parse.urlsplit(url.strip())
    if p.scheme not in ("http", "https") or not p.hostname or p.username or p.password:
        raise ValueError("unsupported URL")
    if p.port not in (None, 80, 443):
        raise ValueError("unsupported port")
    host = p.hostname.lower().encode("idna").decode()
    netloc = host + (f":{p.port}" if p.port and p.port != (443 if p.scheme == "https" else 80) else "")
    query = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True) if not k.lower().startswith("utm_") and k.lower() not in {"fbclid", "gclid"}]
    return urllib.parse.urlunsplit((p.scheme, netloc, p.path or "/", urllib.parse.urlencode(query), ""))


def hostof(url):
    return urllib.parse.urlsplit(url).hostname


def public_host(host):
    addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError("nonpublic address")


def extract(raw, url, content_type):
    if "pdf" in content_type or raw.startswith(b"%PDF"):
        cp = subprocess.run(["pdftotext", "-", "-"], input=raw, capture_output=True, timeout=40)
        if cp.returncode:
            raise ValueError("PDF text extraction failed")
        return {"title": urllib.parse.unquote(urllib.parse.urlsplit(url).path.rsplit("/", 1)[-1]), "text": cp.stdout.decode("utf-8"), "transcript": "", "links": [], "selector": "pdftotext", "license_links": []}
    s = BeautifulSoup(raw, "html.parser")
    canonical_link = s.select_one('link[rel="canonical"][href]')
    publisher_url = None
    if canonical_link:
        try:
            publisher_url = canonical(urllib.parse.urljoin(url, canonical_link["href"]))
        except (ValueError, UnicodeError):
            pass
    og_title = s.select_one('meta[property="og:title"][content]')
    title = s.find("h1") or s.find("title")
    title = og_title["content"] if og_title else title.get_text(" ", strip=True) if title else url
    transcript = s.select_one(".wrap-podcast-transcript")
    transcript_text = transcript.get_text("\n", strip=True) if transcript else ""
    selected = None
    selector = "body"
    for candidate in (".post-content", ".entry-content", ".body-content", ".PostsPage-postContent", "main", "article", "body"):
        matches = s.select(candidate)
        if matches:
            largest = max(matches, key=lambda x: len(x.get_text()))
            if len(largest.get_text()) > 150:
                selected, selector = largest, candidate
                break
    selected = selected or s
    links = []
    for a in selected.select("a[href]"):
        try:
            target = canonical(urllib.parse.urljoin(url, a["href"]))
            links.append({"url": target, "anchor": a.get_text(" ", strip=True)[:240], "relation": "html_link"})
        except (ValueError, UnicodeError):
            pass
    licenses = [a.get("href") for a in s.select("a[href]") if "creativecommons.org/licenses/" in a.get("href", "")]
    for el in selected.select("script,style,noscript,nav,footer,header,form,button"):
        el.decompose()
    text = selected.get_text("\n", strip=True)
    return {"title": title, "text": text, "transcript": transcript_text, "links": links, "selector": selector, "license_links": sorted(set(licenses)), "publisher_canonical_url": publisher_url}


class Collector:
    def __init__(self, root, config):
        self.root = pathlib.Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.config = config
        self.hosts = {h: x for x in config["collections"] for h in x["hosts"]}
        self.lock = threading.RLock()
        self.netlock = threading.Lock()
        self.next_request = {}
        self.robots = {}
        self.bytes = 0
        self.db = sqlite3.connect(self.root / "corpus.sqlite", check_same_thread=False)
        self.db.execute("pragma journal_mode=wal")
        self.db.executescript("create table if not exists sources(url text primary key, collection text, state text, metadata text); create table if not exists events(time text,url text,state text,detail text); create virtual table if not exists texts using fts5(url UNINDEXED,title,body,transcript);")
        self.db.commit()

    def event(self, url, state, detail):
        with self.lock:
            self.db.execute("insert into events values (?,?,?,?)", (stamp(), url, state, json.dumps(detail)))
            self.db.commit()

    def discover(self, url, origin="seed"):
        try:
            url = canonical(url)
        except (ValueError, UnicodeError):
            return
        c = self.hosts.get(hostof(url))
        if not c:
            return
        p = urllib.parse.urlsplit(url)
        excluded = bool(ASSET.search(p.path)) or any(x in p.path for x in ("/wp-json/", "/wp-admin/", "/cdn-cgi/")) or any(k in {"replytocom", "share", "print"} for k, _ in urllib.parse.parse_qsl(p.query))
        if c.get("include_patterns") and not any(re.search(x, p.path) for x in c["include_patterns"]):
            excluded = True
        with self.lock:
            if self.db.execute("select count(*) from sources").fetchone()[0] >= MAX_URLS:
                return
            self.db.execute("insert or ignore into sources values (?,?,?,?)", (url, c["name"], "excluded" if excluded else "pending", json.dumps({"discovered_from": origin, "reason": "scope_or_asset" if excluded else None})))
            self.db.commit()

    def pace(self, host, delay):
        with self.netlock:
            now = time.monotonic()
            slot = max(now, self.next_request.get(host, now))
            self.next_request[host] = slot + max(0.5, delay)
        time.sleep(max(0, slot - time.monotonic()))

    def request(self, url, robots=False):
        original = url
        for hop in range(6):
            url = canonical(url)
            host = hostof(url)
            if host not in self.hosts:
                raise ValueError("redirect outside declared hosts")
            public_host(host)
            rp = self.robots.get(host)
            if not robots and (rp is None or not rp.can_fetch(url, AGENT)):
                raise PermissionError("robots unavailable or disallowed")
            self.pace(host, rp.crawl_delay(AGENT) or rp.crawl_delay("*") or 0.5 if rp else 0.5)
            with requests.get(url, headers={"User-Agent": AGENT}, timeout=(10, 45), allow_redirects=False, stream=True) as r:
                if r.is_redirect:
                    url = urllib.parse.urljoin(url, r.headers["Location"])
                    continue
                r.raise_for_status()
                data = bytearray()
                started = time.monotonic()
                for chunk in r.iter_content(65536):
                    data.extend(chunk)
                    if len(data) > MAX_BYTES or time.monotonic() - started > 45:
                        raise ValueError("response exceeds byte or time limit")
                with self.lock:
                    if self.bytes + len(data) > MAX_TOTAL:
                        raise ValueError("run byte budget reached")
                    self.bytes += len(data)
                return bytes(data), url, r.headers.get("Content-Type", ""), {k: r.headers[k] for k in ("ETag", "Last-Modified") if k in r.headers}
        raise ValueError("redirect limit: " + original)

    def setup_robots(self):
        for host in sorted(self.hosts):
            url = "https://" + host + "/robots.txt"
            try:
                raw, _, _, _ = self.request(url, robots=True)
                rp = Protego.parse(raw.decode("utf-8", errors="replace"))
                path = self.root / "discovery" / (host + "-robots.txt")
                path.parent.mkdir(exist_ok=True)
                path.write_bytes(raw)
                self.robots[host] = rp
            except requests.HTTPError as e:
                if e.response.status_code in (404, 410):
                    self.robots[host] = Protego.parse("User-agent: *\nDisallow:\n")
                else:
                    self.event(url, "robots_failed", str(e))
            except Exception as e:
                self.event(url, "robots_failed", str(e))

    def inventory(self):
        self.setup_robots()
        for c in self.config["collections"]:
            for url in c["seeds"]:
                self.discover(url)
        maps = {u for c in self.config["collections"] for u in c.get("sitemaps", [])}
        for host, rp in self.robots.items():
            if self.hosts[host].get("sitemap_discovery", True):
                maps.update(rp.sitemaps)
        seen = set()
        while maps and len(seen) < 150:
            url = sorted(maps)[0]
            maps.remove(url)
            if url in seen:
                continue
            seen.add(url)
            try:
                raw, final, _, _ = self.request(url)
                path = self.root / "discovery" / (digest(url) + ".xml")
                path.write_bytes(raw)
                tree = ET.fromstring(raw)
                locs = [e.text.strip() for e in tree.iter() if e.tag.rsplit("}", 1)[-1] == "loc" and e.text]
                if tree.tag.rsplit("}", 1)[-1] == "sitemapindex":
                    maps.update(x for x in locs if hostof(x) in self.hosts)
                else:
                    for loc in locs:
                        self.discover(loc, url)
                self.event(url, "inventory_fetched", {"locations": len(locs), "sha256": digest(raw), "final_url": final})
            except Exception as e:
                self.event(url, "inventory_failed", str(e))
            print(json.dumps({"inventory": url, "discovered": self.db.execute("select count(*) from sources").fetchone()[0]}), flush=True)

    def fetch(self, url):
        error = None
        for attempt in range(3):
            try:
                raw, final, kind, headers = self.request(url)
                if not any(t in kind for t in ("html", "pdf", "text/plain")):
                    raise ValueError("unsupported content type: " + kind)
                sid, revision = digest(url), digest(raw)
                relative = pathlib.Path("raw") / sid / revision
                folder = self.root / relative
                folder.mkdir(parents=True, exist_ok=True)
                (folder / "response.bin").write_bytes(raw)
                parsed = extract(raw, final, kind)
                if any(x in parsed["title"].lower() for x in ("just a moment", "access denied", "verify you are human", "attention required", "bot verification")):
                    raise ValueError("challenge page; raw response retained at " + str(relative))
                if len(parsed["text"].strip()) < 150:
                    raise ValueError("empty or thin source body; raw response retained at " + str(relative))
                (folder / "text.txt").write_text(parsed.pop("text"), encoding="utf-8")
                transcript = parsed.pop("transcript")
                if transcript:
                    (folder / "transcript.txt").write_text(transcript, encoding="utf-8")
                text = (folder / "text.txt").read_text(encoding="utf-8")
                meta = dict(parsed, url=url, final_url=final, fetched_at=stamp(), source_id=sid, revision_sha256=revision, text_sha256=digest(text), bytes=len(raw), text_characters=len(text), transcript_characters=len(transcript), content_type=kind, headers=headers, extraction_version=VERSION, offset_unit="unicode_codepoint_end_exclusive", raw_path=str(relative), rights_status="unreviewed_local_only", attempts=attempt+1)
                (folder / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
                with self.lock:
                    changed = self.db.execute("update sources set state='fetched',metadata=? where url=? and state <> 'withdrawn'", (json.dumps(meta, ensure_ascii=False), url))
                    if not changed.rowcount:
                        self.db.commit()
                        return
                    self.db.execute("delete from texts where url=?", (url,))
                    self.db.execute("insert into texts values (?,?,?,?)", (url, meta["title"], text, transcript))
                    self.db.commit()
                self.event(url, "fetched", {"revision_sha256": revision})
                c = self.hosts[hostof(url)]
                for link in meta["links"]:
                    target_collection = self.hosts.get(hostof(link["url"]))
                    if target_collection and (target_collection["name"] == c["name"] or c["name"] == "80000hours"):
                        self.discover(link["url"], url)
                return
            except Exception as e:
                error = str(e)
                if isinstance(e, (PermissionError, ValueError)) or isinstance(e, requests.HTTPError) and e.response.status_code in (400, 401, 403, 404, 410):
                    break
                time.sleep(attempt + 1)
        state = "failed"
        if error and "robots" in error:
            state = "blocked"
        with self.lock:
            self.db.execute("update sources set state=?,metadata=? where url=? and state <> 'withdrawn'", (state, json.dumps({"error": error, "attempts": attempt+1, "attempted_at": stamp()}), url))
            self.db.commit()
        self.event(url, state, error)

    def crawl(self, limit, selected_collections):
        if not self.robots:
            self.setup_robots()
        done = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            while done < limit:
                with self.lock:
                    rows = self.db.execute("select url,collection from sources where state='pending' order by case when json_extract(metadata,'$.discovered_from')='seed' then 0 when json_extract(metadata,'$.discovered_from') like '%sitemap%' then 1 when url like '%/podcast/episodes/%' or url like '%/after-hours-podcast/episodes/%' then 2 else 3 end,url").fetchall()
                if selected_collections:
                    rows = [x for x in rows if x[1] in selected_collections]
                if not rows:
                    break
                grouped = {}
                for row in rows:
                    grouped.setdefault(row[1], collections.deque()).append(row)
                batch = []
                while grouped and len(batch) < min(40, limit-done):
                    for name in list(grouped):
                        if len(batch) >= min(40, limit-done):
                            break
                        batch.append(grouped[name].popleft())
                        if not grouped[name]:
                            del grouped[name]
                list(pool.map(self.fetch, [x[0] for x in batch]))
                done += len(batch)
                print(json.dumps({"processed": done, "counts": self.counts()}), flush=True)

    def counts(self):
        with self.lock:
            rows = self.db.execute("select collection,state,count(*) from sources group by collection,state").fetchall()
        result = {}
        for collection, state, n in rows:
            result.setdefault(collection, {})[state] = n
        return result

    def build(self, out):
        out = pathlib.Path(out)
        out.mkdir(parents=True, exist_ok=True)
        rows = self.db.execute("select url,collection,state,metadata from sources order by url").fetchall()
        nodes, edges, manifest, known = [], [], [], {}
        for url, collection, state, data in rows:
            meta = json.loads(data)
            manifest.append({"url": url, "collection": collection, "state": state, "source_id": digest(url), **{k: meta[k] for k in ("revision_sha256", "text_sha256", "bytes", "text_characters", "transcript_characters", "fetched_at", "error", "final_url", "extraction_version", "selector") if k in meta}})
            if state in ("withdrawn", "excluded"):
                continue
            slug = "raw-" + digest(url)
            known[url] = slug
            p = {k: v for k, v in meta.items() if k not in {"links", "license_links", "raw_path"}}
            p.update(type="raw_source", url=url, collection=collection, fetch_state=state, local_full_text=state == "fetched", rights_status="unreviewed_local_only")
            title = meta.get("title", url)
            nodes.append(dict(slug=slug, title=title[:500], kind="primary_source", tier=90, branch="10-literature", summary=None, labels={"en": {"title": title[:500]}}, provenance=p))
        seen = set()
        for url, _, state, data in rows:
            if state != "fetched" or url not in known:
                continue
            for link in json.loads(data).get("links", []):
                target = link["url"]
                if target not in known or target == url or (url, target) in seen:
                    continue
                seen.add((url, target))
                edges.append(dict(fromSlug=known[url], toSlug=known[target], kind="bridges", confidence=1.0, confidenceSource=None, provenance={"method": "observed_html_link", "relation": "html_link", "source_url": url, "target_url": target, "anchor": link["anchor"], "does_not_assert_citation_or_prerequisite": True}))
        stats = {"nodes": len(nodes), "edges": len(edges), "fetched": sum(x[2] == "fetched" for x in rows)}
        slugs = {n["slug"] for n in nodes}
        if len(slugs) != len(nodes) or any(e["fromSlug"] not in slugs or e["toSlug"] not in slugs for e in edges):
            raise ValueError("graph identity or endpoint validation failed")
        payload = {"nodes": nodes, "edges": sorted(edges, key=lambda x: (x["fromSlug"], x["toSlug"])), "reviewList": [], "stats": stats}
        (out / "graph-preview.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
        (out / "manifest.jsonl").write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in manifest))
        counts = {}
        for _, collection, state, _ in rows:
            counts.setdefault(collection, {}).setdefault(state, 0)
            counts[collection][state] += 1
        coverage = {"collections": counts, "discovered_total": len(rows), "graph": stats, "raw_bytes": sum(x.get("bytes", 0) for x in manifest if x["state"] == "fetched"), "source_text_characters": sum(x.get("text_characters", 0) for x in manifest if x["state"] == "fetched"), "transcripts": sum(x.get("transcript_characters", 0) > 0 for x in manifest if x["state"] == "fetched"), "scope": self.config, "live_applied": False}
        (out / "coverage.json").write_text(json.dumps(coverage, indent=2))
        (out / "events.jsonl").write_text("".join(json.dumps(dict(zip(("time", "url", "state", "detail"), x))) + "\n" for x in self.db.execute("select * from events order by time,url")))
        print(json.dumps(coverage["graph"]), flush=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("action", choices=["inventory", "crawl", "build", "status", "search", "retry", "withdraw"])
    p.add_argument("--root", required=True)
    p.add_argument("--config", default=str(pathlib.Path(__file__).with_name("sources.json")))
    p.add_argument("--out")
    p.add_argument("--limit", type=int, default=3000)
    p.add_argument("--collection", action="append")
    p.add_argument("--query")
    p.add_argument("--url")
    a = p.parse_args()
    c = Collector(a.root, json.loads(pathlib.Path(a.config).read_text()))
    if a.action == "inventory":
        c.inventory()
    elif a.action == "crawl":
        c.crawl(a.limit, a.collection)
    elif a.action == "build":
        if not a.out:
            p.error("--out required")
        c.build(a.out)
    elif a.action == "status":
        print(json.dumps(c.counts(), indent=2))
    elif a.action == "search":
        for row in c.db.execute("select url,title,snippet(texts,2,'[',']','...',24) from texts where texts match ? order by rank limit 20", (a.query,)):
            print(json.dumps(row, ensure_ascii=False))
    elif a.action == "retry":
        if not a.url:
            p.error("--url required")
        c.db.execute("update sources set state='pending' where url=? and state in ('failed','blocked')", (canonical(a.url),))
        c.db.commit()
    elif a.action == "withdraw":
        if not a.url:
            p.error("--url required")
        url = canonical(a.url)
        c.db.execute("update sources set state='withdrawn' where url=?", (url,))
        c.db.execute("delete from texts where url=?", (url,))
        c.db.commit()
        c.event(url, "withdrawn", "Excluded from search and graph; retained raw bytes require owner retention decision")


if __name__ == "__main__":
    main()
