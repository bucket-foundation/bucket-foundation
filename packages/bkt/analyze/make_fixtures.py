import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent / "tests/fixtures"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = ["month,sales (USD),visits,temp_c,region"]
    for i in range(36):
        y, m = 2021 + i // 12, i % 12 + 1
        s = 100 + 3 * i + 20 * math.sin(2 * math.pi * i / 12) + (80 if i == 20 else 0)
        t = 10 + 8 * math.sin(2 * math.pi * (i - 3) / 12)
        rows.append(f"{y}-{m:02d}-01,{s:.2f},{200 + 2 * i + (i * 7) % 5},{t:.1f},{'north' if i % 2 else 'south'}")
    (OUT / "monthly.csv").write_text("\n".join(rows) + "\n")
    (OUT / "monthly.tsv").write_text("\n".join(r.replace(",", "\t") for r in rows) + "\n")
    (OUT / "yearly.json").write_text(json.dumps([{"year": 2000 + i, "a": i + 1, "b": 2 * i + 3, "c": (i * i) % 7 + 1} for i in range(10)]))
    (OUT / "ragged.csv").write_text("a,b,c\n1,2,3\n4,5\n6,7,8,9\n")
    (OUT / "broken.json").write_text('[{"a": 1}, {"a": 2')
    (OUT / "no_numeric.csv").write_text("name,color\nx,red\ny,blue\n")
    (OUT / "dup_header.csv").write_text("a,a,b\n1,2,3\n4,5,6\n")
    (OUT / "messy.csv").write_text("t,x,y\n1,1.0,2\n2,,3\n3,abc,4\n4,4.0,NA\n4,4.0,NA\n5,5.0,6\n")
    (OUT / "empty.csv").write_text("")
    import pyarrow as pa
    import pyarrow.parquet as pq

    pq.write_table(pa.table({"t": [1, 2, 3, 4, 5, 6], "x": [1.0, 2, 3, 4, 5, 7], "y": [2.0, 1, 4, 3, 6, 5]}), OUT / "small.parquet")


if __name__ == "__main__":
    main()
