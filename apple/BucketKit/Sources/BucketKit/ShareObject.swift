import Foundation

public struct ShareRoute: Sendable, Equatable {
    public static let host = "www.bucket.foundation"

    public var path: String
    public var items: [URLQueryItem]

    public init(path: String, items: [URLQueryItem] = []) {
        self.path = path
        self.items = items
    }

    public var url: URL {
        var c = URLComponents()
        c.scheme = "https"
        c.host = Self.host
        c.path = "/s" + path
        c.queryItems = items.isEmpty ? nil : items
        return c.url ?? URL(string: "https://\(Self.host)/s")!
    }

    public static func clip(_ s: String, _ n: Int) -> String {
        s.count <= n ? s : String(s.prefix(n - 1)) + "…"
    }

    public static func word(id: String, gloss: String, forms: [ShareForm]) -> ShareRoute {
        let shown = forms.prefix(6).map { "\($0.lang):\(clip($0.form.replacingOccurrences(of: "|", with: "/"), 40))" }
        return ShareRoute(path: "/w", items: [
            URLQueryItem(name: "id", value: id),
            URLQueryItem(name: "g", value: clip(gloss, 60)),
            URLQueryItem(name: "f", value: shown.joined(separator: "|")),
        ])
    }

    public static func langs(_ targets: [String], root: String, streak: Int = 0) -> ShareRoute {
        var items = [URLQueryItem(name: "l", value: targets.prefix(8).joined(separator: ".")), URLQueryItem(name: "r", value: root)]
        if streak > 1 { items.append(URLQueryItem(name: "s", value: String(streak))) }
        return ShareRoute(path: "/l", items: items)
    }

    public static func deck(id: String, title: String) -> ShareRoute {
        ShareRoute(path: "/d", items: [URLQueryItem(name: "id", value: id), URLQueryItem(name: "t", value: clip(title, 80))])
    }

    public static func atom(deck: String, deckTitle: String, id: String, title: String, summary: String) -> ShareRoute {
        ShareRoute(path: "/a", items: [
            URLQueryItem(name: "d", value: deck),
            URLQueryItem(name: "id", value: id),
            URLQueryItem(name: "t", value: clip(title, 80)),
            URLQueryItem(name: "b", value: clip(deckTitle, 60)),
            URLQueryItem(name: "q", value: clip(summary, 160)),
        ])
    }

    public static func score(_ s: ShareScore) -> ShareRoute {
        var items = [
            URLQueryItem(name: "t", value: clip(s.source, 60)),
            URLQueryItem(name: "p", value: String(s.right)),
            URLQueryItem(name: "m", value: String(s.total)),
        ]
        if !s.langs.isEmpty {
            items.append(URLQueryItem(name: "l", value: s.langs.prefix(8).joined(separator: ".")))
            items.append(URLQueryItem(name: "r", value: s.root))
        }
        if s.streak > 1 { items.append(URLQueryItem(name: "s", value: String(s.streak))) }
        return ShareRoute(path: "/x", items: items)
    }

    public static func moment(_ m: ShareMoment) -> ShareRoute {
        if let deck = m.deck, let atom = m.atom {
            return Self.atom(deck: deck, deckTitle: m.source, id: atom, title: m.title, summary: m.quote ?? "")
        }
        var items = [URLQueryItem(name: "t", value: clip(m.title, 80)), URLQueryItem(name: "b", value: clip(m.source, 60))]
        if let q = m.quote { items.append(URLQueryItem(name: "q", value: clip(q, 160))) }
        if let l = m.lang { items.append(URLQueryItem(name: "l", value: l)) }
        if let at = m.seconds { items.append(URLQueryItem(name: "at", value: String(at))) }
        if let topic = m.topic { items.append(URLQueryItem(name: "id", value: clip(topic, 80))) }
        return ShareRoute(path: "/c", items: items)
    }
}

public struct ShareForm: Sendable, Hashable {
    public var lang: String
    public var form: String

    public init(lang: String, form: String) {
        self.lang = lang
        self.form = form
    }
}

public struct ShareScore: Sendable, Hashable {
    public var source: String
    public var right: Int
    public var total: Int
    public var langs: [String]
    public var root: String
    public var streak: Int

    public init(source: String, right: Int, total: Int, langs: [String] = [], root: String = "en", streak: Int = 0) {
        self.source = source
        self.right = max(0, right)
        self.total = max(0, total)
        self.langs = langs
        self.root = root
        self.streak = streak
    }

    public var percent: Int { total > 0 ? Int((Double(right) / Double(total) * 100).rounded()) : 0 }
}

public struct ShareMoment: Sendable, Hashable {
    public var title: String
    public var source: String
    public var branch: String
    public var lang: String?
    public var quote: String?
    public var seconds: Int?
    public var deck: String?
    public var atom: String?
    public var topic: String?

    public init(title: String, source: String, branch: String, lang: String? = nil, quote: String? = nil, seconds: Int? = nil, deck: String? = nil, atom: String? = nil, topic: String? = nil) {
        self.title = title
        self.source = source
        self.branch = branch
        self.lang = lang
        self.quote = quote.flatMap { Self.excerpt($0) }
        self.seconds = seconds.flatMap { $0 >= 0 ? $0 : nil }
        self.deck = deck
        self.atom = atom
        self.topic = topic
    }

    public var clock: String? { seconds.map { Self.timecode($0) } }

    public static func timecode(_ seconds: Int) -> String {
        let s = max(0, seconds)
        let tail = String(format: "%02d", s % 60)
        return s >= 3600 ? "\(s / 3600):" + String(format: "%02d", s / 60 % 60) + ":\(tail)" : "\(s / 60):\(tail)"
    }

    public static func excerpt(_ text: String, limit: Int = 200) -> String? {
        let flat = text.filter { !"*`$\\_".contains($0) }.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        guard !flat.isEmpty else { return nil }
        var first = ""
        flat.enumerateSubstrings(in: flat.startIndex..., options: [.bySentences, .localized]) { s, _, _, stop in
            first = s?.trimmingCharacters(in: .whitespaces) ?? ""
            stop = true
        }
        return ShareRoute.clip(first.isEmpty ? flat : first, limit)
    }
}

public enum ShareStyle: String, Sendable, Hashable, CaseIterable, Identifiable {
    case flame, hundred, ledger, tree, wall, banner, plate, stack, tile, number, ring, quote, cover, moment

    public var id: String { rawValue }
}

public enum ShareObject: Sendable, Hashable, Identifiable {
    case streak(days: Int, langs: [String], root: String)
    case system(name: String, root: String, targets: [String], streak: Int, learned: Int)
    case language(String, root: String)
    case word(id: String, gloss: String, forms: [ShareForm])
    case tile(form: ShareForm, gloss: String, reading: String?)
    case flag(String, root: String)
    case score(ShareScore)
    case content(ShareMoment)

    public var id: String { "\(kind):\(route.url.absoluteString)" }

    public var kind: String {
        switch self {
        case .streak: "streak"
        case .system: "system"
        case .language: "language"
        case .word: "word"
        case .tile: "tile"
        case .flag: "flag"
        case .score: "score"
        case .content: "content"
        }
    }

    public var route: ShareRoute {
        switch self {
        case .streak(let days, let langs, let root): .langs(langs, root: root, streak: days)
        case .system(_, let root, let targets, let streak, _): .langs(targets, root: root, streak: streak)
        case .language(let lang, let root), .flag(let lang, let root): .langs([lang], root: root)
        case .word(let id, let gloss, let forms): .word(id: id, gloss: gloss, forms: forms)
        case .tile(let form, let gloss, _): .word(id: form.form, gloss: gloss, forms: [form])
        case .score(let s): .score(s)
        case .content(let m): .moment(m)
        }
    }

    public var styles: [ShareStyle] {
        switch self {
        case .streak: [.flame, .hundred, .ledger]
        case .system: [.tree, .wall, .ledger]
        case .language: [.banner, .plate]
        case .word(_, _, let forms): forms.count > 1 ? [.stack, .wall, .tile] : [.tile, .stack]
        case .tile: [.tile, .banner]
        case .flag: [.banner, .plate]
        case .score: [.number, .ring]
        case .content(let m): (m.seconds != nil ? [.moment] : []) + (m.quote != nil ? [.quote] : []) + [.cover]
        }
    }
}
