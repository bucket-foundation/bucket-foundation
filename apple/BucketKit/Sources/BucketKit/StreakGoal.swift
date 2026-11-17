import Foundation

public struct StreakGoal: Equatable, Sendable {
    public static let target = 100

    public let day: Int
    public let left: Int
    public let reached: Bool
    public let fraction: Double
    public let pending: Bool

    public var today: Int { pending ? day + 1 : day }

    public init(streak: Double, pending: Bool = false) {
        day = streak.isFinite ? max(0, Int(min(streak, 1_000_000))) : 0
        self.pending = pending && day > 0
        left = max(0, Self.target - day)
        reached = day >= Self.target
        fraction = min(1, Double(day) / Double(Self.target))
    }
}

public struct LiveStreak: Equatable, Sendable {
    public let days: Double
    public let countsToday: Bool

    public init(_ states: [EngineState], now: Double, tz: TimeZone = .current) {
        let today = dayKey(now, tz: tz)
        let live = states.map { (days: liveStreak($0, now: now, tz: tz), today: $0.lastStudyDay == today) }
        let best = live.map(\.days).max() ?? 0
        days = best
        countsToday = live.contains { $0.today && $0.days == best }
    }

    public var pending: Bool { days > 0 && !countsToday }
}
