from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

API = "https://api.ror.org/v2/organizations"
NAME_BASED = re.compile(r"autocomplete|name|search", re.IGNORECASE)

@dataclass(frozen=True)
class Org:
    id: str
    name: str
    country: str
    related: frozenset

def short_id(value: str | None) -> str:
    return (value or "").rstrip("/").rsplit("/", 1)[-1]

def parse(record: dict) -> Org:
    names = record.get("names") or []
    display = next((n["value"] for n in names if "ror_display" in (n.get("types") or [])), names[0]["value"] if names else "")
    locations = record.get("locations") or []
    country = ""
    if locations:
        country = (locations[0].get("geonames_details") or {}).get("country_code", "") or ""
    related = frozenset(short_id(r.get("id")) for r in record.get("relationships") or [])
    return Org(short_id(record.get("id")), display, country, related)

def http_get(url: str, timeout: float = 20.0) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "bucket-prime-directions/1 (advisor review)"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

class RorClient:
    def __init__(self, cache_path: Path, fetch=http_get, pause: float = 0.12, offline: bool = False) -> None:
        self.cache_path = Path(cache_path)
        self.fetch = fetch
        self.pause = pause
        self.offline = offline
        self.cache = json.loads(self.cache_path.read_text()) if self.cache_path.exists() else {"orgs": {}, "matches": {}}
        self.misses = 0

    def save(self) -> None:
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.cache_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.cache))
        tmp.replace(self.cache_path)

    def _get(self, url: str) -> dict | None:
        if self.offline:
            return None
        try:
            data = self.fetch(url)
        except Exception:
            self.misses += 1
            return None
        if self.pause:
            time.sleep(self.pause)
        return data

    def org(self, ror_id: str) -> Org | None:
        key = short_id(ror_id)
        if not key:
            return None
        if key not in self.cache["orgs"]:
            data = self._get(f"{API}/{key}")
            if data is None:
                return None
            self.cache["orgs"][key] = data
        return parse(self.cache["orgs"][key])

    def match(self, name: str) -> Org | None:
        key = (name or "").strip().lower()
        if not key:
            return None
        if key not in self.cache["matches"]:
            data = self._get(f"{API}?affiliation={urllib.parse.quote(name)}")
            if data is None:
                return None
            chosen = next((i for i in data.get("items") or [] if i.get("chosen")), None)
            self.cache["matches"][key] = chosen["organization"] if chosen else None
        record = self.cache["matches"][key]
        if record is None:
            return None
        org = parse(record)
        self.cache["orgs"].setdefault(org.id, record)
        return org

def check(meta: dict, client: RorClient) -> dict:
    listed = client.match(str(meta.get("institution") or ""))
    profile = client.org(str(meta.get("ror") or ""))
    out = {"country_listed": listed.country if listed else "", "listed_ror": listed.id if listed else ""}
    if listed and profile:
        same = listed.id == profile.id or profile.id in listed.related or listed.id in profile.related
        if same:
            out["identity"] = "match"
        elif NAME_BASED.search(str(meta.get("resolution") or "")):
            out["identity"] = "check"
        else:
            out["identity"] = "moved"
        out["profile_institution"] = profile.name
    else:
        out["identity"] = "unknown"
    return out

def validate(people, client: RorClient, save_every: int = 200) -> dict:
    counts: dict[str, int] = {}
    fixed = 0
    for n, person in enumerate(people, start=1):
        result = check(person.meta, client)
        if result["country_listed"] and result["country_listed"] != person.meta.get("country"):
            person.meta["country_profile"] = person.meta.get("country", "")
            person.meta["country"] = result["country_listed"]
            fixed += 1
        person.meta["identity"] = result["identity"]
        if result.get("profile_institution"):
            person.meta["profile_institution"] = result["profile_institution"]
        counts[result["identity"]] = counts.get(result["identity"], 0) + 1
        if n % save_every == 0:
            client.save()
    client.save()
    return {"identity": counts, "country_corrected": fixed, "lookup_failures": client.misses}
