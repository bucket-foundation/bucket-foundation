import re
import sys
import unicodedata

MARK = "".join(
    re.escape(chr(c)) for c in range(0x300, 0x30000)
    if unicodedata.category(chr(c)).startswith("M")
)
LETTER = rf"(?:[^\W\d_]|[{MARK}]|‌)"
WORD_ANY = re.compile(rf"[^\W\d_]{LETTER}*(?:['’\-][^\W\d_]{LETTER}*)*['’]?")
HAS_LETTER = re.compile(r"[^\W\d_]")
ARABIC_MARKS = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")
HEBREW_MARKS = re.compile("[֑-ׇֽֿׁׂׅׄ]")
STRESS = re.compile("[̀́]")


def lookup_key(lang):
    if lang in ("ar", "fa"):
        return lambda s: ARABIC_MARKS.sub("", s)
    if lang == "he":
        return lambda s: HEBREW_MARKS.sub("", s).replace("׳", "'").replace("״", '"')
    if lang == "tr":
        return lambda s: s.replace("i\u0307", "i")
    if lang == "ru":
        return lambda s: unicodedata.normalize("NFC", STRESS.sub("", unicodedata.normalize("NFD", s)))
    return lambda s: s


AR_PRE = ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ل", "ك", "س"]
AR_SUF = ["هما", "كما", "هم", "هن", "كم", "كن", "نا", "ها", "ني", "ه", "ك", "ي"]
HE_PRE = ["וכש", "וש", "וה", "וב", "ול", "ומ", "שה", "שב", "של", "מה", "כש", "לכ", "ו", "ה", "ב", "ל", "מ", "ש", "כ"]
FA_SUF = ["‌های", "‌ها", "های", "ها", "‌ای", "‌ام", "‌اش", "ی", "م", "ت", "ش"]
TR_SOFT = {"b": "p", "c": "ç", "d": "t", "ğ": "k", "g": "k"}


def ar_variants(s):
    out = []
    for p in [""] + AR_PRE:
        if p and not s.startswith(p):
            continue
        stem = s[len(p):]
        if len(stem) < 2:
            continue
        out.append(stem)
        for x in AR_SUF:
            if stem.endswith(x) and len(stem) - len(x) >= 2:
                base = stem[: -len(x)]
                out.append(base)
                if base.endswith("ت"):
                    out.append(base[:-1] + "ة")
    return [v for v in dict.fromkeys(out) if v != s]


def id_variants(s):
    s = s.lower()
    out = [s[: -len(x)] for x in ("nya", "ku", "mu") if s.endswith(x)]
    out += [s[len(p):] for p in ("kau", "ku") if s.startswith(p)]
    return [v for v in dict.fromkeys(out) if len(v) >= 3]


def he_variants(s):
    out = [s[len(p):] for p in HE_PRE if s.startswith(p) and len(s) - len(p) >= 2]
    return list(dict.fromkeys(out))


def fa_variants(s):
    out = []
    if s.startswith("نمی‌") or s.startswith("می‌"):
        out.append(s.split("‌", 1)[1])
    for x in FA_SUF:
        if s.endswith(x) and len(s) - len(x) >= 2:
            out.append(s[: -len(x)].rstrip("‌"))
    return [v for v in dict.fromkeys(out) if v != s]


def tr_variants(s):
    s = s.lower()
    out = []
    for n in range(len(s) - 1, 1, -1):
        stem = s[:n]
        out.append(stem)
        if stem[-1] in TR_SOFT:
            out.append(stem[:-1] + TR_SOFT[stem[-1]])
        out.append(stem + ("mak" if any(v in "aıou" for v in stem[-2:]) else "mek"))
    return out


VARIANTS = {"ar": ar_variants, "he": he_variants, "fa": fa_variants, "tr": tr_variants, "id": id_variants}


class Segmenter:
    def __init__(self, lang):
        self.lang = lang
        self._impl = None

    def _load(self):
        if self._impl is not None:
            return self._impl
        if self.lang == "ja":
            import fugashi
            self._impl = fugashi.Tagger()
        elif self.lang == "zh":
            import jieba
            from opencc import OpenCC
            jieba.setLogLevel(60)
            self._impl = jieba
            self._s2t = OpenCC("s2t").convert
            self._t2s = OpenCC("t2s").convert
        elif self.lang == "th":
            from pythainlp.tokenize import word_tokenize
            self._impl = word_tokenize
        elif self.lang == "ko":
            from kiwipiepy import Kiwi
            self._impl = Kiwi()
        return self._impl

    def __call__(self, text):
        return getattr(self, f"_{self.lang}")(text)

    def _zh(self, text):
        jieba = self._load()
        simple = self._t2s(text)
        if len(simple) != len(text):
            simple = text
        out, pos = [], 0
        for w in jieba.lcut(simple, HMM=False):
            orig = text[pos:pos + len(w)]
            pos += len(w)
            if HAS_LETTER.search(orig):
                out.append((orig, False, [self._s2t(orig)]))
        return out

    def split_unknown(self, tokens, known, longest=4):
        out = []
        for w, initial, hints in tokens:
            if len(w) <= 2 or any(known(h) for h in hints or [w]):
                out.append((w, initial, hints))
                continue
            i = 0
            while i < len(w):
                for n in range(min(longest, len(w) - i), 0, -1):
                    part = w[i:i + n]
                    hint = self._s2t(part)
                    if n == 1 or known(hint) or known(part):
                        out.append((part, False, [hint]))
                        i += n
                        break
        return out

    def _th(self, text):
        return [(w, False, None) for w in self._load()(text, engine="newmm") if HAS_LETTER.search(w.strip())]

    def _ja(self, text):
        out = []
        attach_prev = False
        for w in self._load()(text):
            f = w.feature
            pos1, pos2 = f.pos1, f.pos2
            if pos1 in ("補助記号", "記号", "空白") or not HAS_LETTER.search(w.surface):
                attach_prev = False
                continue
            base = (f.orthBase or "").split("-")[0] or None
            lemma = (f.lemma or "").split("-")[0] or None
            glue = pos1 == "助動詞" or (pos1 == "助詞" and pos2 == "接続助詞" and w.surface in ("て", "で", "ば"))
            if glue and out and attach_prev:
                s, i, hints = out[-1]
                out[-1] = (s + w.surface, i, hints)
                continue
            out.append((w.surface, False, [h for h in (base, lemma) if h]))
            attach_prev = pos1 in ("動詞", "形容詞", "助動詞")
        return out

    def _ko(self, text):
        out, cur = [], None
        for t in self._load().tokenize(text):
            tag = t.tag.split("-")[0]
            if tag.startswith("S") and tag not in ("SL", "SH"):
                cur = None
                continue
            glue = tag.startswith("E") or tag in ("XSN", "XSV", "XSA", "VCP", "VCN") and cur is not None
            if glue and cur is not None:
                cur["end"] = t.start + t.len
                if tag in ("XSV", "XSA"):
                    cur["hint"] = cur["hint"].removesuffix("다") + t.form + "다"
                continue
            if tag.startswith("E"):
                continue
            if out and t.start < out[-1]["end"]:
                out[-1]["end"] = max(out[-1]["end"], t.start + t.len)
                cur = out[-1]
                continue
            hint = t.form + "다" if tag in ("VV", "VA", "VX", "VCP", "VCN") else t.form
            cur = {"start": t.start, "end": t.start + t.len, "hint": hint}
            out.append(cur)
        return [(text[c["start"]:c["end"]], False, [c["hint"]]) for c in out]


def compounds(tokens, known, size=3):
    out, i = [], 0
    while i < len(tokens):
        for n in range(min(size, len(tokens) - i), 1, -1):
            joined = " ".join(w for w, _ in tokens[i:i + n])
            if known(joined.lower()):
                out.append((joined, tokens[i][1]))
                i += n
                break
        else:
            out.append(tokens[i])
            i += 1
    return out


if __name__ == "__main__":
    print(Segmenter(sys.argv[1])(sys.argv[2]))
