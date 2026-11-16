import Foundation

public struct PlayForm: Codable, Sendable, Equatable, Hashable {
    public let lang: String
    public let word: String
    public var ipa: String?
    public var roman: String?
    public var kana: String?

    public init(lang: String, word: String, ipa: String? = nil, roman: String? = nil, kana: String? = nil) {
        self.lang = lang
        self.word = word
        self.ipa = ipa
        self.roman = roman
        self.kana = kana
    }
}

public struct RootCluster: Codable, Sendable, Equatable, Hashable {
    public let root: String
    public let langs: [String]
}

public struct PlayWord: Codable, Sendable, Equatable, Hashable {
    public let slug: String
    public let en: String
    public let gloss: String
    public var category: String
    public var tier: Double
    public var note: String?
    public var roots: [RootCluster]
    public let forms: [PlayForm]

    enum CodingKeys: String, CodingKey { case slug, en, gloss, category, tier, note, roots, forms }

    public init(slug: String, en: String, gloss: String, category: String = "", tier: Double = 0, note: String? = nil, roots: [RootCluster] = [], forms: [PlayForm]) {
        self.slug = slug
        self.en = en
        self.gloss = gloss
        self.category = category
        self.tier = tier
        self.note = note
        self.roots = roots
        self.forms = forms
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        slug = try c.decode(String.self, forKey: .slug)
        en = try c.decode(String.self, forKey: .en)
        gloss = try c.decode(String.self, forKey: .gloss)
        category = try c.decodeIfPresent(String.self, forKey: .category) ?? ""
        tier = try c.decodeIfPresent(Double.self, forKey: .tier) ?? 0
        note = try c.decodeIfPresent(String.self, forKey: .note)
        roots = try c.decodeIfPresent([RootCluster].self, forKey: .roots) ?? []
        forms = try c.decode([PlayForm].self, forKey: .forms)
    }

    public func form(_ lang: String) -> PlayForm? { forms.first { $0.lang == lang } }
    public func root(_ lang: String) -> String? { roots.first { $0.langs.contains(lang) }?.root }
}

public struct HintForm: Codable, Sendable, Equatable, Hashable {
    public let word: String
    public var roman: String?

    public init(word: String, roman: String? = nil) {
        self.word = word
        self.roman = roman
    }
}

public struct BankWord: Codable, Sendable, Equatable {
    public let gloss: String
    public let forms: [String: HintForm]
}

public struct PolywordBank: Codable, Sendable, Equatable {
    public let targets: [String]
    public let reveal: [String]
    public let langs: [String: [String]]
    public let words: [String: BankWord]
}
