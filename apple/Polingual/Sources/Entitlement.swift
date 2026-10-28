import Foundation

enum Plan {
    static let monthly = "com.polingual.monthly"
    static let yearly = "com.polingual.yearly"
    static let all = [yearly, monthly]
    static let family = "com.polingual.family.yearly"
    static let lifetime = "com.polingual.lifetime"
    static let extra = [family, lifetime]
    static let paid = all + extra

    static func shown(extra on: Bool) -> [String] { on ? [yearly, family, monthly, lifetime] : all }

    static func hasTrial(_ id: String) -> Bool { all.contains(id) }
    static let trialDays = 3
    static let terms = URL(string: "https://polingual.com/terms")!
    static let privacy = URL(string: "https://polingual.com/privacy")!
    static let support = URL(string: "https://polingual.com/support")!
}

struct EntitlementRecord: Equatable, Sendable {
    let productID: String
    let purchased: Date
    let expires: Date?
    let revoked: Date?
    let introductory: Bool
    let upgraded: Bool
}

enum Access: Equatable, Sendable {
    case checking
    case locked
    case trial(until: Date)
    case subscribed(productID: String, until: Date?)

    var open: Bool {
        switch self {
        case .trial, .subscribed: true
        case .checking, .locked: false
        }
    }
}

enum Entitlement {
    static func live(_ r: EntitlementRecord, now: Date) -> Bool {
        Plan.paid.contains(r.productID) && r.revoked == nil && !r.upgraded && (r.expires.map { $0 > now } ?? true)
    }

    static func access(_ records: [EntitlementRecord], now: Date) -> Access {
        let live = records.filter { Self.live($0, now: now) }
        guard let best = live.max(by: { ($0.expires ?? .distantFuture) < ($1.expires ?? .distantFuture) }) else { return .locked }
        if best.introductory, let until = best.expires { return .trial(until: until) }
        return .subscribed(productID: best.productID, until: best.expires)
    }

    static func trialEligible(history: [EntitlementRecord]) -> Bool {
        !history.contains { Plan.all.contains($0.productID) }
    }

    static func trialDaysLeft(_ access: Access, now: Date) -> Int? {
        guard case .trial(let until) = access else { return nil }
        return max(0, Int((until.timeIntervalSince(now) / 86_400).rounded(.up)))
    }
}
