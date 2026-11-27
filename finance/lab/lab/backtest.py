import pandas as pd

RECORD = None


def run(weights, returns, cost_bps=0.0, cash_return=None):
    returns = returns.fillna(0.0)
    w = weights.reindex(returns.index).ffill().fillna(0.0)
    if RECORD is not None:
        RECORD.append(w)
    held = w.shift(1).fillna(0.0)
    asset_pnl = (held * returns).sum(axis=1)
    cash_w = 1 - held.sum(axis=1)
    cash_r = cash_return.reindex(returns.index).fillna(0.0) if cash_return is not None else 0.0 * cash_w
    gross = asset_pnl + cash_w * cash_r
    drifted = held * (1 + returns)
    drifted = drifted.div((1 + gross).replace(0, 1e-12), axis=0)
    trades = (w - drifted).abs().sum(axis=1)
    cost = trades * cost_bps / 1e4
    net = (gross - cost).iloc[1:].copy()
    if len(net):
        net.iloc[0] -= cost.iloc[0]
    return net, trades.iloc[1:]
