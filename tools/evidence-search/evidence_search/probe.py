from __future__ import annotations

import os
import platform
import resource
import shutil
import time
from pathlib import Path

from .registry import model_entry, runtime_versions, snapshot_dir

GIB = 1024**3
RAM_RESERVE = 10 * GIB
DISK_RESERVE = 50 * GIB
WORKER_RAM_CAP = 8 * GIB

def meminfo() -> dict[str, int]:
    out: dict[str, int] = {}
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            name, value = line.split(":", 1)
            out[name] = int(value.split()[0]) * 1024
    except OSError:
        pass
    return out

def probe(model_id: str | None = None, sample: list[str] | None = None, disk_path: str = ".") -> dict:
    mid, entry = model_entry(model_id)
    snap = snapshot_dir(entry)
    mem = meminfo()
    disk = shutil.disk_usage(disk_path)
    rss_before = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024
    report: dict = {
        "python": platform.python_version(),
        "machine": platform.machine(),
        "cpus": os.cpu_count(),
        "memAvailableGiB": round(mem.get("MemAvailable", 0) / GIB, 1),
        "diskFreeGiB": round(disk.free / GIB, 1),
        "runtime": runtime_versions(["numpy", "sentence-transformers", "tokenizers", "torch", "transformers"]),
        "model": {"id": mid, "revision": entry["revision"], "filesMiB": round(sum(p.stat().st_size for p in snap.rglob("*") if p.is_file()) / 2**20, 1) if snap.is_dir() else None},
    }
    import torch

    report["gpu"] = {"visible": bool(torch.cuda.is_available()), "devices": torch.cuda.device_count() if torch.cuda.is_available() else 0}

    from .encoder import Encoder

    t0 = time.time()
    enc = Encoder(mid, device="cpu")
    report["loadSeconds"] = round(time.time() - t0, 2)
    texts = sample or [f"Sample passage {i} about light scattering by small particles in the atmosphere." for i in range(64)]
    timings = []
    for batch in (8, 16, 32):
        t0 = time.time()
        enc.encode(texts, batch_size=batch)
        secs = time.time() - t0
        timings.append({"batch": batch, "seconds": round(secs, 3), "textsPerSecond": round(len(texts) / secs, 1)})
    report["encode"] = timings
    report["batchSize"] = max(timings, key=lambda t: t["textsPerSecond"])["batch"]
    t0 = time.time()
    for _ in range(20):
        enc.encode_query("why does the daytime sky look blue")
    report["queryMs"] = round((time.time() - t0) / 20 * 1000, 1)
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024
    report["peakRssGiB"] = round(peak / GIB, 2)
    report["peakRssDeltaGiB"] = round((peak - rss_before) / GIB, 2)
    report["checks"] = {
        "ramReserve": mem.get("MemAvailable", 0) >= RAM_RESERVE,
        "diskReserve": disk.free >= DISK_RESERVE,
        "workerRamCap": peak <= WORKER_RAM_CAP,
    }
    report["ok"] = all(report["checks"].values())
    return report
