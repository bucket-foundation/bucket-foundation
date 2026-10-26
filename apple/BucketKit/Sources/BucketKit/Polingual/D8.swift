import Foundation

public struct D8Flag: Sendable, Equatable {
    public enum Layout: Sendable, Equatable { case horizontal, vertical }
    public struct Canton: Sendable, Equatable {
        public let color: UInt32
        public let width: Double
        public let height: Double
    }
    public struct Emblem: Sendable, Equatable {
        public let glyph: String
        public let color: UInt32
        public let scale: Double
        public let x: Double
        public let y: Double
    }

    public let bands: [(color: UInt32, weight: Double)]
    public let layout: Layout
    public var canton: Canton?
    public var cross: UInt32?
    public var hoist: UInt32?
    public var emblem: Emblem?
    public var pigment = false

    public static func == (a: D8Flag, b: D8Flag) -> Bool {
        a.bands.map(\.color) == b.bands.map(\.color) && a.bands.map(\.weight) == b.bands.map(\.weight) && a.layout == b.layout
            && a.canton == b.canton && a.cross == b.cross && a.hoist == b.hoist && a.emblem == b.emblem && a.pigment == b.pigment
    }

    static func h(_ c: UInt32...) -> D8Flag { D8Flag(bands: c.map { ($0, 1) }, layout: .horizontal) }
    static func v(_ c: UInt32...) -> D8Flag { D8Flag(bands: c.map { ($0, 1) }, layout: .vertical) }
    static func field(_ c: UInt32, _ glyph: String, _ ec: UInt32, scale: Double = 0.55, x: Double = 0.5, y: Double = 0.5) -> D8Flag {
        var f = D8Flag(bands: [(c, 1)], layout: .horizontal)
        f.emblem = Emblem(glyph: glyph, color: ec, scale: scale, x: x, y: y)
        return f
    }
    static func pigment(_ c: UInt32, _ glyph: String) -> D8Flag {
        var f = field(c, glyph, 0xF6EEDC, scale: 0.5)
        f.pigment = true
        return f
    }
    func with(_ edit: (inout D8Flag) -> Void) -> D8Flag {
        var f = self
        edit(&f)
        return f
    }

    public static let table: [String: D8Flag] = [
        "en": D8Flag(bands: (0..<13).map { ($0.isMultiple(of: 2) ? 0xB22234 : 0xFFFFFF, 1) }, layout: .horizontal).with { $0.canton = Canton(color: 0x3C3B6E, width: 0.42, height: 0.54) },
        "es": D8Flag(bands: [(0xAA151B, 1), (0xF1BF00, 2), (0xAA151B, 1)], layout: .horizontal),
        "fr": v(0x002654, 0xFFFFFF, 0xCE1126),
        "it": v(0x008C45, 0xF4F5F0, 0xCD212A),
        "pt": D8Flag(bands: [(0x006600, 2), (0xFF0000, 3)], layout: .vertical).with { $0.emblem = Emblem(glyph: "●", color: 0xFFE600, scale: 0.36, x: 0.4, y: 0.5) },
        "de": h(0x000000, 0xDD0000, 0xFFCE00),
        "nl": h(0xAE1C28, 0xFFFFFF, 0x21468B),
        "sv": D8Flag(bands: [(0x006AA7, 1)], layout: .horizontal).with { $0.cross = 0xFECC00 },
        "pl": h(0xFFFFFF, 0xDC143C),
        "fi": D8Flag(bands: [(0xFFFFFF, 1)], layout: .horizontal).with { $0.cross = 0x002F6C },
        "ru": h(0xFFFFFF, 0x0039A6, 0xD52B1E),
        "el": D8Flag(bands: (0..<9).map { ($0.isMultiple(of: 2) ? 0x0D5EAF : 0xFFFFFF, 1) }, layout: .horizontal).with {
            $0.canton = Canton(color: 0x0D5EAF, width: 0.4, height: 0.555)
            $0.emblem = Emblem(glyph: "✚", color: 0xFFFFFF, scale: 0.4, x: 0.2, y: 0.28)
        },
        "ar": pigment(0x5B1A4A, "ع"),
        "hi": h(0xFF9933, 0xFFFFFF, 0x138808).with { $0.emblem = Emblem(glyph: "☸", color: 0x000080, scale: 0.3, x: 0.5, y: 0.5) },
        "ja": field(0xFFFFFF, "●", 0xBC002D, scale: 0.6),
        "zh": field(0xEE1C25, "★", 0xFFDE00, scale: 0.3, x: 0.24, y: 0.26),
        "ko": field(0xFFFFFF, "☯", 0xCD2E3A, scale: 0.5),
        "he": D8Flag(bands: [(0xFFFFFF, 14), (0x0038B8, 12), (0xFFFFFF, 48), (0x0038B8, 12), (0xFFFFFF, 14)], layout: .horizontal).with {
            $0.emblem = Emblem(glyph: "✡", color: 0x0038B8, scale: 0.38, x: 0.5, y: 0.5)
        },
        "fa": h(0x239F40, 0xFFFFFF, 0xDA0000),
        "tr": field(0xE30A17, "☾", 0xFFFFFF, scale: 0.5, x: 0.42, y: 0.5),
        "cs": h(0xFFFFFF, 0xD7141A).with { $0.hoist = 0x11457E },
        "id": h(0xFF0000, 0xFFFFFF),
        "vi": field(0xDA251D, "★", 0xFFFF00, scale: 0.55),
        "th": D8Flag(bands: [(0xA51931, 1), (0xF4F5F8, 1), (0x2D2A4A, 2), (0xF4F5F8, 1), (0xA51931, 1)], layout: .horizontal),
        "ta": h(0xFF9933, 0xFFFFFF, 0x138808).with { $0.emblem = Emblem(glyph: "☸", color: 0x000080, scale: 0.3, x: 0.5, y: 0.5) },
        "la": pigment(0xC8952C, "L"),
        "grc": pigment(0x1F4E9A, "Ω"),
        "sa": pigment(0x1E7A5A, "ॐ"),
        "ang": pigment(0xD9381E, "ᚠ"),
    ]

    public static func of(_ lang: String) -> D8Flag { table[lang] ?? pigment(0x5d5650, String(lang.prefix(2)).uppercased()) }
}

public enum D8Fit {
    public static func wide(_ text: String) -> Bool { text.contains(" ") || text.count > 12 }
    public static func long(_ text: String) -> Bool { text.count > 7 }
}

public func crossLanguageOptions(_ ex: Exercise, _ item: LangItem, _ system: LangSystem, _ rng: inout Rng) -> Exercise {
    guard ex.kind == .choose, let same = ex.options else { return ex }
    var seen = Set([ex.answer] + (ex.accept ?? []))
    var langs: [String: String] = [ex.answer: ex.answerLang]
    var picks: [String] = []
    for l in shuffle(system.targets.filter { $0 != ex.answerLang }, &rng) {
        guard picks.count < 3, let f = item.form(l), !seen.contains(f) else { continue }
        seen.insert(f)
        langs[f] = l
        picks.append(f)
    }
    guard !picks.isEmpty else { return ex }
    for o in same where picks.count < 3 && !seen.contains(o) {
        seen.insert(o)
        langs[o] = ex.answerLang
        picks.append(o)
    }
    var out = ex
    out.options = shuffle([ex.answer] + picks, &rng)
    out.optionLangs = langs
    return out
}

public func correctArticle(_ ex: Exercise, _ rng: inout Rng) -> Exercise {
    guard ex.kind == .gender, ["it", "fr"].contains(ex.lang), let options = ex.options else { return ex }
    let gender = Lang.articles[ex.lang]?.first { $0.1 == ex.answer }?.0 ?? "m"
    guard let article = Lang.contextualArticle(ex.lang, gender, ex.prompt) else { return ex }
    var out = ex
    out.answer = article
    out.accept = [article]
    out.options = shuffle(unique(options + (ex.lang == "it" ? ["lo", "l'"] : ["l'"])), &rng)
    let elided = article.hasSuffix("'")
    out.cloze = ("", elided ? ex.prompt : " \(ex.prompt)")
    out.note = elided ? "Before a vowel the article shortens to \(article): \(article)\(ex.prompt)." : "\(article) \(ex.prompt)"
    return out
}
