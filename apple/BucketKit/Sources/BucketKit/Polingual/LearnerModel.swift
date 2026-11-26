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

public typealias Probability = Double
public typealias HardCutAtKnownR = Bool
public typealias SumOfProbabilities = Double

public struct Known: Equatable, Sendable {
    public var p: Probability
    public var known: HardCutAtKnownR
    public var source: String
}

public struct FrequencyPriors: Equatable, Sendable {
    public var halfRank = 500.0
    public var slope = 2.0
    public var derivedRankFactor = 2.0
    public var cap = 0.85
    public init(halfRank: Double = 500, slope: Double = 2, derivedRankFactor: Double = 2, cap: Double = 0.85) {
        self.halfRank = halfRank; self.slope = slope; self.derivedRankFactor = derivedRankFactor; self.cap = cap
    }
    public static let unstudied = FrequencyPriors()
    public static let halfRankBounds = 50.0...20_000.0
    public static let slopeBounds = 0.5...5.0
    public static let derivedBounds = 1.0...10.0
    public static let capBounds = 0.0...0.89

    public func bounded() -> FrequencyPriors {
        func b(_ v: Double, _ r: ClosedRange<Double>, _ d: Double) -> Double { v.isFinite ? min(r.upperBound, max(r.lowerBound, v)) : d }
        let z = FrequencyPriors.unstudied
        return FrequencyPriors(halfRank: b(halfRank, Self.halfRankBounds, z.halfRank), slope: b(slope, Self.slopeBounds, z.slope), derivedRankFactor: b(derivedRankFactor, Self.derivedBounds, z.derivedRankFactor), cap: b(cap, Self.capBounds, z.cap))
    }
}

public enum LearnerModel {
    public static let knownR = 0.9
    public static let tapWindowDays = 7.0
    public static let exposureLambda = 0.0
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

    public static func frequencyPrior(_ freq: FreqPrior?, tier: Int, priors: FrequencyPriors = .unstudied) -> Probability {
        guard let freq else { return 0 }
        let rank = freq.derived ? freq.rank * priors.derivedRankFactor : freq.rank
        let half = priors.halfRank * Double(1 + max(0, tier))
        return min(priors.cap, 1 / (1 + pow(rank / half, priors.slope)))
    }

    public static func exposureGain(_ n: Int, lambda: Double = exposureLambda) -> Double {
        n > 0 && lambda > 0 ? 1 - exp(-lambda * Double(n)) : 0
    }

    private static func clamp(_ x: Double) -> Double { min(1, max(0, x)) }

    public static func known(_ e: LemmaEvidence, now: Double, tier: Int, lambda: Double = exposureLambda, priors: FrequencyPriors = .unstudied) -> Known {
        if let tap = e.lastTap, now - tap >= 0, now - tap < tapWindowDays * dayMs { return Known(p: 0, known: false, source: "tap") }
        if let s = e.stability, s > 0, let last = e.lastReview {
            let r = clamp(retrievability((now - last) / dayMs, s))
            return Known(p: r, known: r >= knownR, source: "card")
        }
        let prior = frequencyPrior(e.freq, tier: tier, priors: priors)
        let gain = exposureGain(e.exposures, lambda: lambda)
        let p = clamp(1 - (1 - prior) * (1 - gain))
        return Known(p: p, known: p >= knownR, source: gain > 0 ? "exposure" : "prior")
    }

    public static func knownCount(_ lemmas: [String: LemmaEvidence], now: Double, tier: Int, lambda: Double = exposureLambda, priors: FrequencyPriors = .unstudied) -> SumOfProbabilities {
        lemmas.keys.sorted().reduce(0) { $0 + known(lemmas[$1]!, now: now, tier: tier, lambda: lambda, priors: priors).p }
    }
}
