import fetch

GATES = {
    "stooq_bulk": ("https://stooq.com/db/h/", "JavaScript proof-of-work challenge blocks scripted download"),
    "histdata_fx": ("https://www.histdata.com/download-free-forex-data/", "per-file form post with token; manual download"),
    "truefx": ("https://www.truefx.com", "free data needs registration login"),
    "dukascopy": ("https://www.dukascopy.com/swiss/english/marketwatch/historical/", "export tool is an interactive web widget"),
    "kraken_ohlcvt": ("https://support.kraken.com/articles/360047124832", "quarterly zips hosted on Google Drive behind a confirm page"),
    "kaggle_crypto": ("https://www.kaggle.com/datasets", "download needs a Kaggle login or API token"),
    "eia": ("https://www.eia.gov/opendata", "API key required; set EIA_API_KEY"),
    "tiingo_alpaca_fmp_eodhd_av": ("https://www.tiingo.com", "free tiers need an account API key"),
    "visa_onchain": ("https://visaonchainanalytics.com", "dashboard only, no download"),
    "artemis": ("https://about.artemis.ai/pricing", "terminal only, login required"),
    "usda_nass_land_values": ("https://esmis.nal.usda.gov/concern/publications/pn89d6567", "PDF and text report releases, no table API"),
    "bizbuysell": ("https://www.bizbuysell.com/insight-report", "report pages only"),
    "google_trends": ("https://developers.google.com/search/apis/trends", "API access by application"),
    "cboe_orats_optionmetrics": ("https://datashop.cboe.com", "paid options data"),
}


def run():
    for name, (url, reason) in GATES.items():
        fetch.gate(name, url, reason)
