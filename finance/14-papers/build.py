import json, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from fetch import SEEDS, TOPICS

HERE = Path(__file__).parent
FIN = HERE.parent
RAW = HERE / "data" / "raw"
CARDS = HERE / "cards"
DEEP = HERE / "deep"
TARGET = 1000
IGN = "<!-- voice-ignore-line -->"

LAB_DOIS = {
    "10.2469/faj.v68.n1.1": ("60/40 and Risk parity", "60/40"),
    "10.3905/jwm.2007.674809": ("GTAA trend", "GTAA trend"),
    "10.1016/j.jfineco.2011.11.003": ("Time-series momentum", "Time-series momentum"),
    "10.1111/0022-1082.00146": ("Industry momentum", "Industry momentum"),
    "10.1016/0304-405x(93)90023-5": ("Factor tilts", "Factor tilts"),
    "10.1016/j.jfineco.2014.10.010": ("Factor tilts", "Factor tilts"),
    "10.1111/j.1540-6261.1997.tb03808.x": ("Factor tilts", "Factor tilts"),
    "10.1093/rfs/hhaa113": ("Crypto trend", "Crypto trend"),
    "10.3905/jpm.24.2.11": ("CAPE timing", "CAPE timing"),
    "10.1086/655844": ("Favorite-longshot", "Favorite-longshot"),
    "10.1111/jofi.12365": ("Factor tilts, decay benchmark", "Factor tilts"),
    "10.1093/rfs/hhv063": ("Factor cost haircuts", "Factor tilts"),
    "10.3905/jpm.2014.40.5.094": ("Deflated Sharpe ratio used to grade every strategy", None),
}

LAB_TITLES = {
    "time series momentum": ("Time-series momentum", "Time-series momentum"),
}

METHODS = [
    ("reinforcement learning", "Reinforcement learning"),
    ("deep learning", "Deep learning model"),
    ("neural network", "Neural network model"),
    ("machine learning", "Machine learning model"),
    ("random forest", "Tree ensemble model"),
    ("experiment", "Experiment"),
    ("survey", "Survey of literature or respondents"),
    ("meta-analysis", "Meta-analysis"),
    ("garch", "GARCH-family volatility model"),
    ("cointegration", "Cointegration and error-correction analysis"),
    ("vector autoregress", "Vector autoregression"),
    ("var model", "Vector autoregression"),
    ("event study", "Event study"),
    ("difference-in-difference", "Difference-in-differences"),
    ("instrumental variable", "Instrumental variables"),
    ("panel", "Panel regression"),
    ("cross-section", "Cross-sectional regressions on asset returns"),
    ("regression", "Regression analysis"),
    ("simulation", "Simulation"),
    ("monte carlo", "Monte Carlo simulation"),
    ("dsge", "Dynamic stochastic general equilibrium model"),
    ("general equilibrium", "General equilibrium model"),
    ("equilibrium", "Equilibrium model"),
    ("we model", "Theoretical model"),
    ("we develop a model", "Theoretical model"),
    ("theory", "Theoretical model"),
    ("theoretical", "Theoretical model"),
    ("we derive", "Analytical derivation"),
    ("estimat", "Econometric estimation"),
    ("data", "Empirical analysis of market or survey data"),
    ("review", "Literature review"),
    ("survey", "Literature survey"),
    ("we document", "Empirical analysis of market data"),
    ("we find", "Empirical analysis"),
    ("sample", "Empirical analysis of a sample"),
    ("evidence", "Empirical analysis"),
    ("model", "Model-based analysis"),
    ("propose", "Proposed method or design"),
    ("returns", "Empirical analysis of returns"),
]

CUES = ["we find", "we show", "results show", "results indicate", "results suggest", "we document", "evidence", "show that", "shows that", "find that", "finds that", "suggest that", "indicate that", "demonstrate", "we conclude", "conclude that", "outperform", "significant"]


JUNK = ["Cross Ref", "Previous article", "BibTex", "Export Citation", "Google Scholar", "Crossref", "View Full Text"]
FINANCE_WORDS = ["market", "financ", "price", "pricing", "trading", "invest", "betting", "wager", "monetary", "currency", "payment", "odds", "bitcoin", "crypto", "stock", "asset", "bank", "forecast"]
TITLE_WORDS = FINANCE_WORDS + ["housing", "house", "rent", "inflation", "interest", "credit", "loan", "risk", "return", "volatil", "capital", "option", "futures", "liquidity", "portfolio", "money", "debt", "equity", "firm", "corporate", "wealth", "economic", "crisis", "crises", "arbitrage", "speculat", "bubble", "gambl", "sport", "football", "racetrack", "lotter", "election", "valuation", "dividend", "hedg", "default", "trader", "dealer", "exchange", "mortgage", "fiscal", "dollar", "cost of capital", "earnings", "fund", "momentum", "winners", "anomal", "efficient market", "pric"]
EXCLUDE = {"W4416365805", "W2014861505", "W3132558922", "W1971794754", "W2126326837", "W2919530665", "W1841934977", "W3193630181", "W2163699566", "W4372342856", "W2773206083", "W2089119433"}
WIDE_SLUGS = {"crypto", "prediction-markets", "sports-betting", "ml-finance", "rl-trading"}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def abstract(inv):
    if not inv:
        return ""
    pos = {}
    for word, idx in inv.items():
        for i in idx:
            pos[i] = word
    text = re.sub(r"\s+", " ", " ".join(pos[i] for i in sorted(pos))).strip()
    if any(j in text for j in JUNK) or len(text.split()) > 900:
        return ""
    return text


def clean_title(t):
    t = re.sub(r"<[^>]+>", "", t or "").strip()
    t = re.sub(r"\s+", " ", t)
    return t.rstrip("*").strip()


def has(text, terms):
    return any(re.search(r"\b" + re.escape(t), text) for t in terms)


def matches(text, phrases, also):
    hit = has(text, phrases)
    if also:
        hit = hit and has(text, also)
    return hit


def slugify(s, n=6):
    words = norm(s).split()[:n]
    return "-".join(words)[:60].strip("-")


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", text) if len(s.strip()) > 20]


def main_result(abs_text):
    sents = sentences(abs_text)
    if not sents:
        return []
    scored = [(sum(c in s.lower() for c in CUES), i, s) for i, s in enumerate(sents)]
    best = [x for x in scored if x[0] > 0]
    if best:
        best.sort(key=lambda x: (-x[0], x[1]))
        pick = sorted(best[:2], key=lambda x: x[1])
        return [s for _, _, s in pick]
    return sents[-1:]


def method_of(title, abs_text):
    text = (title + " " + abs_text).lower()
    for k, label in METHODS:
        if k in text:
            return label
    return "Not stated in the title or abstract"


def load_cards():
    by_doi, by_title = {}, {}
    for f in sorted((FIN / "09-strategies" / "cards").glob("*.md")):
        txt = f.read_text()
        cid = f.stem
        for d in re.findall(r"doi\.org/(\S+?)[\s)]", txt):
            by_doi.setdefault(d.lower().rstrip("."), set()).add(cid)
        for line in re.findall(r"^\d+\.\s+(.+?)\.\s", txt, re.M):
            by_title.setdefault(norm(line), set()).add(cid)
    return by_doi, by_title


def lab_verdicts():
    rows = {}
    for line in (FIN / "lab" / "RESULTS.md").read_text().splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 7 and cells[0] not in ("Strategy", "---"):
            rows[cells[0]] = cells[6]
    return rows


def main():
    works = {}
    tags = defaultdict(set)
    ranked = defaultdict(list)
    for slug, name, phrases, fields, also in TOPICS:
        pool = []
        for f in sorted(RAW.glob(f"{slug}-p*.json")):
            pool += json.loads(f.read_text())["results"]
        for w in json.loads((RAW / "seeds.json").read_text())["results"]:
            if SEEDS.get((w.get("doi") or "").replace("https://doi.org/", "").lower()) == slug:
                pool.append(dict(w, _seed=True))
        pool.sort(key=lambda w: -w["cited_by_count"])
        for w in pool:
            title = clean_title(w.get("display_name"))
            if not title or w["id"].split("/")[-1] in EXCLUDE:
                continue
            abs_text = abstract(w.get("abstract_inverted_index"))
            text = (title + " " + abs_text).lower()
            seed = w.get("_seed")
            if not seed and (abs_text or slug in WIDE_SLUGS) and not matches(text, phrases, also):
                continue
            if not seed and slug in WIDE_SLUGS and not has(text, FINANCE_WORDS):
                continue
            tl = title.lower()
            if not seed and not (has(tl, phrases) or has(tl, TITLE_WORDS)):
                continue
            key = norm(title)
            if key in works and works[key]["id"] != w["id"]:
                if works[key]["cited_by_count"] >= w["cited_by_count"]:
                    tags[key].add(slug)
                    if key not in ranked[slug]:
                        ranked[slug].append(key)
                    continue
            w["_title"], w["_abs"] = title, abs_text
            works[key] = w
            tags[key].add(slug)
            if key not in ranked[slug]:
                ranked[slug].append(key)

    chosen, home = [], {}
    cursor = {s: 0 for s, *_ in TOPICS}
    while len(chosen) < TARGET:
        moved = False
        for slug, *_ in TOPICS:
            lst = ranked[slug]
            while cursor[slug] < len(lst) and lst[cursor[slug]] in home:
                cursor[slug] += 1
            if cursor[slug] < len(lst) and len(chosen) < TARGET:
                k = lst[cursor[slug]]
                home[k] = slug
                chosen.append(k)
                moved = True
        if not moved:
            break

    names = {s: n for s, n, *_ in TOPICS}
    card_doi, card_title = load_cards()
    verdicts = lab_verdicts()
    id2key = {works[k]["id"]: k for k in chosen}

    CARDS.mkdir(exist_ok=True)
    for old in CARDS.glob("*.md"):
        old.unlink()

    used = set()
    meta = {}
    for k in chosen:
        w = works[k]
        auths = [a["author"]["display_name"] for a in w.get("authorships") or [] if a.get("author")]
        first = norm(auths[0]).split()[-1] if auths else "anon"
        base = f"{first}-{w.get('publication_year') or 'nd'}-{slugify(w['_title'], 5)}"
        fn = base
        i = 2
        while fn in used:
            fn = f"{base}-{i}"
            i += 1
        used.add(fn)
        doi = (w.get("doi") or "").replace("https://doi.org/", "").lower()
        loc = w.get("primary_location") or {}
        venue = ((loc.get("source") or {}).get("display_name")) or "not recorded"
        meta[k] = dict(fn=fn, auths=auths, doi=doi, venue=venue)

    refs_in = defaultdict(set)
    for k in chosen:
        for r in works[k].get("referenced_works") or []:
            if r in id2key and id2key[r] != k:
                refs_in[id2key[r]].add(k)

    full = json.loads((HERE / "data" / "fulltext.json").read_text()) if (HERE / "data" / "fulltext.json").exists() else {}
    extra = json.loads((HERE / "data" / "abstracts.json").read_text()) if (HERE / "data" / "abstracts.json").exists() else {}
    for k in chosen:
        w, m = works[k], meta[k]
        abs_from_pdf = not w["_abs"] and w["id"] in extra
        if abs_from_pdf:
            w = dict(w, _abs=extra[w["id"]])
        auth_str = ", ".join(m["auths"][:8]) + (" and others" if len(m["auths"]) > 8 else "") or "not recorded"
        doi_link = f"https://doi.org/{m['doi']}" if m["doi"] else "none"
        topics = ", ".join(names[t] for t in TOPICS_ORDER if t in tags[k])
        res = main_result(w["_abs"])
        rep = []
        lab = LAB_DOIS.get(m["doi"]) or LAB_TITLES.get(k)
        if lab:
            label, row = lab
            v = verdicts.get(row) if row else None
            rep.append(f"Lab replication: {label}. See [lab/RESULTS.md](../../lab/RESULTS.md)." + (f" Verdict: {v.rstrip('.')}." if v else ""))
        cids = sorted((card_doi.get(m["doi"], set()) if m["doi"] else set()) | card_title.get(k, set()))
        if cids:
            rep.append("Cited as a source by strategy cards: " + ", ".join(f"[{c}](../../09-strategies/cards/{c}.md)" for c in cids) + ". Each card grades decay after publication and retail feasibility.")
        if not rep:
            rep.append("No replication on file in 09-strategies or lab/RESULTS.md.")
        incites = len(refs_in[k])
        lines = [
            f"# {w['_title']} {IGN}",
            "",
            f"Topic: {names[home[k]]}  ",
            f"Also tagged: {topics}  ",
            f"OpenAlex: {w['id']}  ",
            "Bead: `bkt-q5moa.19`",
            "",
            "| Field | Value |",
            "|---|---|",
            f"| Authors | {auth_str} | {IGN}",
            f"| Year | {w.get('publication_year')} |",
            f"| Venue | {m['venue']} | {IGN}",
            f"| DOI | {doi_link} |",
            f"| Cited by | {w['cited_by_count']} as of 2026-11-27 |",
            f"| Cited by inside this set | {incites} |",
            "",
            "## Method",
            "",
            (method_of(w["_title"], w["_abs"]) + ". Assigned by keyword match on title and abstract.") if w["_abs"] else (method_of(w["_title"], "") + ". Assigned from the title alone; OpenAlex holds no abstract."),
            "",
            "## Main Result",
            "",
        ]
        if res:
            lines.append("Sentences from the abstract that state the finding:")
            lines.append("")
            for s in res:
                lines += ["<!-- voice-ignore-next 1 -->", f"> {s}"]
        else:
            lines.append("OpenAlex holds no abstract for this work. Read the paper at the DOI.")
        lines += ["", "## Replication", ""] + rep + ["", "## Abstract", ""]
        if w["_abs"]:
            if abs_from_pdf:
                lines += ["Taken from the open-access full text; OpenAlex holds none.", ""]
            lines += ["<!-- voice-ignore-next 1 -->", f"> {w['_abs']}"]
        else:
            lines.append("No abstract in OpenAlex.")
        ft = full.get(w["id"])
        if ft:
            lines += ["", "## Full Text", ""]
            lines.append(f"Open-access copy: {ft['url']}" if ft["status"] == "ok" else "No legal open-access copy found through OpenAlex, Unpaywall, arXiv, Semantic Scholar or NBER as of 2026-11-27.")
        deep = DEEP / f"{m['fn']}.md"
        if deep.exists():
            lines += [""] + deep.read_text().rstrip().splitlines()
        (CARDS / f"{m['fn']}.md").write_text("\n".join(lines) + "\n")

    write_index(chosen, works, meta, home, tags, names, refs_in)
    write_network(chosen, works, meta, home, names, refs_in)
    (HERE / "data" / "papers.json").write_text(json.dumps([
        dict(key=k, id=works[k]["id"], title=works[k]["_title"], year=works[k].get("publication_year"),
             doi=meta[k]["doi"], cites=works[k]["cited_by_count"], topic=home[k], tags=sorted(tags[k]),
             card=f"cards/{meta[k]['fn']}.md", cited_in_set=len(refs_in[k])) for k in chosen], indent=1))
    print(len(chosen), Counter(home.values()))


TOPICS_ORDER = [t[0] for t in TOPICS]


def row(k, works, meta):
    w, m = works[k], meta[k]
    a = m["auths"][0] if m["auths"] else "not recorded"
    if len(m["auths"]) > 1:
        a += " and others"
    return f"| [{w['_title']}](cards/{m['fn']}.md) | {a} | {w.get('publication_year')} | {w['cited_by_count']} | {IGN}"


def write_index(chosen, works, meta, home, tags, names, refs_in):
    out = ["# Finance Paper Canon", "", "1000 paper cards ranked by OpenAlex citation count, pulled 2026-11-27 for bead `bkt-q5moa.19`. Rebuild with `python3 fetch.py && python3 build.py`. Network summary in [NETWORK.md](NETWORK.md).", "",
           "## Selection", "",
           "Each topic queries OpenAlex for its phrases in title or abstract, restricted to the economics, business and decision-science fields, plus computer science and mathematics for crypto, prediction markets, betting and machine learning. Two pages of 200, sorted by citations. A local pass keeps a work only when a topic phrase appears in its abstract, or, when OpenAlex has no abstract, when its title carries a finance term. Topics then take turns adding their next most-cited unclaimed paper until the set holds 1000. Ten papers the lab replicated or cites, which the keyword search missed, enter as seeds by DOI (`SEEDS` in `fetch.py`). Twelve off-topic works that pass the phrase filter are excluded by OpenAlex id in `build.py`. A paper sits under the topic that claimed it first; its card lists every topic it matched.", "",
           "Citation counts mix canon with method papers that finance borrows, such as econometric tools. Niche topics run out of papers sooner, so their floor citation count is lower.", "",
           "## Topics", "", "| Topic | Papers | Lowest cites |", "|---|---|---|"]
    for s in TOPICS_ORDER:
        ks = [k for k in chosen if home[k] == s]
        lo = min(works[k]["cited_by_count"] for k in ks) if ks else 0
        out.append(f"| [{names[s]}](#{s}) | {len(ks)} | {lo} |")
    for s in TOPICS_ORDER:
        ks = sorted([k for k in chosen if home[k] == s], key=lambda k: -works[k]["cited_by_count"])
        out += ["", f'<a id="{s}"></a>', "", f"## {names[s]}", "", "| Paper | First author | Year | Cites |", "|---|---|---|---|"]
        out += [row(k, works, meta) for k in ks]
    (HERE / "INDEX.md").write_text("\n".join(out) + "\n")


def write_network(chosen, works, meta, home, names, refs_in):
    edges = Counter()
    total = 0
    for k in chosen:
        for src in refs_in[k]:
            edges[(home[src], home[k])] += 1
            total += 1
    out = ["# Citation Network", "", f"Built from OpenAlex `referenced_works` of the 1000 papers. An edge runs from a citing paper to a cited paper when both sit in the set. {total} edges in all.", ""]
    out += ["## Most Cited Overall", "", "By OpenAlex citation count.", "", "| Paper | First author | Year | Cites |", "|---|---|---|---|"]
    out += [row(k, works, meta) for k in sorted(chosen, key=lambda k: -works[k]["cited_by_count"])[:30]]
    out += ["", "## Most Cited Inside The Set", "", "Count of the 1000 papers that cite it.", "", "| Paper | Topic | In-set cites | Total cites |", "|---|---|---|---|"]
    for k in sorted(chosen, key=lambda k: -len(refs_in[k]))[:30]:
        out.append(f"| [{works[k]['_title']}](cards/{meta[k]['fn']}.md) | {names[home[k]]} | {len(refs_in[k])} | {works[k]['cited_by_count']} | {IGN}")
    out += ["", "## Bridges", "", "Papers cited from the most topics other than their own. These connect fields.", "", "| Paper | Home topic | Citing topics | Cross-topic cites |", "|---|---|---|---|"]
    bridge = []
    for k in chosen:
        other = [home[s] for s in refs_in[k] if home[s] != home[k]]
        if other:
            bridge.append((len(set(other)), len(other), k, sorted(set(other))))
    bridge.sort(key=lambda x: (-x[0], -x[1]))
    for nt, nc, k, ts in bridge[:30]:
        out.append(f"| [{works[k]['_title']}](cards/{meta[k]['fn']}.md) | {names[home[k]]} | {', '.join(names[t] for t in ts)} | {nc} | {IGN}")
    out += ["", "## Topic To Topic Flows", "", "Rows cite, columns are cited. Diagonal counts stay inside a topic.", ""]
    short = {s: s.split("-")[0][:6] for s in TOPICS_ORDER}
    out.append("| cites \\ cited | " + " | ".join(short[s] for s in TOPICS_ORDER) + " |")
    out.append("|---" * (len(TOPICS_ORDER) + 1) + "|")
    for a in TOPICS_ORDER:
        out.append(f"| {names[a]} | " + " | ".join(str(edges[(a, b)]) for b in TOPICS_ORDER) + " |")
    out += ["", "Column keys: " + ", ".join(f"`{short[s]}` {names[s]}" for s in TOPICS_ORDER) + ".", ""]
    cross = sorted(((v, a, b) for (a, b), v in edges.items() if a != b), reverse=True)[:15]
    out += ["## Strongest Cross-Topic Links", "", "| Citing topic | Cited topic | Edges |", "|---|---|---|"]
    out += [f"| {names[a]} | {names[b]} | {v} |" for v, a, b in cross]
    iso = [names[s] for s in TOPICS_ORDER if sum(edges[(s, b)] + edges[(b, s)] for b in TOPICS_ORDER if b != s) < 5]
    if iso:
        out += ["", "Topics with fewer than five cross-topic edges: " + ", ".join(iso) + "."]
    (HERE / "NETWORK.md").write_text("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
