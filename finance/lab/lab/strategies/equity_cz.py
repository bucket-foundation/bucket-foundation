from .. import data
from ..trials import Trial, register
from .common import TIER_TURNOVER, haircut, tier_label

N_REPORTED = 40
PAID_DATA = {"Options", "Analyst"}


def tier_for(row):
    period = row["Portfolio Period"]
    cat = str(row["Cat.Economic"])
    if period >= 12:
        return "annual"
    if period >= 3:
        return "quarterly"
    if "short-term reversal" in cat:
        return "reversal"
    if "momentum" in cat:
        return "momentum"
    return "monthly"


def make(acronym, tier):
    def fn():
        return haircut(data.openap_ls()[acronym], tier)
    fn.__name__ = f"cz_{acronym.lower()}"
    return fn


def card_ids():
    import csv
    from pathlib import Path
    p = Path(__file__).resolve().parents[3] / "09-strategies" / "registry.csv"
    with p.open() as f:
        return {r["id"] for r in csv.DictReader(f) if r["replicable_with_free_data"] == "y"}


def in_sample_tstats():
    s = data.openap_summary()
    s = s[(s["port"] == "LS") & (s["samptype"] == "insamp")]
    return s.set_index("signalname")["tstat"]


def register_all():
    doc = data.openap_doc()
    cards = card_ids()
    tstat = in_sample_tstats()
    columns = [c for c in data._openap_ls().columns if c in doc.index]
    eligible = [c for c in columns if f"eq-cz-{c.lower()}" in cards and c in tstat.index]
    top = set(sorted(eligible, key=lambda c: (-tstat[c], c))[:N_REPORTED])
    for c in sorted(columns):
        row = doc.loc[c]
        tier = tier_for(row)
        card = f"eq-cz-{c.lower()}"
        claim = f"{row['LongDescription']}: Chen-Zimmermann in-sample t {tstat[c]:.1f}" if c in tstat.index else str(row["LongDescription"])
        if row["Return"] == row["Return"]:
            claim += f"; original paper {row['Return']:.2f}% a month"
        register(Trial(id=f"cz_{c.lower()}", card=card if card in cards else "", family="Equities", asset="US equities", fn=make(c, tier),
                       pub=int(row["Year"]), cost=tier_label(tier), turnover_est=TIER_TURNOVER[tier], origin="chen-zimmermann",
                       precomputed=True, needs_paid_data=str(row["Cat.Data"]) in PAID_DATA,
                       reported=c in top, paper=f"{row['Authors']} {int(row['Year'])}, {row['Journal']}", claim=claim,
                       note=f"{row['Stock Weight']} weights as in the original paper",
                       meta={"sample_end": int(row["SampleEndYear"]), "insample_t": float(tstat.get(c, float('nan')))}))


register_all()
