import Foundation
import Testing
@testable import Polingual

struct EntitlementTests {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    func record(_ id: String = Plan.monthly, expiresIn: TimeInterval? = 86_400, revoked: Bool = false, intro: Bool = false, upgraded: Bool = false) -> EntitlementRecord {
        EntitlementRecord(productID: id, purchased: now.addingTimeInterval(-3_600), expires: expiresIn.map { now.addingTimeInterval($0) }, revoked: revoked ? now : nil, introductory: intro, upgraded: upgraded)
    }

    @Test func noRecordsLocks() {
        #expect(Entitlement.access([], now: now) == .locked)
        #expect(!Entitlement.access([], now: now).open)
    }

    @Test func introductoryOfferIsTrial() {
        let r = record(expiresIn: 3 * 86_400, intro: true)
        #expect(Entitlement.access([r], now: now) == .trial(until: r.expires!))
        #expect(Entitlement.access([r], now: now).open)
    }

    @Test func paidPeriodIsSubscribed() {
        let r = record(Plan.yearly, expiresIn: 300 * 86_400)
        #expect(Entitlement.access([r], now: now) == .subscribed(productID: Plan.yearly, until: r.expires))
    }

    @Test func expiredLocks() {
        #expect(Entitlement.access([record(expiresIn: -1)], now: now) == .locked)
    }

    @Test func revokedLocks() {
        #expect(Entitlement.access([record(revoked: true)], now: now) == .locked)
    }

    @Test func upgradedTransactionYieldsToTheNewPlan() {
        let old = record(Plan.monthly, expiresIn: 20 * 86_400, upgraded: true)
        let new = record(Plan.yearly, expiresIn: 365 * 86_400)
        #expect(Entitlement.access([old, new], now: now) == .subscribed(productID: Plan.yearly, until: new.expires))
        #expect(Entitlement.access([old], now: now) == .locked)
    }

    @Test func unknownProductLocks() {
        #expect(Entitlement.access([record("bucket.tip")], now: now) == .locked)
    }

    @Test func latestExpiryWins() {
        let trial = record(expiresIn: 86_400, intro: true)
        let paid = record(Plan.yearly, expiresIn: 200 * 86_400)
        #expect(Entitlement.access([trial, paid], now: now) == .subscribed(productID: Plan.yearly, until: paid.expires))
    }

    @Test func trialEligibleOnlyWithoutHistory() {
        #expect(Entitlement.trialEligible(history: []))
        #expect(Entitlement.trialEligible(history: [record("bucket.tip")]))
        #expect(!Entitlement.trialEligible(history: [record(expiresIn: -10 * 86_400, intro: true)]))
        #expect(!Entitlement.trialEligible(history: [record(Plan.yearly, revoked: true)]))
    }

    @Test func trialDaysLeftRoundsUp() {
        #expect(Entitlement.trialDaysLeft(.trial(until: now.addingTimeInterval(3 * 86_400)), now: now) == 3)
        #expect(Entitlement.trialDaysLeft(.trial(until: now.addingTimeInterval(86_400 + 60)), now: now) == 2)
        #expect(Entitlement.trialDaysLeft(.trial(until: now.addingTimeInterval(-60)), now: now) == 0)
        #expect(Entitlement.trialDaysLeft(.locked, now: now) == nil)
    }

    @Test func paywallCopyStatesTrialAndRenewal() {
        #expect(PaywallCopy.headline(trial: true) == "3 days free")
        #expect(PaywallCopy.renewal(trial: true).contains("3 days free"))
        #expect(PaywallCopy.renewal(trial: true).contains("renews automatically"))
        #expect(!PaywallCopy.renewal(trial: false).contains("days free"))
        #expect(PaywallCopy.disclosure(trial: true, price: "$59.99", period: "year").hasPrefix("3 days free, then $59.99 a year."))
        #expect(PaywallCopy.disclosure(trial: false, price: "$9.99", period: "month").contains("24 hours"))
    }
}
