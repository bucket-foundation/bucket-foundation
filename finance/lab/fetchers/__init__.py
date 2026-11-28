from fetchers import crypto, fred, gates, gpu, history, kalshi, macro, openap, polymarket, realestate, sec, sports

REGISTRY = {
    "polymarket": polymarket.run,
    "kalshi": kalshi.run,
    "crypto": crypto.run,
    "defillama": crypto.defillama,
    "fred": fred.run,
    "history": history.run,
    "openap": openap.run,
    "realestate": realestate.run,
    "macro": macro.run,
    "sports": sports.run,
    "gpu": gpu.run,
    "sec": sec.run,
    "gates": gates.run,
}
