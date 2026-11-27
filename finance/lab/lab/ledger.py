import json
from pathlib import Path

START_CASH = 10_000.0


def load(path):
    p = Path(path)
    if not p.exists():
        return []
    return [json.loads(line) for line in p.read_text().splitlines() if line.strip()]


def append(path, event):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a") as f:
        f.write(json.dumps(event, sort_keys=True) + "\n")


def state(events):
    cash, pos = 0.0, {}
    for e in events:
        t = e["type"]
        if t == "deposit":
            cash += e["amount"]
        elif t == "trade":
            sign = 1 if e["side"] == "buy" else -1
            cash -= sign * e["qty"] * e["price"] + e.get("fee", 0.0)
            pos[e["instrument"]] = pos.get(e["instrument"], 0.0) + sign * e["qty"]
            if abs(pos[e["instrument"]]) < 1e-12:
                pos.pop(e["instrument"])
        elif t == "settle":
            qty = pos.pop(e["instrument"], 0.0)
            cash += qty * e["payout"]
        elif t == "interest":
            cash += e["amount"]
    return cash, pos


def equity(events, prices):
    cash, pos = state(events)
    missing = [k for k in pos if k not in prices]
    if missing:
        raise KeyError(f"no price for {missing}")
    return cash + sum(q * prices[k] for k, q in pos.items())


def marks(events):
    return [(e["date"], e["equity"]) for e in events if e["type"] == "mark"]


def rebalance(events, instrument, target_weight, prices, fee_bps, date, reason):
    _, pos = state(events)
    price = prices[instrument]
    eq = equity(events, prices)
    held = pos.get(instrument, 0.0)
    want = target_weight * eq / price if price > 0 else 0.0
    delta = want - held
    if abs(delta * price) < 1.0:
        return None
    side = "buy" if delta > 0 else "sell"
    qty = abs(delta)
    return {"type": "trade", "date": date, "instrument": instrument, "side": side, "qty": qty,
            "price": price, "fee": qty * price * fee_bps / 10_000, "reason": reason}
