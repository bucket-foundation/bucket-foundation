from dataclasses import dataclass, field
from typing import Callable, Optional

TRIALS = {}


@dataclass
class Trial:
    id: str
    card: str
    family: str
    asset: str
    fn: Callable
    pub: int
    ppy: int = 12
    rf: str = "zero"
    cost: str = ""
    turnover_est: Optional[float] = None
    note: str = ""
    origin: str = "new"
    reported: bool = True
    paper: str = ""
    claim: str = ""
    benchmark: str = ""
    precomputed: bool = False
    needs_paid_data: bool = False
    meta: dict = field(default_factory=dict)


def register(trial):
    if trial.id in TRIALS:
        raise ValueError(f"duplicate trial {trial.id}")
    TRIALS[trial.id] = trial
    return trial


def strategy(card, family, asset, pub, ppy=12, rf="zero", cost="", turnover_est=None, note="", paper="", claim="", benchmark="", precomputed=False,
             needs_paid_data=False):
    def wrap(fn):
        register(Trial(id=fn.__name__, card=card, family=family, asset=asset, fn=fn, pub=pub, ppy=ppy, rf=rf, cost=cost,
                       turnover_est=turnover_est, note=note, paper=paper, claim=claim, benchmark=benchmark,
                       precomputed=precomputed, needs_paid_data=needs_paid_data))
        return fn
    return wrap


def reported():
    return [t for t in TRIALS.values() if t.reported]


def load_all():
    from .strategies import crypto, equity_cz, equity_french, fx_commodity, legacy_trials, macro, prediction_markets, rates, sports, timing  # noqa: F401
    return TRIALS
