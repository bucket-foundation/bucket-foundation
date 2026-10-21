import Foundation
import StoreKit
import StoreKitTest
import Testing
@testable import Polingual

@MainActor
@Suite(.serialized, .timeLimit(.minutes(1)))
struct StoreKitTests {
    static var shared: SKTestSession?

    func session() throws -> SKTestSession {
        let s = try Self.shared ?? SKTestSession(configurationFileNamed: "Polingual")
        Self.shared = s
        s.resetToDefaultState()
        s.clearTransactions()
        s.disableDialogs = true
        return s
    }

    @Test func productsCarryAThreeDayFreeTrial() async throws {
        _ = try session()
        let products = try await Product.products(for: Plan.all)
        #expect(Set(products.map(\.id)) == Set(Plan.all))
        for p in products {
            let offer = try #require(p.subscription?.introductoryOffer)
            #expect(offer.paymentMode == .freeTrial)
            #expect(offer.period.value == 3)
            #expect(offer.period.unit == .day)
            #expect(await p.subscription?.isEligibleForIntroOffer == true)
        }
    }

    @Test func purchaseOpensTrialThenEligibilityEnds() async throws {
        _ = try session()
        let subs = Subscriptions()
        await subs.refresh()
        #expect(subs.access == .locked)
        #expect(subs.trialEligible)
        let monthly = try #require(try await Product.products(for: [Plan.monthly]).first)
        _ = try await monthly.purchase()
        await subs.refresh()
        guard case .trial = subs.access else {
            Issue.record("expected trial, got \(subs.access)")
            return
        }
        #expect(!subs.trialEligible)
    }

    @Test func expiredSubscriptionLocks() async throws {
        let s = try session()
        let subs = Subscriptions()
        let yearly = try #require(try await Product.products(for: [Plan.yearly]).first)
        _ = try await yearly.purchase()
        await subs.refresh()
        #expect(subs.access.open)
        try s.expireSubscription(productIdentifier: Plan.yearly)
        for _ in 0..<20 where subs.access != .locked {
            try await Task.sleep(for: .milliseconds(250))
            await subs.refresh()
        }
        #expect(subs.access == .locked)
    }

    @Test(.enabled(if: ProcessInfo.processInfo.environment["POLINGUAL_SHOTS"] != nil))
    func holdPaywallForScreenshots() async throws {
        let s = try session()
        NotificationCenter.default.post(name: .polingualStoreReset, object: nil)
        try await Task.sleep(for: .seconds(25))
        if ProcessInfo.processInfo.environment["POLINGUAL_SHOTS"] == "buy" {
            let yearly = try #require(try await Product.products(for: [Plan.yearly]).first)
            _ = try await yearly.purchase()
            NotificationCenter.default.post(name: .polingualStoreReset, object: nil)
            try await Task.sleep(for: .seconds(25))
        }
        _ = s
    }
}
