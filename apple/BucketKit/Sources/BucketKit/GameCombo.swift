import Foundation

public enum ComboTier: Int, Sendable, Comparable, CaseIterable {
    case none = 0
    case warm = 3
    case hot = 5
    case blazing = 10

    public static func at(_ run: Int) -> ComboTier {
        allCases.last { run >= $0.rawValue } ?? .none
    }

    public var multiplier: Int {
        switch self {
        case .none, .warm: 1
        case .hot: 2
        case .blazing: 3
        }
    }

    public static func < (a: ComboTier, b: ComboTier) -> Bool { a.rawValue < b.rawValue }
}

public struct ComboCount: Sendable, Equatable {
    public private(set) var current = 0
    public private(set) var best = 0
    public private(set) var climbed = false
    public private(set) var broke = false

    public init() {}

    public var tier: ComboTier { .at(current) }
    public var multiplier: Int { tier.multiplier }

    public mutating func hit() {
        let before = tier
        current += 1
        best = max(best, current)
        climbed = tier > before
        broke = false
    }

    public mutating func miss() {
        broke = tier > .none
        current = 0
        climbed = false
    }

    public mutating func record(_ right: Bool) {
        if right { hit() } else { miss() }
    }
}

public enum GameStars {
    public static let max = 3

    public static func rating(hits: Int, total: Int) -> Int {
        guard total > 0, hits > 0 else { return 0 }
        let tenths = min(hits, total) * 10
        if tenths >= total * 9 { return 3 }
        if tenths >= total * 6 { return 2 }
        return 1
    }
}
