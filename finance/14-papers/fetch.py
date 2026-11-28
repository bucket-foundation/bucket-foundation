import json, os, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "data" / "raw"
FIELDS = "id,doi,display_name,publication_year,cited_by_count,authorships,primary_location,abstract_inverted_index,referenced_works,type,primary_topic"
ECON = "20|14|18"
WIDE = "20|14|17|18|26"

TOPICS = [
    ("asset-pricing", "Asset Pricing", ["asset pricing", "expected returns", "cross-section of stock returns", "cross-section of expected", "equity premium", "factor model", "capital asset pricing", "stochastic discount factor", "risk premium", "risk premia"], ECON, None),
    ("portfolio-theory", "Portfolio Theory", ["portfolio selection", "portfolio choice", "mean-variance", "portfolio optimization", "asset allocation", "efficient portfolio", "diversification"], ECON, None),
    ("derivatives", "Derivatives", ["option pricing", "options market", "option prices", "futures market", "futures prices", "derivative securities", "implied volatility", "stochastic volatility", "credit default swap", "pricing of options", "swaptions", "term structure of interest rates"], ECON, None),
    ("microstructure", "Market Microstructure", ["market microstructure", "bid-ask spread", "market liquidity", "order flow", "high-frequency trading", "limit order", "price impact", "informed trading", "market makers", "insider trading"], ECON, None),
    ("behavioral", "Behavioral Finance", ["behavioral finance", "investor sentiment", "overreact", "noise trader", "limits to arbitrage", "prospect theory", "disposition effect", "investor attention", "overconfidence", "herding"], ECON, None),
    ("econometrics", "Financial Econometrics", ["garch", "conditional heteroskedasticity", "conditional heteroscedasticity", "cointegration", "realized volatility", "return predictability", "volatility forecasting", "stock return volatility", "value at risk", "unit root"], ECON, None),
    ("monetary", "Monetary Economics", ["monetary policy", "central bank", "inflation targeting", "interest rate rule", "money demand", "quantitative easing", "price stickiness", "sticky prices"], ECON, None),
    ("banking-crises", "Banking and Crises", ["banking crisis", "banking crises", "financial crisis", "financial crises", "bank runs", "systemic risk", "contagion", "bank capital", "deposit insurance", "financial intermediation", "lender of last resort", "credit crunch"], ECON, None),
    ("real-estate", "Real Estate Finance", ["real estate", "house prices", "housing prices", "housing market", "reit", "commercial property", "housing boom", "home prices"], ECON, None),
    ("mortgage", "Mortgage", ["mortgage"], ECON, None),
    ("crypto", "Cryptocurrency", ["bitcoin", "cryptocurrency", "cryptocurrencies", "crypto asset", "stablecoin", "decentralized finance", "ethereum", "initial coin offering"], WIDE, None),
    ("prediction-markets", "Prediction Markets", ["prediction market", "information market", "election market", "polymarket", "kalshi", "market scoring rule", "iowa electronic market"], WIDE, None),
    ("sports-betting", "Sports Betting Markets", ["betting market", "sports betting", "wagering market", "favorite-longshot", "favourite-longshot", "parimutuel", "bookmakers", "bookmaker odds", "racetrack betting", "betting odds"], WIDE, None),
    ("ml-finance", "Machine Learning in Finance", ["machine learning", "deep learning", "neural network", "random forest", "support vector", "lstm", "gradient boosting"], WIDE, ["stock", "asset pric", "financial", "credit scor", "bankruptcy", "returns", "trading", "volatility", "portfolio", "exchange rate"]),
    ("rl-trading", "Reinforcement Learning Trading", ["reinforcement learning", "q-learning", "policy gradient"], WIDE, ["trading", "portfolio", "market making", "order execution", "stock", "financial", "hedging"]),
]


def query_of(phrases, also):
    q = " OR ".join(f'"{p}"' for p in phrases)
    if also:
        q = f"({q}) AND (" + " OR ".join(f'"{p}"' for p in also) + ")"
    return q


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "bucket-finance-atlas"})
    key = os.environ.get("OPENALEX_API_KEY")
    if key:
        url += "&api_key=" + key
        req = urllib.request.Request(url, headers={"User-Agent": "bucket-finance-atlas"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            print("retry", attempt, e, file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    raise SystemExit("fetch failed: " + url)


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    pages = int(os.environ.get("PAGES", "1"))
    for slug, _, phrases, fields, also in TOPICS:
        query = query_of(phrases, also)
        for page in range(1, pages + 1):
            out = RAW / f"{slug}-p{page}.json"
            if out.exists():
                continue
            flt = f"title_and_abstract.search:{query},primary_topic.field.id:{fields},type:article|book|book-chapter|preprint|review"
            url = "https://api.openalex.org/works?" + urllib.parse.urlencode({
                "filter": flt, "sort": "cited_by_count:desc", "per_page": 200, "page": page, "select": FIELDS})
            d = get(url)
            out.write_text(json.dumps(d))
            print(slug, page, d["meta"]["count"], len(d["results"]), d["meta"].get("cost_usd"))
            time.sleep(1)


SEEDS = {
    "10.1016/0304-405x(93)90023-5": "asset-pricing",
    "10.1111/j.1540-6261.1997.tb03808.x": "asset-pricing",
    "10.1016/j.jfineco.2011.11.003": "asset-pricing",
    "10.1111/0022-1082.00146": "asset-pricing",
    "10.2469/faj.v68.n1.1": "portfolio-theory",
    "10.3905/jwm.2007.674809": "portfolio-theory",
    "10.3905/jpm.24.2.11": "asset-pricing",
    "10.1093/rfs/hhv063": "asset-pricing",
    "10.3905/jpm.2014.40.5.094": "econometrics",
    "10.1111/j.1540-6261.1993.tb04702.x": "asset-pricing",
}


def fetch_seeds():
    out = RAW / "seeds.json"
    if out.exists():
        return
    flt = "doi:" + "|".join(SEEDS)
    url = "https://api.openalex.org/works?" + urllib.parse.urlencode({"filter": flt, "per_page": 50, "select": FIELDS})
    d = get(url)
    out.write_text(json.dumps(d))
    print("seeds", len(d["results"]))


if __name__ == "__main__":
    fetch_seeds()
    main()
