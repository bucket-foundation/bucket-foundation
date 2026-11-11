from pathlib import Path

PIN_FILE = Path(__file__).resolve().parents[2] / "learning/app/polingual/sources/gloss_pins.tsv"


def load_pins(path: Path = PIN_FILE) -> dict[tuple[str, str], dict]:
    if not path.exists():
        return {}
    pins = {}
    for line in path.read_text(encoding="utf-8").splitlines()[1:]:
        if not line:
            continue
        cols = line.split("\t") + ["", ""]
        lang, word, gloss, pos, ipa = cols[:5]
        pin = {"meaning": gloss}
        if pos:
            pin["pos"] = pos
        if ipa:
            pin["ipa"] = ipa
        pins[(lang, word)] = pin
    return pins


def apply_pin(row: dict, pin: dict, with_pos: bool = True) -> dict:
    out = {**row, "meaning": pin["meaning"]}
    if with_pos and "pos" in pin:
        out["pos"] = pin["pos"]
    if "ipa" in pin:
        out["ipa"] = pin["ipa"]
    return out
