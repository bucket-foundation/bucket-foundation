import json
import re
from datetime import date

import fetch

PAGES = {
    "silicondata_h100": "https://silicondata.com/products/silicon-index/h100",
    "sfcompute": "https://sfcompute.com/",
    "ornn": "https://ornn.com",
    "lambda_pricing": "https://lambda.ai/pricing",
    "runpod_pricing": "https://www.runpod.io/pricing",
}
VAST = "https://console.vast.ai/api/v0/bundles/"
VAST_KEEP = ["id", "gpu_name", "num_gpus", "gpu_ram", "dph_total", "dph_base", "min_bid", "reliability2", "geolocation",
             "cpu_cores", "cpu_ram", "disk_space", "inet_down", "inet_up", "dlperf", "total_flops", "rentable", "rented",
             "verification", "datacenter", "start_date", "end_date", "cuda_max_good", "compute_cap"]


def dollars_per_hour(html):
    return sorted(set(re.findall(r"\$\s?(\d+(?:\.\d{1,2}))\s*(?:/|per)\s*(?:GPU[- ]?)?(?:hr|hour)", html, re.I)))


def vast_rows(body):
    return [{k: o.get(k) for k in VAST_KEEP} for o in body.get("offers", [])]


def run():
    day = date.today().isoformat()
    d = fetch.RAW / "gpu" / day
    for name, url in PAGES.items():
        dest = d / f"{name}.html"
        try:
            fetch.get(url, dest, lambda b: (len(dollars_per_hour(b.decode("utf-8", "replace"))), day, day))
        except fetch.FetchError as e:
            print("FAIL", name, e)
    dest = d / "vast_offers.json"
    if not fetch.skip(dest):
        q = {"rentable": {"eq": True}, "limit": 10000}
        body = fetch.request(VAST, {"q": json.dumps(q)}).json()
        rows = vast_rows(body)
        fetch.save(dest, VAST, json.dumps(rows), lambda b: (len(rows), day, day))
