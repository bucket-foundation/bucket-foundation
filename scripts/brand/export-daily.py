import json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/brand/daily"


def main():
    auto = json.loads((ROOT / "brand/bucket/candidates.json").read_text())["auto"]
    OUT.mkdir(parents=True, exist_ok=True)
    brands = []
    for b in auto:
        src = ROOT / "public" / b["logo"].lstrip("/")
        name = b["id"] + ".svg"
        shutil.copyfile(src, OUT / name)
        brands.append({"id": b["id"], "name": b["name"], "logo": f"/brand/daily/{name}", "colors": b["colors"], "fonts": b["fonts"]})
    (OUT / "brands.json").write_text(json.dumps(brands, separators=(",", ":")))
    print(len(brands), "brands")


if __name__ == "__main__":
    main()
