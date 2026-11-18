import BucketKit
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

    var tier: MemberTier {
        switch self {
        case .checking: .checking
        case .locked: .locked
        case .trial: .trial
        case .subscribed: .subscribed
        case .beta: .beta
        }
    }

    var open: Bool { tier.open }
}

enum Monetization {
    static func showsAds(_ access: Access) -> Bool { access.tier.showsAds }

    static func capped(_ access: Access) -> Bool { access.tier.capped }

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

    static func webMember(_ store: Access, web: WebEntitlement?, userId: String?, now: Date) -> WebEntitlement? {
        MemberTier.merged(store: store.tier, web: web, userId: userId, now: now).web
    }

    static func merged(_ store: Access, web: WebEntitlement?, userId: String?, now: Date) -> Access {
        guard let member = webMember(store, web: web, userId: userId, now: now) else { return store }
        return .subscribed(productID: member.productId, until: member.expires)
    }

    static func memberLine(_ member: WebEntitlement) -> String {
        guard let until = member.expires else { return String(localized: "Membership active") }
        return String(localized: "Membership active until \(until.formatted(date: .long, time: .omitted))")
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
