import Foundation

public struct WebRandom: Sendable {
    var x: UInt64

    public init(_ seed: String) {
        var v: UInt64 = 1
        if !seed.isEmpty, seed.utf8.allSatisfy({ (48...57).contains($0) }) {
            v = seed.utf8.reduce(UInt64(0)) { $0 &* 10 &+ UInt64($1 - 48) }
        }
        x = v == 0 ? 1 : v
    }

    public mutating func next() -> Double {
        x ^= x << 13
        x ^= x >> 7
        x ^= x << 17
        return Double(x >> 11) / 9007199254740992.0
    }

    public mutating func below(_ n: Int) -> Int { Int((next() * Double(n)).rounded(.down)) }

    public mutating func shuffled<T>(_ xs: [T]) -> [T] {
        var out = xs
        var i = out.count - 1
        while i >= 1 {
            out.swapAt(i, below(i + 1))
            i -= 1
        }
        return out
    }

    public static func unit(_ key: String) -> Double {
        var h: UInt32 = 0x811c9dc5
        for c in key.utf16 {
            h ^= UInt32(c)
            h = h &* 0x01000193
        }
        h ^= h >> 15
        h = h &* 0x2c1b3c6d
        h ^= h >> 12
        return Double(h) / 4294967296.0
    }

    public static func seedOf(_ key: String) -> String { String(Int64((unit(key) * 4503599627370496.0).rounded(.down)) + 1) }
}

public struct Bot: Sendable, Equatable, Hashable {
    public let userId: String
    public let name: String
    public let flag: String
    public let skill: String
}

public enum Bots {
    static let roster: [(String, String)] = [
        ("Lucía", "ES"), ("Mateo", "AR"), ("Camille", "FR"), ("Giulia", "IT"), ("João", "BR"), ("Inês", "PT"),
        ("Lena", "DE"), ("Daan", "NL"), ("Astrid", "SE"), ("Yuki", "JP"), ("Min-jun", "KR"), ("Wei", "CN"),
        ("Priya", "IN"), ("Omar", "EG"), ("Nikos", "GR"), ("Olga", "UA"), ("Sofía", "MX"), ("Liam", "IE"),
        ("Amara", "NG"), ("Chloe", "CA"), ("Kai", "NZ"), ("Elif", "TR"), ("Mai", "VN"), ("Tomás", "CL"),
    ]
    static let skills = ["medium", "easy", "hard", "medium", "easy", "hard"]

    public static let all: [Bot] = roster.enumerated().map { i, p in
        let hex = String(i + 1, radix: 16)
        return Bot(userId: "00000000-b07b-4000-8000-" + String(repeating: "0", count: 12 - hex.count) + hex, name: p.0, flag: p.1, skill: skills[i % skills.count])
    }

    public static func countryFlag(_ code: String) -> String {
        String(String.UnicodeScalarView(code.uppercased().unicodeScalars.compactMap { Unicode.Scalar(0x1F1E6 + $0.value - 65) }))
    }
}

func stableSorted<T, K: Comparable>(_ xs: [T], by key: (T) -> K, descending: Bool = false) -> [T] {
    xs.enumerated().sorted { a, b in
        let ka = key(a.element), kb = key(b.element)
        if ka != kb { return descending ? ka > kb : ka < kb }
        return a.offset < b.offset
    }.map(\.element)
}

func playRound(_ x: Double) -> Int { Int((x + 0.5).rounded(.down)) }
