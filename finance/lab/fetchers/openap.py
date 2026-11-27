import io

import fetch

BASE = "https://huggingface.co/datasets/OpenSourceAP/CrossSection/resolve/main/"
LICENSE = ("Chen and Zimmermann, Open Source Asset Pricing, release 2026.10. No license on the Hugging Face dataset card; "
           "source repository github.com/OpenSourceAP/CrossSection is GPL-2.0. Cite Chen and Zimmermann 2022, Critical Finance Review")
FILES = {
    "PredictorLSretWide.parquet": "Portfolios/Full Sets OP/PredictorLSretWide.parquet",
    "PredictorPortsFull.parquet": "Portfolios/Full Sets OP/PredictorPortsFull.parquet",
    "PredictorSummary.xlsx": "Portfolios/Full Sets OP/PredictorSummary.xlsx",
    "PredictorAltPorts_LiqScreen_ME_gt_NYSE20pct.parquet": "Portfolios/Full Sets Alt/PredictorAltPorts_LiqScreen_ME_gt_NYSE20pct.parquet",
    "SignalDoc.csv": "SignalDoc.csv",
}


def parse_parquet(body):
    import pandas as pd
    df = pd.read_parquet(io.BytesIO(body))
    dates = pd.to_datetime(df["date"])
    return len(df), str(dates.min())[:10], str(dates.max())[:10]


def run():
    for name, path in FILES.items():
        parse = parse_parquet if name.endswith(".parquet") else None
        fetch.get(BASE + path.replace(" ", "%20"), fetch.RAW / "openap" / name, parse, license=LICENSE)
