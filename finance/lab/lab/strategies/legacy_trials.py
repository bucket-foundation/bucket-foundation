from ..trials import Trial, register
from . import legacy as st

SPECS = {
    "sixty_forty": (12, "ff_m", {f"rebal_{k}m": (lambda k=k: st.sixty_forty(k)) for k in [1, 3, 12]}),
    "risk_parity": (12, "ff_m", {f"lb{lb}_{'tv10' if tv else 'unlev'}": (lambda lb=lb, tv=tv: st.risk_parity(lb, tv))
                                 for lb in [63, 126, 252] for tv in [None, 0.10]}),
    "faber_gtaa": (12, "ff_m", {f"sma{k}": (lambda k=k: st.faber_gtaa(k)) for k in [6, 8, 10, 12]}),
    "tsmom": (12, "ff_m", {f"lb{k}m": (lambda k=k: st.tsmom(k)) for k in [1, 3, 6, 9, 12]}),
    "dual_momentum": (12, "ff_m", {f"lb{k}m": (lambda k=k: st.dual_momentum(k)) for k in [6, 9, 12]}),
    "industry_momentum": (12, "ff_m", {f"lb{k}m": (lambda k=k: st.industry_momentum(k)) for k in [6, 12]}),
    "crypto_trend": (365, "tb_365", {f"{c}_sma{k}": (lambda c=c, k=k: st.crypto_trend(c, k)) for c in ["BTC", "ETH"] for k in [10, 20, 50, 100, 200]}),
    "cape_timing": (12, "zero", {f"q{int(q * 100)}": (lambda q=q: st.cape_timing(q)) for q in [0.5, 0.6, 0.7, 0.8, 0.9]}),
    "factors": (12, "zero", {name: (lambda name=name: (st.factor(name)[0], None)) for name in ["SMB", "HML", "Mom", "RMW", "CMA", "EW5"]}),
}

for family, (ppy, rf, variants) in SPECS.items():
    for name, fn in variants.items():
        register(Trial(id=f"legacy_{family}_{name}", card="", family=family, asset="", fn=fn, pub=2014, ppy=ppy, rf=rf,
                       origin="legacy", reported=False, precomputed=family == "factors"))
