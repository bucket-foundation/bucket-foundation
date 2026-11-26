import Foundation

public struct FreqPrior: Equatable, Sendable {
    public var rank: Double
    public var derived: Bool
    public init(rank: Double, derived: Bool) { self.rank = rank; self.derived = derived }
}

public struct LemmaEvidence: Equatable, Sendable {
    public var stability: Double?
    public var lastReview: Double?
    public var lastTap: Double?
    public var exposures: Int
    public var freq: FreqPrior?
    public init(stability: Double? = nil, lastReview: Double? = nil, lastTap: Double? = nil, exposures: Int = 0, freq: FreqPrior? = nil) {
        self.stability = stability; self.lastReview = lastReview; self.lastTap = lastTap; self.exposures = exposures; self.freq = freq
    }
}

public struct Known: Equatable, Sendable {
    public var p: Double
    public var known: Bool
    public var source: String
}

public enum LearnerModel {
    public static let knownR = 0.9
    public static let tapWindowDays = 7.0
    public static let exposureLambda = 0.0
    public static let priorHalfRank = 500.0
    public static let priorSlope = 2.0
    public static let derivedRankFactor = 2.0
    static let dayMs = 86_400_000.0
    static let decay = -0.5
    static let factor = pow(0.9, 1 / decay) - 1

    public static func retrievability(_ elapsedDays: Double, _ stability: Double) -> Double {
        stability <= 0 ? 0 : pow(1 + factor * (max(0, elapsedDays) / stability), decay)
    }

    public static func freqFromRow(_ row: [Any?]) -> FreqPrior? {
        guard row.count > 7, let n = row[7] as? NSNumber else { return nil }
        let rank = n.doubleValue
        guard rank.isFinite, rank >= 1 else { return nil }
        let derived = row.count > 8 ? (row[8] as? NSNumber)?.intValue == 1 : false
        return FreqPrior(rank: rank, derived: derived)
    }

    public static func frequencyPrior(_ freq: FreqPrior?, tier: Int) -> Double {
        guard let freq else { return 0 }
        let rank = freq.derived ? freq.rank * derivedRankFactor : freq.rank
        let half = priorHalfRank * Double(1 + max(0, tier))
        return 1 / (1 + pow(rank / half, priorSlope))
    }

    public static func exposureGain(_ n: Int, lambda: Double = exposureLambda) -> Double {
        n > 0 && lambda > 0 ? 1 - exp(-lambda * Double(n)) : 0
    }

    private static func clamp(_ x: Double) -> Double { min(1, max(0, x)) }

    public static func known(_ e: LemmaEvidence, now: Double, tier: Int, lambda: Double = exposureLambda) -> Known {
        if let tap = e.lastTap, now - tap >= 0, now - tap < tapWindowDays * dayMs { return Known(p: 0, known: false, source: "tap") }
        if let s = e.stability, s > 0, let last = e.lastReview {
            let r = clamp(retrievability((now - last) / dayMs, s))
            return Known(p: r, known: r >= knownR, source: "card")
        }
        let prior = frequencyPrior(e.freq, tier: tier)
        let gain = exposureGain(e.exposures, lambda: lambda)
        let p = clamp(1 - (1 - prior) * (1 - gain))
        return Known(p: p, known: p >= knownR, source: gain > 0 ? "exposure" : "prior")
    }

    public static func knownCount(_ lemmas: [String: LemmaEvidence], now: Double, tier: Int, lambda: Double = exposureLambda) -> Double {
        lemmas.keys.sorted().reduce(0) { $0 + known(lemmas[$1]!, now: now, tier: tier, lambda: lambda).p }
    }
}
