import Foundation
import Observation
import StoreKit

extension EntitlementRecord {
    init(_ t: Transaction) {
        self.init(productID: t.productID, purchased: t.purchaseDate, expires: t.expirationDate, revoked: t.revocationDate, introductory: t.offer?.type == .introductory, upgraded: t.isUpgraded)
    }
}

extension Notification.Name {
    static let polingualStoreReset = Notification.Name("polingual.storeReset")
}

@MainActor
@Observable
final class Subscriptions {
    private(set) var access = Access.checking
    private(set) var trialEligible = true
    private(set) var epoch = 0
    @ObservationIgnored private var updates: Task<Void, Never>?
    @ObservationIgnored private var resets: Task<Void, Never>?

    init(forced: Access? = nil) {
        if let forced {
            access = forced
            return
        }
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let t) = result { await t.finish() }
                await self?.refresh()
            }
        }
        #if DEBUG
        resets = Task { [weak self] in
            for await _ in NotificationCenter.default.notifications(named: .polingualStoreReset) {
                self?.epoch += 1
                await self?.refresh()
            }
        }
        #endif
    }

    func refresh() async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-storeProbe") {
            do {
                let found = try await Product.products(for: Plan.all)
                print("storeProbe asked", Plan.all.sorted(), "got", found.map { "\($0.id) \($0.displayPrice) intro=\($0.subscription?.introductoryOffer?.period.debugDescription ?? "none")" }, "storefront", await Storefront.current?.countryCode ?? "nil")
            } catch {
                print("storeProbe error", error)
            }
        }
        #endif
        var current: [EntitlementRecord] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result { current.append(EntitlementRecord(t)) }
        }
        var history: [EntitlementRecord] = []
        for await result in Transaction.all {
            if case .verified(let t) = result { history.append(EntitlementRecord(t)) }
        }
        access = Entitlement.access(current, now: .now)
        trialEligible = Entitlement.trialEligible(history: history)
        if let product = try? await Product.products(for: Plan.all).first, let sub = product.subscription {
            trialEligible = await sub.isEligibleForIntroOffer
        }
    }

    func restore() async {
        try? await AppStore.sync()
        await refresh()
    }

    static func launchOverride() -> Access? {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-polingualOpen") || UserDefaults.standard.bool(forKey: "polingual.devPass") {
            return .subscribed(productID: Plan.yearly, until: nil)
        }
        #endif
        return nil
    }

    #if DEBUG
    func grantDevPass() {
        UserDefaults.standard.set(true, forKey: "polingual.devPass")
        access = .subscribed(productID: Plan.yearly, until: nil)
    }
    #endif
}
