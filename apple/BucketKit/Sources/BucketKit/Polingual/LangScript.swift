import Foundation

public enum MarkPolicy: String, Sendable { case strip, lenient, keep }

public struct ScriptInfo: Sendable {
    public let script: String
    public let title: String
    public let marks: MarkPolicy
    public var width = false
}

public struct Letter: Sendable, Equatable {
    public let ch: String
    public let sound: String
}

public struct AlphabetUnit: Sendable {
    public let id: String
    public let lang: String
    public let script: String
    public let title: String
    public let letters: [Letter]
}

extension Character {
    var isMark: Bool { unicodeScalars.allSatisfy { $0.properties.generalCategory == .nonspacingMark || $0.properties.generalCategory == .enclosingMark } }
}

public enum LangScript {
    public static let scripts: [String: ScriptInfo] = [
        "ru": ScriptInfo(script: "cyrillic", title: "Cyrillic alphabet", marks: .strip),
        "el": ScriptInfo(script: "greek", title: "Greek alphabet", marks: .lenient),
        "grc": ScriptInfo(script: "greek-ancient", title: "Ancient Greek alphabet", marks: .lenient),
        "ar": ScriptInfo(script: "arabic", title: "Arabic alphabet", marks: .strip),
        "fa": ScriptInfo(script: "persian", title: "Persian alphabet", marks: .strip),
        "he": ScriptInfo(script: "hebrew", title: "Hebrew alef-bet", marks: .strip),
        "hi": ScriptInfo(script: "devanagari", title: "Devanagari", marks: .keep),
        "sa": ScriptInfo(script: "devanagari-sanskrit", title: "Devanagari for Sanskrit", marks: .keep),
        "ta": ScriptInfo(script: "tamil", title: "Tamil script", marks: .keep),
        "th": ScriptInfo(script: "thai", title: "Thai consonants", marks: .keep),
        "ja": ScriptInfo(script: "hiragana", title: "Hiragana", marks: .keep, width: true),
        "zh": ScriptInfo(script: "zhuyin", title: "Zhuyin sounds", marks: .keep, width: true),
        "ko": ScriptInfo(script: "hangul", title: "Hangul letters", marks: .keep, width: true),
    ]

    public static var heritageLangs: [String] { Array(scripts.keys) }

    static let punct: Set<Unicode.Scalar> = Set(".,;:!?¿¡\"'«»()-־،؟。、！？".unicodeScalars)

    static func isArabicMark(_ v: UInt32) -> Bool { (0x064B...0x0670).contains(v) || v == 0x065F || (0x06D6...0x06ED).contains(v) || v == 0x0640 }

    static func isHebrewMark(_ v: UInt32) -> Bool { (0x0591...0x05C7).contains(v) }

    public static func foldableMarks(_ s: String) -> String {
        var out = String.UnicodeScalarView()
        var prev: Unicode.Scalar?
        for c in s.unicodeScalars {
            let v = c.value
            let afterCyrillic = prev.map { (0x0400...0x04FF).contains($0.value) } ?? false
            let drop = ((v == 0x0306 || v == 0x0308) && !afterCyrillic) || (0x0300...0x0305).contains(v) || v == 0x0307 || (0x0309...0x036F).contains(v)
            if !drop { out.append(c) }
            prev = c
        }
        return String(out)
    }

    static func base(_ s: String, _ lang: String) -> String {
        let n = scripts[lang]?.width == true ? s.precomposedStringWithCompatibilityMapping : s.precomposedStringWithCanonicalMapping
        var out = String.UnicodeScalarView()
        var gap = false
        for c in jsLowercased(n).unicodeScalars {
            if c.properties.isWhitespace || punct.contains(c) {
                gap = true
                continue
            }
            if gap && !out.isEmpty { out.append(" ") }
            gap = false
            out.append(c)
        }
        return String(out)
    }

    public static func jsLowercased(_ s: String) -> String {
        let chars = Array(s)
        var out = ""
        for (i, c) in chars.enumerated() {
            if c == "Σ" {
                let before = chars[..<i].last(where: { !$0.isMark })?.isLetter ?? false
                let after = chars[(i + 1)...].first(where: { !$0.isMark })?.isLetter ?? false
                out.append(before && !after ? "ς" : "σ")
            } else {
                out += c.lowercased()
            }
        }
        return out
    }

    public static func foldMarks(_ s: String, _ lang: String) -> String {
        var t = base(s, lang)
        if lang == "ar" || lang == "fa" { t = String(String.UnicodeScalarView(t.unicodeScalars.filter { !isArabicMark($0.value) })) }
        if lang == "fa" { t = t.replacingOccurrences(of: "ي", with: "ی").replacingOccurrences(of: "ك", with: "ک") }
        if lang == "he" { t = String(String.UnicodeScalarView(t.unicodeScalars.filter { !isHebrewMark($0.value) })) }
        if lang == "ru" { t = t.replacingOccurrences(of: "ё", with: "е") }
        if scripts[lang]?.marks != .keep { t = foldableMarks(t.decomposedStringWithCanonicalMapping).precomposedStringWithCanonicalMapping }
        return t
    }

    public static func distance(_ a: String, _ b: String) -> Int {
        let x = Array(a.unicodeScalars)
        let y = Array(b.unicodeScalars)
        if x.isEmpty { return y.count }
        if y.isEmpty { return x.count }
        var prev = Array(0...y.count)
        for i in 1...x.count {
            var row = [i] + Array(repeating: 0, count: y.count)
            for j in 1...y.count {
                row[j] = min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (x[i - 1] == y[j - 1] ? 0 : 1))
            }
            prev = row
        }
        return prev[y.count]
    }

    public static func judgeSpelled(_ given: String, _ expected: [String], _ lang: String) -> Verdict {
        let g = base(given, lang)
        guard !g.isEmpty else { return .wrong }
        let policy = scripts[lang]?.marks ?? .keep
        var best = Verdict.wrong
        for exp in expected {
            if g == base(exp, lang) { return .exact }
            let gf = foldMarks(given, lang)
            let ef = foldMarks(exp, lang)
            if gf == ef {
                if policy == .strip { return .exact }
                best = .close
                continue
            }
            if ef.unicodeScalars.count >= 4 && distance(gf, ef) <= 1 { best = .close }
        }
        return best
    }

    static let devanagari = "अ=a आ=ā इ=i ई=ī उ=u ऊ=ū ऋ=ṛ ए=e ऐ=ai ओ=o औ=au क=ka ख=kha ग=ga घ=gha ङ=ṅa च=ca छ=cha ज=ja झ=jha ञ=ña ट=ṭa ठ=ṭha ड=ḍa ढ=ḍha ण=ṇa त=ta थ=tha द=da ध=dha न=na प=pa फ=pha ब=ba भ=bha म=ma य=ya र=ra ल=la व=va श=śa ष=ṣa स=sa ह=ha"

    static let letters: [String: String] = [
        "ru": "а=a б=b в=v г=g д=d е=ye ё=yo ж=zh з=z и=i й=y к=k л=l м=m н=n о=o п=p р=r с=s т=t у=u ф=f х=kh ц=ts ч=ch ш=sh щ=shch ъ=hard-sign ы=y ь=soft-sign э=e ю=yu я=ya",
        "el": "α=a β=v γ=gh δ=dh ε=e ζ=z η=i θ=th ι=i κ=k λ=l μ=m ν=n ξ=ks ο=o π=p ρ=r σ=s τ=t υ=i φ=f χ=kh ψ=ps ω=o",
        "grc": "α=a β=b γ=g δ=d ε=e ζ=zd η=ē θ=tʰ ι=i κ=k λ=l μ=m ν=n ξ=ks ο=o π=p ρ=r σ=s τ=t υ=y φ=pʰ χ=kʰ ψ=ps ω=ō",
        "ar": "ا=ā ب=b ت=t ث=th ج=j ح=ḥ خ=kh د=d ذ=dh ر=r ز=z س=s ش=sh ص=ṣ ض=ḍ ط=ṭ ظ=ẓ ع=ʿ غ=gh ف=f ق=q ك=k ل=l م=m ن=n ه=h و=w ي=y",
        "fa": "ا=ā ب=b پ=p ت=t ث=s ج=j چ=ch ح=h خ=kh د=d ذ=z ر=r ز=z ژ=zh س=s ش=sh ص=s ض=z ط=t ظ=z ع=ʔ غ=gh ف=f ق=gh ک=k گ=g ل=l م=m ن=n و=v ه=h ی=y",
        "he": "א=silent ב=b/v ג=g ד=d ה=h ו=v ז=z ח=kh ט=t י=y כ=k/kh ל=l מ=m נ=n ס=s ע=silent פ=p/f צ=ts ק=k ר=r ש=sh/s ת=t",
        "hi": devanagari,
        "sa": devanagari.replacingOccurrences(of: "ऋ=ṛ", with: "ऋ=ṛ ॠ=ṝ ऌ=ḷ"),
        "ta": "அ=a ஆ=ā இ=i ஈ=ī உ=u ஊ=ū எ=e ஏ=ē ஐ=ai ஒ=o ஓ=ō ஔ=au க=ka ங=ṅa ச=ca ஞ=ña ட=ṭa ண=ṇa த=ta ந=na ப=pa ம=ma ய=ya ர=ra ல=la வ=va ழ=ḻa ள=ḷa ற=ṟa ன=ṉa",
        "th": "ก=k ข=kh ฃ=kh ค=kh ฅ=kh ฆ=kh ง=ng จ=ch ฉ=ch ช=ch ซ=s ฌ=ch ญ=y ฎ=d ฏ=t ฐ=th ฑ=th ฒ=th ณ=n ด=d ต=t ถ=th ท=th ธ=th น=n บ=b ป=p ผ=ph ฝ=f พ=ph ฟ=f ภ=ph ม=m ย=y ร=r ล=l ว=w ศ=s ษ=s ส=s ห=h ฬ=l อ=ʔ ฮ=h",
        "ja": "あ=a い=i う=u え=e お=o か=ka き=ki く=ku け=ke こ=ko さ=sa し=shi す=su せ=se そ=so た=ta ち=chi つ=tsu て=te と=to な=na に=ni ぬ=nu ね=ne の=no は=ha ひ=hi ふ=fu へ=he ほ=ho ま=ma み=mi む=mu め=me も=mo や=ya ゆ=yu よ=yo ら=ra り=ri る=ru れ=re ろ=ro わ=wa を=wo ん=n",
        "zh": "ㄅ=b ㄆ=p ㄇ=m ㄈ=f ㄉ=d ㄊ=t ㄋ=n ㄌ=l ㄍ=g ㄎ=k ㄏ=h ㄐ=j ㄑ=q ㄒ=x ㄓ=zh ㄔ=ch ㄕ=sh ㄖ=r ㄗ=z ㄘ=c ㄙ=s ㄧ=i ㄨ=u ㄩ=ü ㄚ=a ㄛ=o ㄜ=e ㄝ=ê ㄞ=ai ㄟ=ei ㄠ=ao ㄡ=ou ㄢ=an ㄣ=en ㄤ=ang ㄥ=eng ㄦ=er",
        "ko": "ㄱ=g ㄴ=n ㄷ=d ㄹ=r/l ㅁ=m ㅂ=b ㅅ=s ㅇ=ng ㅈ=j ㅊ=ch ㅋ=k ㅌ=t ㅍ=p ㅎ=h ㅏ=a ㅑ=ya ㅓ=eo ㅕ=yeo ㅗ=o ㅛ=yo ㅜ=u ㅠ=yu ㅡ=eu ㅣ=i",
    ]

    public static func alphabetUnit(_ lang: String) -> AlphabetUnit? {
        guard let info = scripts[lang], let raw = letters[lang] else { return nil }
        let pairs = raw.split(separator: " ").map { p -> Letter in
            let parts = p.split(separator: "=", maxSplits: 1).map(String.init)
            return Letter(ch: parts[0], sound: parts.count > 1 ? parts[1] : "")
        }
        return AlphabetUnit(id: "alphabet-\(info.script)", lang: lang, script: info.script, title: info.title, letters: pairs)
    }

    public static func letterItemId(_ ch: String) -> String { "abc:\(ch)" }

    public static func letterCardId(_ lang: String, _ ch: String) -> String { "\(lang):\(letterItemId(ch))" }

    public static func nextLetters(_ state: EngineState, _ lang: String, n: Int = 5) -> [Letter] {
        guard let unit = alphabetUnit(lang) else { return [] }
        return Array(unit.letters.filter { !state.cards.has(letterCardId(lang, $0.ch)) }.prefix(n))
    }

    public static func dueLetters(_ state: EngineState, _ lang: String, now: Double) -> [Letter] {
        guard let unit = alphabetUnit(lang) else { return [] }
        return unit.letters.filter { l in
            guard let due = state.cards[letterCardId(lang, l.ch)]?.due else { return false }
            return due <= now
        }
    }

    public static func alphabetDone(_ state: EngineState, _ lang: String, share: Double = 0.8) -> Bool {
        guard let unit = alphabetUnit(lang) else { return true }
        let seen = unit.letters.filter { (state.cards[letterCardId(lang, $0.ch)]?.reps ?? 0) > 0 }.count
        return Double(seen) >= (Double(unit.letters.count) * share).rounded(.up)
    }
}

public func spellHeard(_ item: LangItem, _ lang: String, _ root: String, _ reading: Reading?) -> Exercise {
    let target = item.forms[lang] ?? ""
    var ex = Exercise(kind: .spellHeard, itemId: item.id, lang: lang, root: root, prompt: target, promptLang: lang, answer: target, answerLang: lang)
    ex.accept = [target]
    ex.promptReading = reading
    ex.answerReading = reading
    return ex
}

public func gradeSpelling(_ ex: Exercise, _ given: String, hesitated: Bool = false) -> (verdict: Verdict, rating: Rating) {
    let v = LangScript.judgeSpelled(given, ex.accept ?? [ex.answer], ex.answerLang)
    return (v, verdictRating(v, hesitated: hesitated))
}

public func letterExercise(_ lang: String, _ root: String, _ index: Int, _ rng: inout Rng) -> Exercise? {
    guard let unit = LangScript.alphabetUnit(lang), index >= 0, index < unit.letters.count else { return nil }
    let letter = unit.letters[index]
    let others = Array(shuffle(unit.letters.filter { $0.ch != letter.ch && $0.sound != letter.sound }, &rng).prefix(3)).map(\.ch)
    var ex = Exercise(kind: .letter, itemId: LangScript.letterItemId(letter.ch), lang: lang, root: root, prompt: letter.sound, promptLang: lang, answer: letter.ch, answerLang: lang, note: unit.title)
    ex.options = shuffle([letter.ch] + others, &rng)
    ex.promptReading = Reading(roman: letter.sound)
    return ex
}
