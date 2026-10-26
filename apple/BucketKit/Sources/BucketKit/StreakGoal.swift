import Foundation

public struct StreakGoal: Equatable, Sendable {
    public static let target = 100

    public let day: Int
    public let left: Int
    public let reached: Bool
    public let fraction: Double

    public init(streak: Double) {
        day = streak.isFinite ? max(0, Int(min(streak, 1_000_000))) : 0
        left = max(0, Self.target - day)
        reached = day >= Self.target
        fraction = min(1, Double(day) / Double(Self.target))
    }
}
