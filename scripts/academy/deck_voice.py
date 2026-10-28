import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
QDIR = os.path.join(ROOT, "learning", "app", "corpus", "questions")
FIELDS = ("prompt", "options", "fix", "explanation")

BANNED = [
    'genuinely',
    'genuine',
    'honestly',
    'honest',
    'truly',
    'really',
    'actually',
    'basically',
    'essentially',
    'literally',
    'obviously',
    'clearly',
    'certainly',
    'absolutely',
    'definitely',
    'arguably',
    'undeniably',
    'undoubtedly',
    'simply',
    'merely',
    'very',
    'quite',
    'extremely',
    'incredibly',
    'remarkably',
    'fundamentally',
    'ultimately',
    'notably',
    'importantly',
]
ADVERBS = [
    'significantly',
    'substantially',
    'considerably',
    'dramatically',
    'seamlessly',
    'robustly',
    'effectively',
    'efficiently',
    'carefully',
    'thoughtfully',
    'properly',
    'correctly',
    'quickly',
    'easily',
    'readily',
    'smoothly',
    'highly',
    'deeply',
    'widely',
    'greatly',
    'vastly',
    'immensely',
    'particularly',
    'especially',
    'specifically',
    'generally',
    'typically',
    'usually',
    'often',
    'frequently',
    'surprisingly',
    'interestingly',
    'notably',
    'crucially',
    'successfully',
    'reliably',
    'consistently',
]
AI_TELLS = [
    'delve',
    'delves',
    'delving',
    'leverage',
    'leverages',
    'leveraging',
    'leveraged',
    'seamless',
    'seamlessly',
    'robust',
    'robustly',
    'robustness',
    'boost',
    'boosts',
    'boosting',
    'tapestry',
    'testament',
    'landscape',
    'realm',
    'underscore',
    'underscores',
    'pivotal',
    'crucial',
    'harness',
    'harnesses',
    'unlock',
    'unlocks',
    'unlocking',
    'elevate',
    'elevates',
    'navigate',
    'navigating',
    'foster',
    'fosters',
    'myriad',
    'plethora',
    'cutting-edge',
    'game-changer',
    'game-changing',
    'streamline',
    'streamlines',
    'streamlined',
    'empower',
    'empowers',
    'empowering',
    'intricate',
    'nuanced',
    'holistic',
    'paradigm',
    'resonate',
    'resonates',
    'spearhead',
    'bespoke',
]
AI_PHRASES = [
    "it'?s worth noting",
    'that said',
    "in today'?s world",
    'at the end of the day',
    'when it comes to',
    'in the realm of',
    'a testament to',
    'plays? a (?:pivotal|crucial|vital|key) role',
    "it'?s important to note",
    'needless to say',
    'rest assured',
    'dive deep(?:er)? into',
    'unlock the (?:power|potential)',
]
ANTITHESIS = [
    '\\bnot only\\b[^.\\n]{0,80}?\\bbut also\\b',
    '\\bnot just\\b[^.\\n]{0,80}?\\bbut\\b',
    ",\\s+not\\s+(?!only\\b)(?!just\\b)(?!yet\\b)[a-z][\\w'-]*",
    '[—–-]\\s*not\\s+[a-z]',
    "\\bis(?:n'?t| not)\\s+about\\b[^.\\n]{0,60}?,\\s*it'?s about\\b",
    '\\bthis,?\\s+not\\s+that\\b',
    '\\brather than (?:a |an |the )?\\w+,',
    '\\bless\\s+about\\b[^.\\n]{0,60}?\\bmore about\\b',
]


def words(ws):
    return re.compile(r"(?<![\w-])(" + "|".join(re.escape(w) for w in ws) + r")(?![\w-])", re.I)


def load_allow():
    path = os.path.join(ROOT, ".voiceallow")
    if not os.path.exists(path):
        return set()
    out = set()
    for line in open(path, encoding="utf8"):
        t = line.split("#", 1)[0].strip().lower()
        if t:
            out.add(t)
    return out


RULES = [
    ("banned", words(BANNED)),
    ("adverb", words(ADVERBS)),
    ("aitell", words(AI_TELLS)),
    ("aitell", re.compile("(" + "|".join(AI_PHRASES) + ")", re.I)),
    ("dash", re.compile("[\u2014\u2013]")),
] + [("antithesis", re.compile(p, re.I)) for p in ANTITHESIS]


def strings(q):
    for field in FIELDS:
        v = q.get(field)
        if isinstance(v, str):
            yield field, v
        elif isinstance(v, list):
            for s in v:
                if isinstance(s, str):
                    yield field, s


def scan(paths, allow):
    hits = []
    for path in paths:
        deck = json.load(open(path, encoding="utf8"))
        for q in deck.get("questions", []):
            for field, text in strings(q):
                for rule, rx in RULES:
                    for m in rx.finditer(text):
                        if m.group(0).strip(" ,").lower() in allow:
                            continue
                        hits.append((os.path.basename(path), q.get("id"), field, rule, m.group(0)))
    return hits


if __name__ == "__main__":
    paths = sys.argv[1:] or sorted(glob.glob(os.path.join(QDIR, "*.json")))
    hits = scan(paths, load_allow())
    for h in hits:
        print(*h, sep="  ")
    print(f"deck_voice: {len(paths)} decks, {len(hits)} hits")
    sys.exit(1 if hits else 0)
