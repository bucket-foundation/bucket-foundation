import os, sys

SRC = os.path.dirname(os.path.abspath(__file__))
ROUND2 = os.path.dirname(SRC)
BRAND = os.path.dirname(ROUND2)
REPO = os.path.dirname(BRAND)
DIRS = os.path.join(BRAND, "_directions")
PUBLIC = os.path.join(REPO, "public", "brand", "round2")
sys.path.insert(0, os.path.join(DIRS, "src"))

from lib import cr

DECK = dict(bg="#F4F3EF", surf="#FFFFFF", text="#161616", muted="#4F4E4A", acc="#0F62FE", onacc="#FFFFFF", knob="#FF5F00", gold="#D9A43A", ink="#111111", red="#DA1E28")
EUC = dict(bg="#F3EEE3", surf="#FBF8F1", text="#1A1714", muted="#5B5148", acc="#A6442A", onacc="#FFFFFF", hl="#1E4F94", by_red="#C8261D", by_yel="#E8B10C", by_blu="#1E4F94", night="#16130F", night_text="#F3EEE3", night_muted="#C9BDA9")

TEXT_PAIRS = [
    ("deck text on bg", DECK["text"], DECK["bg"]),
    ("deck muted on bg", DECK["muted"], DECK["bg"]),
    ("deck text on surface", DECK["text"], DECK["surf"]),
    ("deck muted on surface", DECK["muted"], DECK["surf"]),
    ("deck link on bg", DECK["acc"], DECK["bg"]),
    ("deck button label", DECK["onacc"], DECK["acc"]),
    ("deck label on knob", DECK["ink"], DECK["knob"]),
    ("deck rail label on ink", DECK["bg"], DECK["ink"]),
    ("euclid text on bg", EUC["text"], EUC["bg"]),
    ("euclid muted on bg", EUC["muted"], EUC["bg"]),
    ("euclid text on surface", EUC["text"], EUC["surf"]),
    ("euclid muted on surface", EUC["muted"], EUC["surf"]),
    ("euclid terracotta on bg", EUC["acc"], EUC["bg"]),
    ("euclid button label", EUC["onacc"], EUC["acc"]),
    ("euclid blue link on bg", EUC["hl"], EUC["bg"]),
    ("euclid night text", EUC["night_text"], EUC["night"]),
    ("euclid night muted", EUC["night_muted"], EUC["night"]),
    ("euclid yellow eyebrow on night", EUC["by_yel"], EUC["night"]),
    ("euclid muted on night credit card", EUC["muted"], EUC["bg"]),
    ("squiggle button label", "#173600", "#58CC02"),
    ("rail counter on ink", DECK["bg"], DECK["ink"]),
]
NONTEXT_PAIRS = [
    ("ink keyline on knob", DECK["ink"], DECK["knob"]),
    ("gold dot on ink", DECK["gold"], DECK["ink"]),
    ("byrne red on parchment", EUC["by_red"], EUC["bg"]),
    ("byrne blue on parchment", EUC["by_blu"], EUC["bg"]),
]


def aa_rows():
    out = []
    for n, f, b in TEXT_PAIRS:
        out.append((n, f, b, cr(f, b), 4.5))
    for n, f, b in NONTEXT_PAIRS:
        out.append((n + ", non-text", f, b, cr(f, b), 3.0))
    return out
