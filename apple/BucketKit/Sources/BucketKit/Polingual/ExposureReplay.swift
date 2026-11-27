import Foundation

public struct ExposureCard: Equatable, Sendable {
    public var state: String
    public var stability: Double?
    public var lastReview: Double?
    public var due: Double?
    public var exposureDay: String?
    public init(state: String, stability: Double?, lastReview: Double?, due: Double?, exposureDay: String? = nil) {
        self.state = state; self.stability = stability; self.lastReview = lastReview; self.due = due; self.exposureDay = exposureDay
    }
}

public enum ExposureReplay {
    public static let alpha = 0.0
    public static let fireMaxStabilityGain = 0.15
    public static let fireMinRetrievability = 0.6
    static let dayMs = 86_400_000.0
    static let decay = -0.5
    static let factor = pow(0.9, 1 / decay) - 1

    public static func gain(_ alpha: Double) -> Double { min(fireMaxStabilityGain, max(0, alpha) * fireMaxStabilityGain) }

    public static func interval(_ s: Double) -> Double {
        let ivl = (s / factor) * (pow(0.9, 1 / decay) - 1)
        return min(max(1, ivl.rounded()), 3650)
    }

    static func retrievability(_ t: Double, _ s: Double) -> Double { s <= 0 ? 0 : pow(1 + factor * (t / s), decay) }

    public static func credit(_ card: ExposureCard?, at: Double, day: String, alpha: Double) -> ExposureCard? {
        guard var c = card, let s = c.stability, c.state != "new", s > 0, c.exposureDay != day else { return card }
        let last = c.lastReview ?? at
        if retrievability(max(0, (at - last) / dayMs), s) < fireMinRetrievability { return card }
        let next = s * (1 + gain(alpha))
        c.stability = next
        c.due = max(c.due ?? 0, last + interval(next) * dayMs)
        c.exposureDay = day
        return c
    }

    public static func tap(_ card: ExposureCard?, at: Double) -> ExposureCard? {
        guard var c = card else { return nil }
        c.due = at
        return c
    }

    public static func group(_ card: ExposureCard?, tapped: [Bool], at: Double, day: String, alpha: Double) -> ExposureCard? {
        var c = card
        for t in tapped where !t { c = credit(c, at: at, day: day, alpha: alpha) }
        for t in tapped where t { c = tap(c, at: at) }
        return c
    }
}
