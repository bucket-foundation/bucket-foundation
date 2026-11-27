from __future__ import annotations

import re
import unicodedata

NAS = "̃"

KANA_ROWS = {
    "": "あいうえお", "k": "かきくけこ", "g": "がぎぐげご", "s": "さしすせそ", "z": "ざじずぜぞ",
    "t": "たちつてと", "d": "だぢづでど", "n": "なにぬねの", "h": "はひふへほ", "b": "ばびぶべぼ",
    "p": "ぱぴぷぺぽ", "m": "まみむめも", "r": "らりるれろ",
}
KANA: dict[str, tuple[str, str]] = {}
for _c, _row in KANA_ROWS.items():
    for _k, _v in zip(_row, "aiueo"):
        KANA[_k] = (_c, _v)
KANA.update({
    "し": ("sh", "i"), "ち": ("ch", "i"), "つ": ("ts", "u"), "じ": ("j", "i"), "ぢ": ("j", "i"), "づ": ("z", "u"),
    "ふ": ("f", "u"), "や": ("y", "a"), "ゆ": ("y", "u"), "よ": ("y", "o"), "わ": ("w", "a"), "を": ("", "o"),
    "ゐ": ("", "i"), "ゑ": ("", "e"), "ゔ": ("v", "u"),
})
SMALL_Y = {"ゃ": "a", "ゅ": "u", "ょ": "o"}
SMALL_V = {"ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o"}
JA_V = {"a": "a̠", "i": "i", "u": "ɯ̟", "e": "e̞", "o": "o̞"}
JA_PAL = {"k": "kʲ", "g": "ɡʲ", "n": "ɲ̟", "h": "ç", "b": "bʲ", "p": "pʲ", "m": "mʲ", "r": "ɾʲ", "s": "ɕ", "z": "ʑ", "t": "t͡ɕ", "d": "ʑ"}
JA_C = {"k": "k", "g": "ɡ", "s": "s", "sh": "ɕ", "z": "z", "j": "ʑ", "t": "t", "ch": "t͡ɕ", "ts": "t͡s", "d": "d", "n": "n", "h": "h",
        "f": "ɸ", "b": "b", "p": "p", "m": "m", "y": "j", "r": "ɾ", "w": "ɰᵝ", "v": "β", "": ""}
HEPBURN_C = {"sh": "sh", "ch": "ch", "ts": "ts", "j": "j", "f": "f"}


def to_hiragana(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def kana_morae(kana: str) -> list[tuple[str, str]] | None:
    s = to_hiragana(kana)
    out: list[tuple[str, str]] = []
    i = 0
    while i < len(s):
        c = s[i]
        nxt = s[i + 1] if i + 1 < len(s) else ""
        if c == "ん":
            out.append(("N", ""))
        elif c == "っ":
            out.append(("Q", ""))
        elif c == "ー":
            out.append(("L", ""))
        elif c in KANA:
            cons, vow = KANA[c]
            if nxt in SMALL_Y:
                cons = {"sh": "sh", "ch": "ch", "j": "j"}.get(cons, cons + "y" if cons else "y")
                vow = SMALL_Y[nxt]
                i += 1
            elif nxt in SMALL_V:
                if c == "う":
                    cons = "w"
                elif c == "て":
                    cons = "t"
                elif c == "で":
                    cons = "d"
                vow = SMALL_V[nxt]
                i += 1
            out.append((cons, vow))
        elif c in SMALL_V:
            out.append(("", SMALL_V[c]))
        elif c in " ・=-":
            pass
        else:
            return None
        i += 1
    return out


def ja_ipa(kana: str) -> str | None:
    morae = kana_morae(kana)
    if not morae:
        return None
    segs: list[str] = []
    prev_v = ""
    for idx, (cons, vow) in enumerate(morae):
        nxt = morae[idx + 1] if idx + 1 < len(morae) else None
        first = idx == 0 or morae[idx - 1][0] == "N"
        if cons == "N":
            if segs:
                segs[-1] = segs[-1][0] + NAS + segs[-1][1:] if segs[-1][:1] in "aiueoɯ" else segs[-1]
            nc = nxt[0] if nxt else ""
            if not nxt:
                segs.append("ɴ")
            elif nc[:1] in ("p", "b", "m"):
                segs.append("m")
            elif nc[:1] in ("k", "g"):
                segs.append("ŋ")
            elif nc[:1] in ("t", "d", "n", "r", "c", "j", "z"):
                segs.append("n")
            else:
                segs.append("ɰ̃")
            prev_v = ""
            continue
        if cons == "Q":
            nc = nxt[0] if nxt else ""
            if nc[:1] in ("k", "g", "t", "d", "p", "b", "c"):
                base = {"c": "t", "ts": "t"}.get(nc, nc[:1])
                if nc == "ts":
                    base = "t"
                segs.append(JA_C.get(base, base) + "̚")
            elif nc:
                segs.append(ja_cons(nc, nxt[1], False)[:1])
            prev_v = ""
            continue
        if cons == "L":
            if segs:
                segs.append("ː")
            continue
        if cons == "" and vow and prev_v and (vow == prev_v or (vow == "u" and prev_v == "o") or (vow == "i" and prev_v == "e")):
            segs.append("ː")
            prev_v = ""
            continue
        c_ipa = ja_cons(cons, vow, first)
        v_ipa = JA_V[vow]
        if vow == "u" and cons in ("s", "z", "ts", "j") and False:
            v_ipa = "ɨ"
        if vow == "u" and cons in ("s", "z", "ts"):
            v_ipa = "ɨ"
        segs.append(c_ipa + v_ipa)
        prev_v = vow
    return "[" + "".join(segs) + "]"


def ja_cons(cons: str, vow: str, first: bool) -> str:
    pal = cons.endswith("y") and cons != "y"
    base = cons[:-1] if pal else cons
    if base == "z" and first:
        return "d͡ʑ" if (pal or vow == "i") else "d͡z"
    if base == "j":
        return "d͡ʑ" if first else "ʑ"
    if pal or (vow == "i" and base in JA_PAL and base not in ("sh", "ch", "j")):
        if base in JA_PAL:
            return JA_PAL[base]
    return JA_C.get(base, base)


def ja_romaji(kana: str) -> str | None:
    morae = kana_morae(kana)
    if not morae:
        return None
    out = []
    for idx, (cons, vow) in enumerate(morae):
        nxt = morae[idx + 1] if idx + 1 < len(morae) else None
        if cons == "N":
            out.append("n'" if nxt and (nxt[0] in ("", "y")) else "n")
        elif cons == "Q":
            nc = nxt[0] if nxt else ""
            out.append("t" if nc.startswith("ch") else nc[:1])
        elif cons == "L":
            pass
        else:
            pal = cons.endswith("y") and cons != "y"
            base = cons[:-1] if pal else cons
            c = HEPBURN_C.get(base, base)
            if pal:
                c = c + "y"
            if c == "z" and vow == "u" and to_hiragana(kana).find("づ") >= 0:
                c = "z"
            out.append(c + vow)
    s = "".join(out)
    return s


HANGUL_INIT = ["k", "kk", "n", "t", "tt", "r", "m", "p", "pp", "s", "ss", "", "c", "cc", "ch", "kh", "th", "ph", "h"]
HANGUL_VOW = ["a̠", "ɛ", "ja̠", "jɛ", "ʌ̹", "e̞", "jʌ̹", "je̞", "o̞", "wa̠", "wɛ", "we̞", "jo̞", "u", "wʌ̹", "we̞", "ɥi", "ju", "ɯ", "ɰi", "i"]
HANGUL_FIN = ["", "k", "kk", "ks", "n", "nc", "nh", "t", "l", "lk", "lm", "lp", "ls", "lth", "lph", "lh", "m", "p", "ps", "s", "ss", "ng", "c", "ch", "kh", "th", "ph", "h"]
KO_RR_INIT = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"]
KO_RR_VOW = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"]
KO_RR_FIN = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "p", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"]

KO_CODA = {"": "", "k": "K", "kk": "K", "ks": "K", "n": "n", "nc": "n", "nh": "n", "t": "T", "l": "l", "lk": "K", "lm": "m", "lp": "l",
           "ls": "l", "lth": "l", "lph": "P", "lh": "l", "m": "m", "p": "P", "ps": "P", "s": "T", "ss": "T", "ng": "ŋ", "c": "T", "ch": "T",
           "kh": "K", "th": "T", "ph": "P", "h": "T"}
KO_SPLIT = {"ks": ("k", "s"), "nc": ("n", "c"), "nh": ("n", "h"), "lk": ("l", "k"), "lm": ("l", "m"), "lp": ("l", "p"), "ls": ("l", "s"),
            "lth": ("l", "th"), "lph": ("l", "ph"), "lh": ("l", "h"), "ps": ("p", "s")}
KO_TENSE = {"k": "kk", "t": "tt", "p": "pp", "s": "ss", "c": "cc"}
KO_ASP = {"k": "kh", "t": "th", "p": "ph", "c": "ch"}
KO_NASAL = {"K": "ŋ", "T": "n", "P": "m"}
KO_CODA_IPA = {"K": "k̚", "T": "t̚", "P": "p̚", "n": "n", "l": "l", "m": "m", "ŋ": "ŋ", "": ""}


def ko_syllables(word: str) -> list[list[str]] | None:
    out = []
    for ch in word:
        o = ord(ch) - 0xAC00
        if not 0 <= o < 11172:
            if ch in " -":
                continue
            return None
        out.append([HANGUL_INIT[o // 588], o % 588 // 28, HANGUL_FIN[o % 28]])
    return out or None


def ko_ipa(word: str) -> str | None:
    sy = ko_syllables(word)
    if not sy:
        return None
    n = len(sy)
    for i in range(n - 1):
        fin, nxt = sy[i][2], sy[i + 1]
        if not fin:
            continue
        if nxt[0] == "":
            if fin == "ng":
                continue
            if fin in KO_SPLIT:
                a, b = KO_SPLIT[fin]
                if b == "h":
                    sy[i][2], nxt[0] = a, ""
                else:
                    sy[i][2], nxt[0] = a, b
            elif fin == "h":
                sy[i][2] = ""
            else:
                sy[i][2], nxt[0] = "", fin
            if nxt[0] in ("t", "th") and nxt[1] == 20:
                nxt[0] = "c" if nxt[0] == "t" else "ch"
            continue
        if fin in ("h", "nh", "lh") and nxt[0] in KO_ASP:
            nxt[0] = KO_ASP[nxt[0]]
            sy[i][2] = {"h": "", "nh": "n", "lh": "l"}[fin]
            continue
        if nxt[0] == "h" and KO_CODA[fin] in ("K", "T", "P"):
            nxt[0] = {"K": "kh", "T": "th", "P": "ph"}[KO_CODA[fin]]
            sy[i][2] = ""
            continue
    out = []
    for i, (ini, vi, fin) in enumerate(sy):
        prev = sy[i - 1] if i else None
        pcoda = KO_CODA[prev[2]] if prev else None
        nxt = sy[i + 1] if i + 1 < n else None
        if prev is not None and pcoda in ("K", "T", "P") and ini in KO_TENSE:
            ini = KO_TENSE[ini]
        if prev is not None and ini == "r" and pcoda in ("n", "m", "ŋ", "K", "T", "P"):
            ini = "l" if pcoda == "n" and False else "n"
        if prev is not None and ini == "r" and pcoda == "l":
            ini = "l"
        if prev is not None and ini == "n" and pcoda == "l":
            ini = "l"
        voiced_env = prev is not None and (pcoda in ("", "n", "l", "m", "ŋ"))
        c = ko_onset(ini, vi, voiced_env, prev is None)
        v = HANGUL_VOW[vi]
        if vi == 19 and ini != "":
            v = "i"
        coda = KO_CODA[fin]
        if nxt is not None and coda in KO_NASAL and nxt[0] in ("n", "m", "r"):
            coda = KO_NASAL[coda]
        if nxt is not None and coda == "n" and nxt[0] == "r":
            coda = "l"
        out.append(c + v + KO_CODA_IPA[coda])
    return "[" + "".join(out) + "]"


def ko_onset(ini: str, vi: int, voiced: bool, first: bool) -> str:
    front = vi in (2, 3, 6, 7, 12, 16, 17, 20)
    if ini == "s":
        return "ɕʰ" if front else "sʰ"
    if ini == "ss":
        return "ɕ͈" if front else "s͈"
    if ini == "h":
        return "ɦ" if voiced else "h"
    if ini == "r":
        return "ɾ" if not first else "ɾ"
    if ini == "l":
        return "l"
    lenis = {"k": ("k", "ɡ"), "t": ("t", "d"), "p": ("p", "b"), "c": ("t͡ɕ", "d͡ʑ")}
    if ini in lenis:
        return lenis[ini][1 if voiced else 0]
    return {"kk": "k͈", "tt": "t͈", "pp": "p͈", "cc": "t͡ɕ͈", "ch": "t͡ɕʰ", "kh": "kʰ", "th": "tʰ", "ph": "pʰ", "n": "n", "m": "m", "": ""}[ini]


def ko_rr(word: str) -> str | None:
    sy = ko_syllables(word)
    if not sy:
        return None
    return "".join(KO_RR_INIT[HANGUL_INIT.index(a)] + KO_RR_VOW[b] + KO_RR_FIN[HANGUL_FIN.index(c)] for a, b, c in sy)


HE_MULTI = [("sh", "ʃ"), ("kh", "χ"), ("ch", "t͡ʃ"), ("tz", "t͡s"), ("ts", "t͡s"), ("zh", "ʒ"), ("dj", "d͡ʒ")]
HE_SINGLE = {"r": "ʁ", "'": "ʔ", "ʼ": "ʔ", "’": "ʔ", "j": "d͡ʒ", "y": "j", "g": "ɡ", "c": "k", "x": "χ", "ḥ": "χ", "ṭ": "t", "q": "k", "w": "w"}


def he_ipa(tr: str) -> str | None:
    s = unicodedata.normalize("NFD", tr.lower())
    stress = None
    plain = []
    for ch in s:
        if ch in "́̀":
            stress = len(plain)
            continue
        if unicodedata.combining(ch):
            continue
        plain.append(ch)
    s = "".join(plain)
    out = []
    i = 0
    while i < len(s):
        for a, b in HE_MULTI:
            if s.startswith(a, i):
                out.append(b)
                i += len(a)
                break
        else:
            ch = s[i]
            if ch in "-.":
                pass
            elif ch == " ":
                out.append(" ")
            elif ch in HE_SINGLE:
                out.append(HE_SINGLE[ch])
            elif ch.isalpha():
                out.append(ch)
            else:
                return None
            i += 1
    return "/" + "".join(out) + "/" if out else None


DEVA_V = {"अ": "a", "आ": "A", "इ": "i", "ई": "I", "उ": "u", "ऊ": "U", "ऋ": "R", "ए": "e", "ऐ": "E", "ओ": "o", "औ": "O", "ऑ": "Q", "ॠ": "RR", "ऌ": "L"}
DEVA_M = {"ा": "A", "ि": "i", "ी": "I", "ु": "u", "ू": "U", "ृ": "R", "े": "e", "ै": "E", "ो": "o", "ौ": "O", "ॉ": "Q", "ॄ": "RR", "ॢ": "L"}
DEVA_C = {
    "क": ("k", "k"), "ख": ("kʰ", "kʰ"), "ग": ("ɡ", "ɡ"), "घ": ("ɡʱ", "ɡʱ"), "ङ": ("ŋ", "ŋ"),
    "च": ("t͡ʃ", "t͡ɕ"), "छ": ("t͡ʃʰ", "t͡ɕʰ"), "ज": ("d͡ʒ", "d͡ʑ"), "झ": ("d͡ʒʱ", "d͡ʑʱ"), "ञ": ("ɲ", "ɲ"),
    "ट": ("ʈ", "ʈ"), "ठ": ("ʈʰ", "ʈʰ"), "ड": ("ɖ", "ɖ"), "ढ": ("ɖʱ", "ɖʱ"), "ण": ("ɳ", "ɳ"),
    "त": ("t̪", "t"), "थ": ("t̪ʰ", "tʰ"), "द": ("d̪", "d"), "ध": ("d̪ʱ", "dʱ"), "न": ("n", "n"),
    "प": ("p", "p"), "फ": ("pʰ", "pʰ"), "ब": ("b", "b"), "भ": ("bʱ", "bʱ"), "म": ("m", "m"),
    "य": ("j", "j"), "र": ("ɾ", "ɾ"), "ल": ("l", "l"), "व": ("ʋ", "ʋ"), "श": ("ʃ", "ɕ"), "ष": ("ʂ", "ʂ"),
    "स": ("s", "s"), "ह": ("ɦ", "ɦ"), "ळ": ("ɭ", "ɭ"),
}
DEVA_NUKTA = {"क": "q", "ख": "x", "ग": "ɣ", "ज": "z", "फ": "f", "ड": "ɽ", "ढ": "ɽʱ", "य": "j", "र": "ɾ"}
HI_V = {"a": "ə", "A": "ɑː", "i": "ɪ", "I": "iː", "u": "ʊ", "U": "uː", "R": "ɾɪ", "e": "eː", "E": "ɛː", "o": "oː", "O": "ɔː", "Q": "ɔ", "RR": "ɾiː", "L": "lɪ"}
SA_V = {"a": "ɐ", "A": "aː", "i": "i", "I": "iː", "u": "u", "U": "uː", "R": "r̩", "e": "eː", "E": "ɐi̯", "o": "oː", "O": "ɐu̯", "Q": "ɔ", "RR": "r̩ː", "L": "l̩"}
HOMORGANIC = {"k": "ŋ", "ɡ": "ŋ", "t͡": "ɲ", "d͡": "ɲ", "ʈ": "ɳ", "ɖ": "ɳ", "t": "n", "d": "n", "p": "m", "b": "m"}


def deva_units(word: str, sa: bool) -> list[list] | None:
    units: list[list] = []
    chars = list(word)
    i = 0
    col = 1 if sa else 0
    while i < len(chars):
        c = chars[i]
        if c in DEVA_C:
            ipa = DEVA_C[c][col]
            if i + 1 < len(chars) and chars[i + 1] == "़":
                ipa = DEVA_NUKTA.get(c, ipa)
                i += 1
            units.append(["C", ipa])
            nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if nxt == "्":
                i += 2
                continue
            if nxt in DEVA_M:
                units.append(["V", DEVA_M[nxt], False])
                i += 2
                continue
            units.append(["V", "a", True])
            i += 1
            continue
        if c in "क़ख़ग़ज़ड़ढ़फ़य़":
            base = unicodedata.normalize("NFD", c)
            units.append(["C", DEVA_NUKTA.get(base[0], "")])
            chars[i] = base[0]
            chars.insert(i + 1, "़")
            del units[-1]
            continue
        if c in DEVA_V:
            units.append(["V", DEVA_V[c], False])
        elif c in "ंँ":
            units.append(["N", c])
        elif c == "ः":
            units.append(["C", "h"])
        elif c in " -":
            units.append(["S", " "])
        elif c in "ऽ।":
            pass
        else:
            return None
        i += 1
    return units


def hi_ipa(word: str) -> str | None:
    u = deva_units(word, False)
    if not u:
        return None
    n = len(u)
    words: list[list[list]] = [[]]
    for x in u:
        if x[0] == "S":
            words.append([])
        else:
            words[-1].append(x)
    out_words = []
    for w in words:
        if not w:
            continue
        if w[-1][0] == "V" and w[-1][1] == "a" and w[-1][2] and len(w) > 2:
            w[-1][2] = "DEL"
        vi = [k for k, x in enumerate(w) if x[0] == "V"]
        for k in range(len(w) - 1, -1, -1):
            x = w[k]
            if x[0] != "V" or x[1] != "a" or x[2] is not True or k < 2:
                continue
            if not (w[k - 1][0] == "C" and k + 2 < len(w) and w[k + 1][0] == "C" and w[k + 2][0] == "V"):
                continue
            if w[k - 2][0] != "V":
                continue
            if w[k - 2][1] == "a" and w[k - 2][2] == "DEL":
                continue
            if any(y[2] == "DEL" for y in w[k + 1:k + 3] if y[0] == "V") and False:
                continue
            x[2] = "DEL"
        out = []
        for k, x in enumerate(w):
            if x[0] == "C":
                out.append(x[1])
            elif x[0] == "V":
                if x[2] == "DEL":
                    continue
                out.append(HI_V[x[1]])
            elif x[0] == "N":
                nxt = next((y for y in w[k + 1:] if y[0] == "C"), None) if k + 1 < len(w) and w[k + 1][0] == "C" else None
                if x[1] == "ं" and nxt:
                    out.append(next((v for p, v in HOMORGANIC.items() if nxt[1].startswith(p)), "n"))
                elif out:
                    out[-1] = out[-1][0] + NAS + out[-1][1:]
        out_words.append("".join(out))
    return "/" + " ".join(out_words) + "/" if out_words else None


def sa_ipa(word: str) -> str | None:
    u = deva_units(word, True)
    if not u:
        return None
    out = []
    for k, x in enumerate(u):
        if x[0] == "C":
            out.append(x[1])
        elif x[0] == "V":
            out.append(SA_V[x[1]])
        elif x[0] == "S":
            out.append(" ")
        elif x[0] == "N":
            nxt = u[k + 1] if k + 1 < len(u) and u[k + 1][0] == "C" else None
            if x[1] == "ं" and nxt:
                out.append(next((v for p, v in HOMORGANIC.items() if nxt[1].startswith(p)), "ɱ"))
            elif x[1] == "ं":
                out.append("m")
            elif out:
                out[-1] = out[-1] + NAS
    return "/" + "".join(out) + "/"


LA_LONG = {"ā": "aː", "ē": "eː", "ī": "iː", "ō": "oː", "ū": "uː", "ȳ": "yː"}
LA_SHORT = {"a": "a", "e": "ɛ", "i": "ɪ", "o": "ɔ", "u": "ʊ", "y": "ʏ"}
LA_TENSE = {"a": "a", "e": "e", "i": "i", "o": "o", "u": "u", "y": "y"}
LA_VOW = set("aeiouyāēīōūȳ")


def la_ipa(form: str) -> str | None:
    s = unicodedata.normalize("NFC", form.lower().replace("ă", "a").replace("ĕ", "e").replace("ĭ", "i").replace("ŏ", "o").replace("ŭ", "u"))
    s = unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s) if c not in "̆́"))
    if re.search(r"[^a-zāēīōūȳ \-]", s):
        return None
    out: list[str] = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        nx = s[i + 1] if i + 1 < n else ""
        pv = s[i - 1] if i else ""
        if c in " -":
            out.append(" ")
            i += 1
            continue
        if c + nx in ("ae", "au", "oe", "ei", "eu") and c + nx in ("ae", "au", "oe"):
            out.append(c + nx[0] + "̯")
            i += 2
            continue
        if c == "q" and nx == "u":
            out.append("kʷ")
            i += 2
            continue
        if c == "g" and nx == "u" and pv == "n" and i + 2 < n and s[i + 2] in LA_VOW:
            out.append("ɡʷ")
            i += 2
            continue
        if c in ("i", "j") and nx in LA_VOW and (i == 0 or pv in LA_VOW or pv == " "):
            out.append("jj" if pv in LA_VOW else "j")
            i += 1
            continue
        if c == "u" and nx in LA_VOW and (i == 0 or pv in LA_VOW) and nx != "u":
            out.append("w")
            i += 1
            continue
        if c == "v":
            out.append("w")
            i += 1
            continue
        if c in LA_LONG:
            out.append(LA_LONG[c])
        elif c in LA_SHORT:
            if nx in LA_VOW or nx == "h" and i + 2 < n and s[i + 2] in LA_VOW:
                out.append(LA_TENSE[c])
            elif nx == "n" and i + 2 < n and s[i + 2] in "sf":
                out.append(LA_TENSE[c].replace("ʊ", "u") + NAS + "ː")
                i += 2
                continue
            elif nx == "m" and (i + 2 >= n or s[i + 2] == " ") and i > 0:
                out.append(LA_TENSE[c] + NAS + "ː")
                i += 2
                continue
            elif i + 1 >= n and c == "i" and False:
                out.append("i")
            else:
                out.append(LA_SHORT[c])
        elif c in ("ph", "th", "ch") or (c in "ptc" and nx == "h"):
            out.append({"p": "pʰ", "t": "tʰ", "c": "kʰ"}[c])
            i += 2
            continue
        elif c == "c":
            out.append("k")
        elif c == "g":
            out.append("ŋ" if nx == "n" else "ɡ")
        elif c == "x":
            out.append("ks")
        elif c == "n":
            out.append("ŋ" if nx in "cgqx" and nx else "n")
        elif c == "l":
            out.append("l" if nx in ("i", "ī", "l") and nx else "ɫ")
        elif c == "z":
            out.append("zz" if pv in LA_VOW else "z")
        elif c == "h":
            out.append("h")
        else:
            out.append(c)
        i += 1
    return "[" + "".join(out) + "]"


VI_INIT = [("ngh", "ŋ"), ("ng", "ŋ"), ("nh", "ɲ"), ("ch", "t͡ɕ"), ("tr", "t͡ɕ"), ("th", "tʰ"), ("ph", "f"), ("kh", "x"), ("gh", "ɣ"),
           ("gi", "z"), ("qu", "kw"), ("b", "ʔɓ"), ("c", "k"), ("k", "k"), ("q", "k"), ("d", "z"), ("đ", "ʔɗ"), ("g", "ɣ"), ("h", "h"),
           ("l", "l"), ("m", "m"), ("n", "n"), ("r", "z"), ("s", "s"), ("t", "t"), ("v", "v"), ("x", "s")]
VI_TONE = {"̀": "˨˩", "́": "˧˦", "̉": "˧˩", "̃": "˦ˀ˥", "̣": "˧˨ʔ"}
VI_NUC = [("uyê", "wiə"), ("uya", "wiə"), ("iê", "iə"), ("yê", "iə"), ("ia", "iə"), ("ya", "iə"), ("uô", "uə"), ("ua", "uə"), ("ươ", "ɨə"), ("ưa", "ɨə"),
          ("oa", "waː"), ("oă", "wa"), ("oe", "wɛ"), ("uê", "we"), ("uy", "wi"), ("uơ", "wəː"), ("uâ", "wə"),
          ("a", "aː"), ("ă", "a"), ("â", "ə"), ("e", "ɛ"), ("ê", "e"), ("i", "i"), ("y", "i"), ("o", "ɔ"), ("ô", "o"), ("ơ", "əː"), ("u", "u"), ("ư", "ɨ")]
VI_FIN = {"": "", "c": "k̚", "ch": "k̚", "m": "m", "n": "n", "ng": "ŋ", "nh": "ŋ̟", "p": "p̚", "t": "t̚", "i": "j", "y": "j", "o": "w", "u": "w"}


def vi_syllable(syl: str) -> str | None:
    d = unicodedata.normalize("NFD", syl.lower())
    tone = "˧˧"
    base = []
    for ch in d:
        if ch in VI_TONE:
            tone = VI_TONE[ch]
        else:
            base.append(ch)
    s = unicodedata.normalize("NFC", "".join(base))
    onset = ""
    for a, b in VI_INIT:
        if s.startswith(a):
            rest = s[len(a):]
            if a == "gi" and (not rest or rest[0] not in "aăâeêoôơuư"):
                rest = "i" + rest
            if a == "qu" and not rest:
                break
            onset, s = b, rest
            break
    for a, b in VI_NUC:
        if s.startswith(a):
            nuc, fin = b, s[len(a):]
            break
    else:
        return None
    if fin not in VI_FIN:
        if len(a) == 1 and nuc in ("aː", "ə", "ɔ", "o", "əː", "u", "ɨ", "ɛ", "e") and fin[:1] in "iyou" and fin[1:] in VI_FIN:
            pass
        return None
    f = VI_FIN[fin]
    if fin in ("ch", "nh"):
        nuc = {"aː": "aj", "e": "əj", "i": "ï", "wi": "wï", "waː": "waj", "we": "wəj"}.get(nuc, nuc)
    if fin in ("y",) and nuc == "aː":
        nuc, f = "a", "j"
    if fin == "u" and nuc == "aː":
        nuc, f = "a", "w"
    if fin in ("ng", "c") and nuc in ("ɔ", "o", "u"):
        nuc = {"ɔ": "aw", "o": "əw", "u": "u"}[nuc]
        f = "ŋ͡m" if fin == "ng" else "k͡p̚"
    if onset == "kw" and nuc.startswith("w"):
        onset = "k"
    return onset + nuc + f + tone


def vi_ipa(text: str) -> str | None:
    parts = [p for p in re.split(r"[\s\-]+", text.strip()) if p]
    out = []
    for p in parts:
        x = vi_syllable(p)
        if x is None:
            return None
        out.append(x)
    return "[" + " ".join(out) + "]" if out else None


PY_INIT = [("zh", "ʈ͡ʂ"), ("ch", "ʈ͡ʂʰ"), ("sh", "ʂ"), ("b", "p"), ("p", "pʰ"), ("m", "m"), ("f", "f"), ("d", "t"), ("t", "tʰ"), ("n", "n"),
           ("l", "l"), ("g", "k"), ("k", "kʰ"), ("h", "x"), ("j", "t͡ɕ"), ("q", "t͡ɕʰ"), ("x", "ɕ"), ("r", "ʐ"), ("z", "t͡s"), ("c", "t͡sʰ"), ("s", "s")]
PY_FIN = {
    "a": "a", "o": "u̯ɔ", "e": "ɤ", "ai": "aɪ̯", "ei": "eɪ̯", "ao": "ɑʊ̯", "ou": "oʊ̯", "an": "an", "en": "ən", "ang": "ɑŋ", "eng": "ɤŋ",
    "ong": "ʊŋ", "er": "ɑɻ", "i": "i", "ia": "i̯a", "ie": "i̯ɛ", "iao": "i̯ɑʊ̯", "iu": "i̯oʊ̯", "iou": "i̯oʊ̯", "ian": "i̯ɛn", "in": "in",
    "iang": "i̯ɑŋ", "ing": "iŋ", "iong": "i̯ʊŋ", "u": "u", "ua": "u̯a", "uo": "u̯ɔ", "uai": "u̯aɪ̯", "ui": "u̯eɪ̯", "uei": "u̯eɪ̯",
    "uan": "u̯an", "un": "u̯ən", "uen": "u̯ən", "uang": "u̯ɑŋ", "ueng": "u̯ɤŋ", "ü": "y", "üe": "y̯ɛ", "üan": "y̯ɛn", "ün": "yn", "ê": "ɛ",
}
PY_YW = {"yi": "i", "ya": "ia", "ye": "ie", "yao": "iao", "you": "iou", "yan": "ian", "yin": "in", "yang": "iang", "ying": "ing",
         "yong": "iong", "yu": "ü", "yue": "üe", "yuan": "üan", "yun": "ün", "wu": "u", "wa": "ua", "wo": "uo", "wai": "uai",
         "wei": "uei", "wan": "uan", "wen": "uen", "wang": "uang", "weng": "ueng"}
PY_MARKS = {"̄": 1, "́": 2, "̌": 3, "̀": 4}


def py_syllable(syl: str) -> str | None:
    s = unicodedata.normalize("NFD", syl.lower().replace("u:", "ü").replace("v", "ü"))
    s = re.sub(r"[1-5]$", "", "".join(c for c in s if c not in PY_MARKS))
    s = unicodedata.normalize("NFC", s)
    if s in ("r", "er") and s == "r":
        return "ɻ"
    onset = ""
    if s in PY_YW:
        fin = PY_YW[s]
        glide = {"y": "j", "w": "w"}[s[0]] if s not in ("yi", "wu", "yu", "yue", "yuan", "yun", "yin", "ying") else ""
        if glide and fin in PY_FIN:
            core = PY_FIN[fin]
            return glide + re.sub(r"^[iu]̯", "", core).replace("a", "ä", 1) if core.startswith(("i̯", "u̯")) else glide + core
    else:
        fin = s
        for a, b in PY_INIT:
            if s.startswith(a):
                onset, fin = b, s[len(a):]
                break
        if onset in ("t͡ɕ", "t͡ɕʰ", "ɕ") and fin.startswith("u"):
            fin = "ü" + fin[1:]
        if fin == "i" and onset in ("t͡s", "t͡sʰ", "s"):
            return onset + "z̩"
        if fin == "i" and onset == "ʐ":
            return "ʐ̩"
        if fin == "i" and onset in ("ʈ͡ʂ", "ʈ͡ʂʰ", "ʂ"):
            return onset + "ʐ̩"
    if fin == "o" and onset not in ("p", "pʰ", "m", "f"):
        return onset + "o" if onset == "" else None
    if fin not in PY_FIN:
        return None
    return onset + PY_FIN[fin].replace("a", "ä") if PY_FIN[fin] in ("a", "i̯a", "u̯a") else onset + PY_FIN[fin]


def py_valid() -> set[str]:
    out = set(PY_YW)
    for a, _ in PY_INIT:
        for f in PY_FIN:
            out.add(a + f)
    out.update(PY_FIN)
    out.update({"r", "zhi", "chi", "shi", "ri", "zi", "ci", "si", "ju", "qu", "xu", "jue", "que", "xue", "juan", "quan", "xuan", "jun", "qun", "xun", "lü", "nü", "lüe", "nüe"})
    return out


PY_VALID = py_valid()


def py_split(word: str) -> list[str] | None:
    d = unicodedata.normalize("NFD", word.lower())
    marks = []
    plain = []
    for c in d:
        if c in PY_MARKS:
            if plain:
                marks.append(len(plain) - 1)
            continue
        if c == "\u0308":
            plain[-1] = "ü"
            continue
        plain.append(c)
    base = "".join(plain)
    n = len(base)
    best: list[list[str] | None] = [None] * (n + 1)
    best[0] = []
    for i in range(n):
        if best[i] is None:
            continue
        for j in range(min(n, i + 6), i, -1):
            piece = base[i:j]
            if piece in PY_VALID and (best[j] is None or len(best[j]) > len(best[i]) + 1):
                nxt = base[j:j + 1]
                if nxt and nxt in "aeiouü" and piece[-1] in "ngr" and j < n:
                    continue
                best[j] = best[i] + [piece]
    return best[n]


def py_ipa(pinyin: str) -> str | None:
    out = []
    pieces: list[str] = []
    for chunk in re.split(r"[\s'’\-]+", pinyin):
        if not chunk:
            continue
        if re.search(r"\d", chunk):
            pieces.append(chunk)
            continue
        sp = py_split(chunk)
        if sp is None:
            return None
        pieces.extend(sp)
    for syl in pieces:
        if not re.search(r"[a-zü]", syl.lower()):
            continue
        x = py_syllable(syl)
        if x is None:
            return None
        out.append(x)
    return "/" + " ".join(out) + "/" if out else None


PY_TONE_VOWEL = {"a": "āáǎà", "e": "ēéěè", "i": "īíǐì", "o": "ōóǒò", "u": "ūúǔù", "ü": "ǖǘǚǜ"}


def py_marks(numbered: str) -> str:
    out = []
    for syl in numbered.split():
        m = re.match(r"^([a-zü:]+)([1-5])$", syl.lower().replace("u:", "ü"))
        if not m:
            out.append(syl)
            continue
        base, tone = m.group(1), int(m.group(2))
        if tone == 5:
            out.append(base)
            continue
        idx = next((base.index(v) for v in "ae" if v in base), None)
        if idx is None:
            idx = base.index("o") if "ou" in base else max((base.rfind(v) for v in "iouü"), default=-1)
        if idx < 0:
            out.append(base)
            continue
        out.append(base[:idx] + PY_TONE_VOWEL[base[idx]][tone - 1] + base[idx + 1:])
    return " ".join(out)


TA_V = {"அ": "a", "ஆ": "A", "இ": "i", "ஈ": "I", "உ": "u", "ஊ": "U", "எ": "e", "ஏ": "E", "ஐ": "ai", "ஒ": "o", "ஓ": "O", "ஔ": "au"}
TA_M = {"ா": "A", "ி": "i", "ீ": "I", "ு": "u", "ூ": "U", "ெ": "e", "ே": "E", "ை": "ai", "ொ": "o", "ோ": "O", "ௌ": "au"}
TA_C = {"க": "k", "ங": "ŋ", "ச": "c", "ஞ": "ɲ", "ட": "ʈ", "ண": "ɳ", "த": "t", "ந": "n̪", "ப": "p", "ம": "m", "ய": "j", "ர": "ɾ", "ல": "l",
        "வ": "ʋ", "ழ": "ɻ", "ள": "ɭ", "ற": "r", "ன": "n", "ஜ": "d͡ʑ", "ஷ": "ʂ", "ஸ": "s", "ஹ": "h"}
TA_VIPA = {"a": "ɐ", "A": "aː", "i": "ɪ", "I": "iː", "u": "ʊ", "U": "uː", "e": "ɛ", "E": "eː", "ai": "ɐj", "o": "o", "O": "oː", "au": "ɐʋ"}
TA_ISO_V = {"a": "a", "A": "ā", "i": "i", "I": "ī", "u": "u", "U": "ū", "e": "e", "E": "ē", "ai": "ai", "o": "o", "O": "ō", "au": "au"}
TA_ISO_C = {"க": "k", "ங": "ṅ", "ச": "c", "ஞ": "ñ", "ட": "ṭ", "ண": "ṇ", "த": "t", "ந": "n", "ப": "p", "ம": "m", "ய": "y", "ர": "r", "ல": "l",
            "வ": "v", "ழ": "ḻ", "ள": "ḷ", "ற": "ṟ", "ன": "ṉ", "ஜ": "j", "ஷ": "ṣ", "ஸ": "s", "ஹ": "h"}


def ta_units(word: str) -> list[tuple[str, str, str]] | None:
    out = []
    i = 0
    while i < len(word):
        c = word[i]
        nx = word[i + 1] if i + 1 < len(word) else ""
        if c in TA_C:
            if nx == "்":
                out.append(("C", c, ""))
                i += 2
                continue
            out.append(("C", c, ""))
            if nx in TA_M:
                out.append(("V", TA_M[nx], ""))
                i += 2
                continue
            out.append(("V", "a", ""))
            i += 1
            continue
        if c in TA_V:
            out.append(("V", TA_V[c], ""))
        elif c in " -":
            out.append(("S", " ", ""))
        elif c == "ஃ":
            out.append(("C", "ஃ", ""))
        else:
            return None
        i += 1
    return out


def ta_ipa(word: str) -> str | None:
    u = ta_units(word)
    if not u:
        return None
    out = []
    for k, (t, x, _) in enumerate(u):
        prev = u[k - 1] if k else None
        nxt = u[k + 1] if k + 1 < len(u) else None
        if t == "S":
            out.append(" ")
            continue
        if t == "V":
            out.append(TA_VIPA[x])
            continue
        if x == "ஃ":
            out.append("x")
            continue
        initial = prev is None or prev[0] == "S"
        gem = prev is not None and prev[0] == "C" and prev[1] == x
        if nxt is not None and nxt[0] == "C" and nxt[1] == x and x in "கசடதபற":
            continue
        after_nasal = prev is not None and prev[0] == "C" and prev[1] in "ஙஞணநமன"
        if x == "க":
            s = "kː" if gem else "k" if initial or (prev and prev[0] == "C" and not after_nasal) else "ɡ" if after_nasal else "ɡ"
        elif x == "ச":
            s = "t͡ɕː" if gem else "t͡ɕ" if initial else "d͡ʑ" if after_nasal else "t͡ɕ" if prev and prev[0] == "C" else "s"
        elif x == "ட":
            s = "ʈː" if gem else "ɖ" if not initial else "ʈ"
            if prev and prev[0] == "C" and not after_nasal and not gem:
                s = "ʈ"
        elif x == "த":
            s = "t̪ː" if gem else "t̪" if initial or (prev and prev[0] == "C" and not after_nasal) else "d̪"
        elif x == "ப":
            s = "pː" if gem else "p" if initial or (prev and prev[0] == "C" and not after_nasal) else "b"
        elif x == "ற":
            s = "tr" if gem else "r"
        elif x == "ந":
            s = "n̪"
        else:
            s = TA_C[x]
        out.append(s)
    return "/" + "".join(out).strip() + "/"


def ta_iso(word: str) -> str | None:
    u = ta_units(word)
    if not u:
        return None
    out = []
    for t, x, _ in u:
        if t == "S":
            out.append(" ")
        elif t == "V":
            out.append(TA_ISO_V[x])
        elif x == "ஃ":
            out.append("ḵ")
        else:
            out.append(TA_ISO_C[x])
    return "".join(out)


TH_RTGS_C = [("t͡ɕʰ", "ch"), ("t͡ɕ", "ch"), ("pʰ", "ph"), ("tʰ", "th"), ("kʰ", "kh"), ("ŋ", "ng"), ("ʔ", ""), ("j", "y"), ("ɓ", "b"), ("ɗ", "d")]
TH_RTGS_V = [("ɯa", "uea"), ("ia", "ia"), ("ua", "ua"), ("ɯ", "ue"), ("ɤ", "oe"), ("ɛ", "ae"), ("ɔ", "o")]
TH_FINAL = {"k": "k", "t": "t", "p": "p", "j": "i", "w": "o", "ʔ": ""}


def th_rtgs(ipa: str) -> str | None:
    s = re.sub(r"[˥˦˧˨˩ːˑ/\[\]ˈˌ̀-ͯ]", "", unicodedata.normalize("NFD", ipa.split(",")[0].split("~")[0]))
    out = []
    for syl in re.split(r"[.\s]+", s):
        if not syl:
            continue
        r = syl
        m = re.search(r"([kptjwʔ])$", r)
        tail = ""
        if m and len(r) > 1:
            fin = m.group(1)
            core = r[:-1]
            if fin in "jw" and core[-1:] in ("a", "e", "o", "u", "i", "ɛ", "ɔ", "ɤ", "ɯ"):
                tail = TH_FINAL[fin] if not (fin == "w" and core[-1:] in "ie") else "o" if fin == "w" and core[-1:] == "e" else "u"
                if fin == "w" and core[-1:] == "i":
                    tail = "u"
                if fin == "j" and core[-1:] in ("u", "ɔ", "ɤ"):
                    tail = "i"
            else:
                tail = TH_FINAL[fin]
            r = core
        for a, b in TH_RTGS_C:
            r = r.replace(a, b)
        for a, b in TH_RTGS_V:
            r = r.replace(a, b)
        out.append(r + tail)
    res = "".join(out)
    return res if res and re.fullmatch(r"[a-z]+", res) else None
