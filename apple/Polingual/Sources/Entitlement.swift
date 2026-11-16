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

    static func offered(_ shown: [String], current: String?, family wanted: Bool = false) -> [String] {
        switch current {
        case nil: shown
        case yearly: shown.filter { $0 == family }
        case family: wanted ? [] : shown.filter { $0 == yearly }
        case monthly: shown.filter { $0 == yearly || $0 == family }
        default: []
        }
    }

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
    case beta

    var open: Bool {
        switch self {
        case .trial, .subscribed, .beta: true
        case .checking, .locked: false
        }
    }
}

enum Monetization {
    static func showsAds(_ access: Access) -> Bool { access == .locked }

    static func locked(_ tab: AppTab, access: Access) -> Bool {
        !access.open && (tab == .today || tab == .learn)
    }

    static func startTab(access: Access) -> AppTab { access.open ? .today : .games }
}

enum Entitlement {
    static func live(_ r: EntitlementRecord, now: Date) -> Bool {
        Plan.paid.contains(r.productID) && r.revoked == nil && !r.upgraded && (r.expires.map { $0 > now } ?? true)
    }

    static func access(_ records: [EntitlementRecord], now: Date, beta: Bool = false) -> Access {
        let live = records.filter { Self.live($0, now: now) }
        guard let best = live.max(by: { ($0.expires ?? .distantFuture) < ($1.expires ?? .distantFuture) }) else { return beta ? .beta : .locked }
        if best.introductory, let until = best.expires { return .trial(until: until) }
        return .subscribed(productID: best.productID, until: best.expires)
    }

    static func current(_ records: [EntitlementRecord], now: Date) -> String? {
        records.filter { live($0, now: now) }.max(by: { ($0.expires ?? .distantFuture) < ($1.expires ?? .distantFuture) })?.productID
    }

    static func trialEligible(history: [EntitlementRecord]) -> Bool {
        !history.contains { Plan.all.contains($0.productID) }
    }

    static func trialDaysLeft(_ access: Access, now: Date) -> Int? {
        guard case .trial(let until) = access else { return nil }
        return max(0, Int((until.timeIntervalSince(now) / 86_400).rounded(.up)))
    }
}
