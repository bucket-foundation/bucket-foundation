import BucketKit
import Foundation
import StoreKit
import Testing
@testable import Polingual

struct EntitlementTests {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    func record(_ id: String = Plan.monthly, expiresIn: TimeInterval? = 86_400, revoked: Bool = false, intro: Bool = false, upgraded: Bool = false) -> EntitlementRecord {
        EntitlementRecord(productID: id, purchased: now.addingTimeInterval(-3_600), expires: expiresIn.map { now.addingTimeInterval($0) }, revoked: revoked ? now : nil, introductory: intro, upgraded: upgraded)
    }

    func web(_ user: String = "u1", expiresIn: TimeInterval = 300 * 86_400, fetchedAgo: TimeInterval = 60) -> WebEntitlement {
        WebEntitlement(userId: user, productId: "web.polingual.gift.year", expires: now.addingTimeInterval(expiresIn), fetched: now.addingTimeInterval(-fetchedAgo))
    }

    @Test func purchasesCountOnlyForTheAccountWhoseTokenTheyCarry() {
        let a = UUID(), b = UUID()
        var mine = record(Plan.yearly)
        mine.accountToken = a
        var theirs = record(Plan.monthly)
        theirs.accountToken = b
        let untagged = record(Plan.lifetime, expiresIn: nil)
        let all = [mine, theirs, untagged]
        #expect(Entitlement.owned(all, by: nil) == all)
        #expect(Entitlement.owned(all, by: PurchaseOwner(token: a, legacy: false)) == [mine])
        #expect(Entitlement.owned(all, by: PurchaseOwner(token: b, legacy: true)) == [theirs, untagged])
        #expect(Entitlement.owned(all, by: PurchaseOwner(token: nil, legacy: false)).isEmpty)
        #expect(Entitlement.access(Entitlement.owned(all, by: PurchaseOwner(token: UUID(), legacy: false)), now: now) == .locked)
    }

    @Test func lapsedReportsTheLatestEndedPaidPlan() {
        let older = record(Plan.monthly, expiresIn: -5 * 86_400)
        let newer = record(Plan.yearly, expiresIn: -86_400)
        #expect(Entitlement.lapsed(history: [older, newer], now: now) == now.addingTimeInterval(-86_400))
        #expect(Entitlement.access([], now: now) == .locked)
    }

    @Test func lapsedIsNilWhileAnyPlanIsLiveOrNoneWasBought() {
        #expect(Entitlement.lapsed(history: [], now: now) == nil)
        #expect(Entitlement.lapsed(history: [record(expiresIn: -86_400), record(Plan.yearly)], now: now) == nil)
        #expect(Entitlement.lapsed(history: [record(Plan.lifetime, expiresIn: nil)], now: now) == nil)
    }

    @Test func lapsedIgnoresAnUpgradedRecordWhenTheNewPlanIsLive() {
        let upgraded = record(Plan.monthly, expiresIn: -86_400, upgraded: true)
        #expect(Entitlement.lapsed(history: [upgraded, record(Plan.yearly)], now: now) == nil)
        #expect(Entitlement.lapsed(history: [upgraded, record(Plan.yearly, expiresIn: -3_600)], now: now) == now.addingTimeInterval(-3_600))
    }

    @Test func lapsedSkipsRevokedAndUnknownProducts() {
        #expect(Entitlement.lapsed(history: [record(expiresIn: -86_400, revoked: true)], now: now) == nil)
        #expect(Entitlement.lapsed(history: [record("com.other.app", expiresIn: -86_400)], now: now) == nil)
    }

    @Test func lapsedCopyAddsTheTestFlightLineInTheSandbox() {
        let ended = now.addingTimeInterval(-86_400)
        let plain = PaywallCopy.lapsed(ended, sandbox: false)
        let beta = PaywallCopy.lapsed(ended, sandbox: true)
        #expect(plain.contains(ended.formatted(date: .long, time: .omitted)))
        #expect(beta.hasPrefix(plain))
        #expect(beta.count > plain.count)
        #expect(beta.hasSuffix(String(localized: "Test plans end within days, and test purchases are free.")))
    }

    @Test func webGrantOpensLockedAndBetaAccess() {
        let w = web()
        let subscribed = Access.subscribed(productID: w.productId, until: w.expires)
        #expect(Entitlement.merged(.locked, web: w, userId: "u1", now: now) == subscribed)
        #expect(Entitlement.merged(.beta, web: w, userId: "u1", now: now) == subscribed)
        #expect(Entitlement.merged(.checking, web: w, userId: "u1", now: now) == subscribed)
        #expect(Entitlement.webMember(.locked, web: w, userId: "u1", now: now) == w)
        #expect(!Monetization.showsAds(subscribed))
        #expect(!Monetization.capped(subscribed))
        #expect(!Monetization.locked(.learn, access: subscribed))
    }

    @Test func storeKitStateIsNeverReplacedByAWebGrant() {
        let w = web()
        let trial = Access.trial(until: now.addingTimeInterval(86_400))
        let paid = Access.subscribed(productID: Plan.yearly, until: now.addingTimeInterval(86_400))
        #expect(Entitlement.merged(trial, web: w, userId: "u1", now: now) == trial)
        #expect(Entitlement.merged(paid, web: w, userId: "u1", now: now) == paid)
        #expect(Entitlement.webMember(paid, web: w, userId: "u1", now: now) == nil)
    }

    @Test func noWebGrantLeavesStoreKitAccessAlone() {
        for store in [Access.checking, .locked, .beta, .trial(until: now.addingTimeInterval(60)), .subscribed(productID: Plan.monthly, until: nil)] {
            #expect(Entitlement.merged(store, web: nil, userId: "u1", now: now) == store)
        }
    }

    @Test func expiredStaleOrForeignWebGrantIsIgnored() {
        #expect(Entitlement.merged(.locked, web: web(expiresIn: -60), userId: "u1", now: now) == .locked)
        #expect(Entitlement.merged(.locked, web: web(fetchedAgo: 8 * 86_400), userId: "u1", now: now) == .locked)
        #expect(Entitlement.merged(.locked, web: web(fetchedAgo: -3_600), userId: "u1", now: now) == .locked)
        #expect(Entitlement.merged(.locked, web: web(), userId: "u2", now: now) == .locked)
        #expect(Entitlement.merged(.locked, web: web(), userId: nil, now: now) == .locked)
        #expect(Monetization.showsAds(Entitlement.merged(.locked, web: web(expiresIn: -60), userId: "u1", now: now)))
    }

    @Test func memberLineNamesTheDateAndNothingElse() {
        let line = Entitlement.memberLine(web())
        #expect(line.contains(web().expires!.formatted(date: .long, time: .omitted)))
        #expect(Entitlement.memberLine(WebEntitlement(userId: "u1", productId: "web.polingual.membership", expires: nil, fetched: now)) == String(localized: "Membership active"))
    }

    @Test func noRecordsLocks() {
        #expect(Entitlement.access([], now: now) == .locked)
        #expect(Entitlement.access([], now: now, beta: true) == .beta)
        #expect(Entitlement.access([record(revoked: true)], now: now, beta: true) == .beta)
        #expect(!Entitlement.access([], now: now).open)
        #expect(Subscriptions.freeBetaBuild("YES"))
        #expect(!Subscriptions.freeBetaBuild("NO"))
        #expect(!Subscriptions.freeBetaBuild(nil))
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
        #expect(PaywallCopy.headline(trial: true) == "7 days free")
        #expect(PaywallCopy.renewal(trial: true).contains("7 days free"))
        #expect(PaywallCopy.renewal(trial: true).contains("renews automatically"))
        #expect(!PaywallCopy.renewal(trial: false).contains("days free"))
        #expect(PaywallCopy.disclosure(trial: true, price: "$59.99", period: "year").hasPrefix("7 days free, then $59.99 a year."))
        #expect(PaywallCopy.disclosure(trial: false, price: "$9.99", period: "month").contains("24 hours"))
    }

    @Test func trialLengthFollowsTheStoreOffer() {
        #expect(TrialLength.days(unit: .day, value: 3, periods: 1) == 3)
        #expect(TrialLength.days(unit: .week, value: 1, periods: 1) == 7)
        #expect(TrialLength.days(unit: .week, value: 1, periods: 2) == 14)
        #expect(TrialLength.days(unit: .month, value: 1, periods: 1) == 30)
        #expect(TrialLength.days(nil) == nil)
    }

    @Test func trialLengthPrefersTheChosenPlan() {
        let offers: [(id: String, days: Int?)] = [(Plan.yearly, 7), (Plan.monthly, 3), (Plan.lifetime, 14)]
        #expect(TrialLength.pick(offers, chosen: Plan.monthly) == 7)
        #expect(TrialLength.pick(offers, chosen: Plan.yearly) == 7)
        #expect(TrialLength.pick(offers, chosen: Plan.lifetime) == 7)
        #expect(TrialLength.pick([(Plan.yearly, nil), (Plan.monthly, 3)], chosen: Plan.yearly) == Plan.trialDays)
        #expect(TrialLength.pick([], chosen: Plan.yearly) == Plan.trialDays)
        #expect(TrialLength.pick([(Plan.lifetime, 14)], chosen: Plan.lifetime) == Plan.trialDays)
    }

    @Test func paywallCopyNamesTheStoreTrialLength() {
        #expect(PaywallCopy.headline(trial: true, days: 7) == "7 days free")
        #expect(PaywallCopy.disclosure(trial: true, days: 7, price: "$59.99", period: "year").hasPrefix("7 days free, then $59.99 a year."))
        #expect(PaywallCopy.renewal(trial: true, days: 14).contains("14 days free"))
    }

    @Test func lifetimeNeverExpiresAndFamilyIsASubscription() {
        #expect(Entitlement.access([record(Plan.lifetime, expiresIn: nil)], now: now) == .subscribed(productID: Plan.lifetime, until: nil))
        #expect(Entitlement.access([record(Plan.family)], now: now).open)
        #expect(Entitlement.trialEligible(history: [record(Plan.lifetime, expiresIn: nil)]))
    }

    @Test func extraPlansShowOnlyBehindTheFlag() {
        #expect(Plan.shown(extra: false) == [Plan.yearly, Plan.monthly])
        #expect(Plan.shown(extra: true) == [Plan.yearly, Plan.family, Plan.monthly, Plan.lifetime])
        #expect(!Plan.hasTrial(Plan.lifetime) && !Plan.hasTrial(Plan.family) && !Plan.hasTrial(Plan.monthly) && Plan.hasTrial(Plan.yearly))
    }

    @Test func lifetimeAndFamilyDisclosures() {
        let once = PaywallCopy.disclosure(trial: false, price: "$149.99", period: "once")
        #expect(once.hasPrefix("$149.99 once.") && once.contains("no renewal") && !once.contains("24 hours"))
        let family = PaywallCopy.disclosure(trial: false, price: "$89.99", period: "year", family: true)
        #expect(family.contains("24 hours") && family.contains("Family Sharing"))
    }

    @Test func trialReminderOnlyForAnIntroOfferOnYearly() {
        #expect(TrialReminder.action(productID: Plan.yearly, introductory: true) == .schedule)
        #expect(TrialReminder.action(productID: Plan.monthly, introductory: true) == .cancel)
        #expect(TrialReminder.action(productID: Plan.yearly, introductory: false) == .cancel)
    }

    @Test func lifetimeAndFamilyCancelAnyPendingTrialReminder() {
        #expect(TrialReminder.action(productID: Plan.lifetime, introductory: false) == .cancel)
        #expect(TrialReminder.action(productID: Plan.family, introductory: false) == .cancel)
        #expect(TrialReminder.action(productID: Plan.lifetime, introductory: true) == .cancel)
        #expect(TrialReminder.action(productID: Plan.family, introductory: true) == .cancel)
    }

    @Test func lockedSeesEveryShownPlan() {
        let all = Plan.shown(extra: true)
        #expect(Plan.offered(all, current: nil) == all)
        #expect(Plan.offered(Plan.all, current: nil, family: true) == Plan.all)
    }

    @Test func yearlyAndFamilyCrossgrade() {
        let all = Plan.shown(extra: true)
        #expect(Plan.offered(all, current: Plan.yearly) == [Plan.family])
        #expect(Plan.offered(all, current: Plan.yearly, family: true) == [Plan.family])
        #expect(Plan.offered(all, current: Plan.family) == [Plan.yearly])
        #expect(Plan.offered(all, current: Plan.family, family: true).isEmpty)
    }

    @Test func monthlyUpgradesToYearlyOrFamily() {
        #expect(Plan.offered(Plan.shown(extra: true), current: Plan.monthly) == [Plan.yearly, Plan.family])
        #expect(Plan.offered(Plan.shown(extra: false), current: Plan.monthly) == [Plan.yearly])
    }

    @Test func openAccessHidesPlanCardsWithNoSwitch() {
        #expect(Plan.offered(Plan.shown(extra: false), current: Plan.yearly).isEmpty)
        #expect(Plan.offered(Plan.shown(extra: true), current: Plan.lifetime).isEmpty)
    }

    @Test func currentIsTheLiveRecordThatRunsLongest() {
        let monthly = record(Plan.monthly, expiresIn: 86_400)
        let yearly = record(Plan.yearly, expiresIn: 300 * 86_400)
        #expect(Entitlement.current([monthly, yearly], now: now) == Plan.yearly)
        #expect(Entitlement.current([record(Plan.yearly, intro: true)], now: now) == Plan.yearly)
        #expect(Entitlement.current([record(Plan.lifetime, expiresIn: nil), yearly], now: now) == Plan.lifetime)
        #expect(Entitlement.current([record(Plan.family, upgraded: true), monthly], now: now) == Plan.monthly)
        #expect(Entitlement.current([record(expiresIn: -1)], now: now) == nil)
    }
}
