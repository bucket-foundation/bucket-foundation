import Foundation

public struct DeckIndex: Decodable, Sendable {
    public let version: String
    public let decks: [DeckEntry]
}

public struct DeckEntry: Decodable, Sendable, Identifiable, Hashable {
    public let id: String
    public let file: String
    public let pill: String
    public let sub: String?
    public let kind: String?

    public var title: String {
        guard let dot = pill.range(of: " · ") else { return pill }
        return String(pill[dot.upperBound...])
    }

    public var mark: String {
        guard let dot = pill.range(of: " · ") else { return "" }
        return String(pill[..<dot.lowerBound])
    }

    public var isLanguage: Bool { kind == "language" || id.hasPrefix("lang") }
}

public struct Deck: Decodable, Sendable {
    public let meta: DeckMeta
    public let atoms: [Atom]
}

public struct DeckMeta: Decodable, Sendable {
    public let branch: String
    public let title: String
    public let version: String?
    public let note: String?
}

public struct Atom: Decodable, Sendable, Identifiable, Hashable {
    public let id: String
    public let title: String
    public let type: String?
    public let requires: [String]
    public let equation: String?
    public let summary: String
    public let depths: [String: String]
    public let quiz: [QuizItem]
    public let lesson: String?
    public let shell: String?
    public let note: String?
    public let gloss: String?
    public internal(set) var leverage: Double?
    public internal(set) var unlocks: [String] = []

    enum CodingKeys: String, CodingKey { case id, title, type, requires, equation, summary, depths, quiz, lesson, shell, note, gloss, leverage }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decode(String.self, forKey: .title)
        type = try c.decodeIfPresent(String.self, forKey: .type)
        requires = try c.decodeIfPresent([String].self, forKey: .requires) ?? []
        equation = try c.decodeIfPresent(String.self, forKey: .equation)
        summary = try c.decodeIfPresent(String.self, forKey: .summary) ?? ""
        depths = try c.decodeIfPresent([String: String].self, forKey: .depths) ?? [:]
        quiz = try c.decodeIfPresent([QuizItem].self, forKey: .quiz) ?? []
        lesson = try c.decodeIfPresent(String.self, forKey: .lesson)
        shell = try c.decodeIfPresent(String.self, forKey: .shell)
        note = try c.decodeIfPresent(String.self, forKey: .note)
        gloss = try c.decodeIfPresent(String.self, forKey: .gloss)
        leverage = try c.decodeIfPresent(Double.self, forKey: .leverage)
    }

    public static let depthOrder = ["eli5", "core", "deep"]

    public var orderedDepths: [(key: String, text: String)] {
        Self.depthOrder.compactMap { k in depths[k].map { (k, $0) } }
    }
}

public struct QuizItem: Decodable, Sendable, Hashable {
    public let level: String
    public let prompt: String
    public let answer: String
}

public struct CanonSearch: Decodable, Sendable {
    public let query: String
    public let results: [CanonHit]
}

public struct CanonHit: Decodable, Sendable, Identifiable, Hashable {
    public let claimId: Int
    public let branch: String
    public let concept: String
    public let title: String
    public let url: URL?
    public let excerpt: String
    public let evidenceCount: Int?

    public var id: Int { claimId }

    enum CodingKeys: String, CodingKey {
        case claimId = "claim_id", branch, concept, title, url, excerpt, evidenceCount = "evidence_count"
    }
}

public struct Session: Codable, Sendable, Equatable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresAt: Int
    public let userId: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token", refreshToken = "refresh_token", expiresAt = "expires_at", userId = "user_id"
    }

    public init(accessToken: String, refreshToken: String, expiresAt: Int, userId: String?) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.userId = userId
    }

    public func expires(within seconds: Int, now: Date = .now) -> Bool {
        Int(now.timeIntervalSince1970) + seconds >= expiresAt
    }
}
