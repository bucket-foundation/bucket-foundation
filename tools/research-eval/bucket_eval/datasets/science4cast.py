from __future__ import annotations

import datetime
import urllib.request
import zipfile
from pathlib import Path
from typing import BinaryIO, Callable

from .common import BRONZE, GB, MANIFESTS, REPO, ChecksumError, digest, pin, read_manifest, require_free

RECORD = "7882892"
FILE = "Science4Cast_18datasets.zip"
URL = f"https://zenodo.org/records/{RECORD}/files/{FILE}?download=1"
SIZE = 1_558_652_824
MD5 = "9325a2d05df1834939ed7cdba9158afc"
LICENSE = "CC-BY-4.0"
PUBLISHED = "2023-05-01"
MANIFEST = MANIFESTS / "science4cast.json"
TRANSIENT_BYTES = 3 * GB

Opener = Callable[[str], BinaryIO]

def _open(url: str) -> BinaryIO:
    return urllib.request.urlopen(url, timeout=120)

def _relative(path: Path) -> str:
    try:
        return str(path.relative_to(REPO))
    except ValueError:
        return path.name

def pull(bronze: Path = BRONZE, manifest: Path = MANIFEST, opener: Opener = _open, size: int = SIZE, md5: str = MD5, min_free: int | None = None) -> dict:
    target_dir = bronze / "science4cast" / PUBLISHED
    require_free(target_dir, TRANSIENT_BYTES, need=min_free)
    target = target_dir / FILE
    if not (target.exists() and target.stat().st_size == size):
        partial = target.with_suffix(".part")
        with opener(URL) as src, partial.open("wb") as out:
            for block in iter(lambda: src.read(1 << 20), b""):
                out.write(block)
        partial.rename(target)
    got_size = target.stat().st_size
    got_md5 = digest(target, "md5")
    if got_size != size or got_md5 != md5:
        raise ChecksumError(f"{FILE}: {got_size} bytes md5 {got_md5}, expected {size} bytes md5 {md5}")
    sha = digest(target, "sha256")
    members = []
    extract = target_dir / "extracted"
    with zipfile.ZipFile(target) as z:
        for info in z.infolist():
            if info.is_dir():
                continue
            out = extract / info.filename
            if not (out.exists() and out.stat().st_size == info.file_size):
                z.extract(info, extract)
            members.append({"name": info.filename, "size": info.file_size, "sha256": digest(out, "sha256")})
    held = read_manifest(manifest) or {}
    doc = {
        "dataset": "science4cast",
        "source": f"https://zenodo.org/records/{RECORD}",
        "url": URL,
        "license": LICENSE,
        "published": PUBLISHED,
        "file": FILE,
        "size": got_size,
        "md5": got_md5,
        "sha256": sha,
        "members": members,
        "extracted_bytes": sum(m["size"] for m in members),
        "bronze": _relative(target_dir),
        "first_pulled": held.get("first_pulled") or datetime.date.today().isoformat(),
    }
    pin(manifest, doc, ("url", "license", "size", "md5", "sha256", "members"))
    return doc

def verify(bronze: Path = BRONZE, manifest: Path = MANIFEST) -> dict:
    held = read_manifest(manifest)
    if held is None:
        raise ChecksumError(f"{manifest} is not pinned yet")
    target = bronze / "science4cast" / held["published"] / held["file"]
    if not target.exists():
        raise FileNotFoundError(f"{target} is absent; run science4cast-pull or set RESEARCH_EVAL_DATA")
    got = {"size": target.stat().st_size, "md5": digest(target, "md5"), "sha256": digest(target, "sha256")}
    wrong = [k for k, v in got.items() if held[k] != v]
    extract = target.parent / "extracted"
    wrong += [m["name"] for m in held["members"] if not (extract / m["name"]).exists() or (extract / m["name"]).stat().st_size != m["size"]]
    if wrong:
        raise ChecksumError(f"{target}: {', '.join(wrong)} disagree with the pinned manifest")
    return {"path": str(target), **got, "members": len(held["members"])}
