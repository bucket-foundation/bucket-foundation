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

    func product(_ id: String) async throws -> Product {
        try await products([id])[0]
    }

    func products(_ ids: [String]) async throws -> [Product] {
        for attempt in 0..<5 {
            let found = await withTaskGroup(of: [Product]?.self) { group in
                group.addTask {
                    guard let list = try? await Product.products(for: ids), Set(list.map(\.id)) == Set(ids) else { return nil }
                    return ids.compactMap { id in list.first { $0.id == id } }
                }
                group.addTask {
                    try? await Task.sleep(for: .seconds(4))
                    return nil
                }
                let first = await group.next() ?? nil
                group.cancelAll()
                return first
            }
            if let found { return found }
            try await Task.sleep(for: .milliseconds(200 * (attempt + 1)))
        }
        throw ProductMissing(ids: ids)
    }

    struct ProductMissing: Error {
        let ids: [String]
    }

    func settle(_ subs: Subscriptions) async {
        for _ in 0..<40 {
            await subs.refresh()
            if subs.access != .locked { return }
            try? await Task.sleep(for: .milliseconds(100))
        }
    }

    @Test func onlyYearlyCarriesASevenDayFreeTrial() async throws {
        _ = try session()
        let products = try await self.products(Plan.all)
        #expect(Set(products.map(\.id)) == Set(Plan.all))
        for p in products where p.id != Plan.yearly { #expect(p.subscription?.introductoryOffer == nil) }
        let yearly = try #require(products.first { $0.id == Plan.yearly })
        let offer = try #require(yearly.subscription?.introductoryOffer)
        #expect(offer.paymentMode == .freeTrial)
        #expect(TrialLength.days(offer) == Plan.trialDays)
        #expect(await yearly.subscription?.isEligibleForIntroOffer == true)
    }

    @Test func purchaseOpensTrialThenEligibilityEnds() async throws {
        _ = try session()
        let subs = Subscriptions()
        await subs.refresh()
        #expect(subs.access == .locked)
        #expect(subs.trialEligible)
        let yearly = try await product(Plan.yearly)
        _ = try await Self.shared!.buyProduct(identifier: yearly.id)
        await settle(subs)
        guard case .trial = subs.access else {
            Issue.record("expected trial, got \(subs.access)")
            return
        }
        #expect(!subs.trialEligible)
    }

    @Test func expiredSubscriptionLocks() async throws {
        let s = try session()
        let subs = Subscriptions()
        let yearly = try await product(Plan.yearly)
        _ = try await Self.shared!.buyProduct(identifier: yearly.id)
        await settle(subs)
        #expect(subs.access.open)
        try s.expireSubscription(productIdentifier: Plan.yearly)
        for _ in 0..<20 where subs.access != .locked {
            try await Task.sleep(for: .milliseconds(250))
            await subs.refresh()
        }
        #expect(subs.access == .locked)
    }

    @Test func familyPurchaseUnlocks() async throws {
        _ = try session()
        let subs = Subscriptions()
        await subs.refresh()
        #expect(subs.access == .locked)
        let family = try await product(Plan.family)
        #expect(family.subscription != nil)
        #expect(family.isFamilyShareable)
        _ = try await Self.shared!.buyProduct(identifier: family.id)
        await settle(subs)
        guard case .subscribed(let id, let until) = subs.access else {
            Issue.record("expected subscribed, got \(subs.access)")
            return
        }
        #expect(id == Plan.family)
        #expect(until != nil)
    }

    @Test func lifetimePurchaseUnlocksWithoutExpiry() async throws {
        _ = try session()
        let subs = Subscriptions()
        await subs.refresh()
        #expect(subs.access == .locked)
        let lifetime = try await product(Plan.lifetime)
        #expect(lifetime.type == .nonConsumable)
        _ = try await Self.shared!.buyProduct(identifier: lifetime.id)
        await settle(subs)
        #expect(subs.access == .subscribed(productID: Plan.lifetime, until: nil))
        #expect(subs.access.open)
    }

    @Test(.enabled(if: ProcessInfo.processInfo.environment["POLINGUAL_SHOTS"] != nil))
    func holdPaywallForScreenshots() async throws {
        let s = try session()
        NotificationCenter.default.post(name: .polingualStoreReset, object: nil)
        try await Task.sleep(for: .seconds(25))
        if ProcessInfo.processInfo.environment["POLINGUAL_SHOTS"] == "buy" {
            let yearly = try await product(Plan.yearly)
            _ = try await Self.shared!.buyProduct(identifier: yearly.id)
            NotificationCenter.default.post(name: .polingualStoreReset, object: nil)
            try await Task.sleep(for: .seconds(25))
        }
        _ = s
    }
}
